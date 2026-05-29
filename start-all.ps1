param(
  [switch]$NoBrowser,
  [switch]$NoWait
)

$ErrorActionPreference = "Stop"
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
  $PSNativeCommandUseErrorActionPreference = $false
}

$Root = $PSScriptRoot
# Kiểm tra pnpm, cài đặt nếu chưa có
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "pnpm chưa được cài đặt, đang cài toàn cục..." -ForegroundColor Yellow
    npm i -g pnpm
}

$BackendDir = Join-Path $Root "backend"
$WebDir = Join-Path $Root "web"
$AdminDir = Join-Path $WebDir "apps\admin"
$PartnerDir = Join-Path $WebDir "apps\partner"
$LockPath = Join-Path $env:TEMP "nwh_running.lock"

$ChromeAdmin = Join-Path $env:TEMP "nwh_admin"
$ChromePartner = Join-Path $env:TEMP "nwh_partner"

function NowText {
  return (Get-Date -Format "HH:mm:ss")
}

function Format-Elapsed([TimeSpan]$Elapsed) {
  if ($Elapsed.TotalSeconds -lt 60) {
    return ("{0:N1}s" -f $Elapsed.TotalSeconds)
  }
  return ("{0:mm\:ss}" -f $Elapsed)
}

function Run-Step($Name, [scriptblock]$Action) {
  $timer = [System.Diagnostics.Stopwatch]::StartNew()
  Write-Host ("[{0}] >> {1}" -f (NowText), $Name) -ForegroundColor Cyan
  try {
    & $Action
    $timer.Stop()
    Write-Host ("[{0}] OK {1} ({2})" -f (NowText), $Name, (Format-Elapsed $timer.Elapsed)) -ForegroundColor Green
  } catch {
    $timer.Stop()
    Write-Host ("[{0}] FAIL {1} ({2})" -f (NowText), $Name, (Format-Elapsed $timer.Elapsed)) -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    throw
  }
}

function Quote-CmdArg([string]$Value) {
  if ($Value -match '[\s"&|<>^]') {
    return '"' + ($Value -replace '"', '\"') + '"'
  }
  return $Value
}

function Invoke-CommandChecked([string]$File, [string[]]$Arguments, [switch]$Quiet) {
  if ($Quiet) {
    $stdout = Join-Path $env:TEMP ("nwh-start-out-{0}.log" -f ([Guid]::NewGuid()))
    $stderr = Join-Path $env:TEMP ("nwh-start-err-{0}.log" -f ([Guid]::NewGuid()))
    try {
      $commandLine = (@($File) + $Arguments | ForEach-Object { Quote-CmdArg $_ }) -join " "
      $process = Start-Process -FilePath "cmd.exe" -ArgumentList @("/d", "/c", $commandLine) -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
      if ($process.ExitCode -ne 0) {
        $detailParts = @()
        $detail = ""
        if (Test-Path $stdout) { $detailParts += (Get-Content -LiteralPath $stdout -Raw -ErrorAction SilentlyContinue).Trim() }
        if (Test-Path $stderr) { $detail = (Get-Content -LiteralPath $stderr -Raw -ErrorAction SilentlyContinue).Trim() }
        if ($detail) { $detailParts += $detail }
        $detail = ($detailParts | Where-Object { $_ }) -join "`n"
        throw "$File $($Arguments -join ' ') failed with exit code $($process.ExitCode)`n$detail"
      }
      return
    } finally {
      Remove-Item -LiteralPath $stdout, $stderr -Force -ErrorAction SilentlyContinue
    }
  } else {
    & $File @Arguments
  }
  if ($LASTEXITCODE -ne 0) {
    throw "$File $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
}

function Get-LanIp {
  $ip = Get-NetIPConfiguration |
    Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address } |
    Select-Object -First 1 -ExpandProperty IPv4Address |
    Select-Object -First 1 -ExpandProperty IPAddress
  if (-not $ip) { return "127.0.0.1" }
  return $ip
}

function Stop-PortProcesses([int[]]$Ports) {
  $processIds = Get-NetTCPConnection -LocalPort $Ports -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processId in $processIds) {
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  }
}

function Stop-OldNwhProcesses {
  $escapedRoot = [Regex]::Escape($Root)
  $currentPid = $PID
  Get-CimInstance Win32_Process |
    Where-Object {
      $_.ProcessId -ne $currentPid -and
      $_.CommandLine -and
      $_.CommandLine -match $escapedRoot -and
      $_.CommandLine -match "pnpm|nest|vite|node --enable-source-maps|auto_export_loop"
    } |
    Select-Object -ExpandProperty ProcessId -Unique |
    ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
}

function Wait-Port([string]$HostName, [int]$Port, [int]$Seconds) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  do {
    $ok = Test-NetConnection -ComputerName $HostName -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($ok) { return }
    Start-Sleep -Milliseconds 500
  } while ((Get-Date) -lt $deadline)
  throw "${HostName}:${Port} is not ready after $Seconds seconds."
}

function Wait-Http([string]$Url, [int]$Seconds) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  do {
    try {
      $response = Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 2
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { return }
    } catch {}
    Start-Sleep -Milliseconds 750
  } while ((Get-Date) -lt $deadline)
  throw "$Url is not ready after $Seconds seconds."
}

function Start-ServiceWindow([string]$Title, [string]$Command) {
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "title $Title && cd /d `"$Root`" && $Command" | Out-Null
}

function Open-Chrome([string]$ProfileDir, [string]$Url) {
  try {
    Start-Process -FilePath "chrome" -ArgumentList "--user-data-dir=`"$ProfileDir`"", "--incognito", $Url | Out-Null
  } catch {
    Start-Process $Url | Out-Null
  }
}

function Test-DockerReady {
  $stdout = Join-Path $env:TEMP ("nwh-docker-info-out-{0}.log" -f ([Guid]::NewGuid()))
  $stderr = Join-Path $env:TEMP ("nwh-docker-info-err-{0}.log" -f ([Guid]::NewGuid()))
  try {
    $process = Start-Process -FilePath "docker" -ArgumentList @("info") -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    return $process.ExitCode -eq 0
  } catch {
    return $false
  } finally {
    Remove-Item -LiteralPath $stdout, $stderr -Force -ErrorAction SilentlyContinue
  }
}

function Start-DockerDesktopIfNeeded {
  $dockerDesktop = @(
    "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
    "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
    "$env:LocalAppData\Docker\Docker Desktop.exe"
  ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

  if (-not $dockerDesktop) {
    $dockerDesktop = Get-Command "Docker Desktop.exe" -ErrorAction SilentlyContinue |
      Select-Object -First 1 -ExpandProperty Source
  }

  if (-not $dockerDesktop) {
    throw "Khong tim thay Docker Desktop.exe. Hay mo Docker Desktop thu cong roi chay lai start-all.bat."
  }

  $alreadyStarting = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
  if (-not $alreadyStarting) {
    Write-Host ("[{0}] Docker Desktop chua chay, dang mo tu dong..." -f (NowText)) -ForegroundColor DarkYellow
    Start-Process -FilePath $dockerDesktop | Out-Null
  } else {
    Write-Host ("[{0}] Docker Desktop dang khoi dong, doi engine san sang..." -f (NowText)) -ForegroundColor DarkYellow
  }
}

try {
  $TotalTimer = [System.Diagnostics.Stopwatch]::StartNew()
  Set-Location $Root
  $Ip = Get-LanIp

  Write-Host ""
  Write-Host "========================================" -ForegroundColor DarkCyan
  Write-Host "        NWH - KHOI DONG HE THONG        " -ForegroundColor Cyan
  Write-Host "========================================" -ForegroundColor DarkCyan
  Write-Host ("Root: {0}" -f $Root) -ForegroundColor DarkGray
  Write-Host ("IP may tinh: {0}" -f $Ip) -ForegroundColor Gray
  Write-Host ""
  Write-Host "Web Admin       http://localhost:5173" -ForegroundColor White
  Write-Host "Web Partner     http://localhost:5174/login" -ForegroundColor White
  Write-Host ""

  Run-Step "Kiem tra cau truc folder" {
    $requiredFiles = @(
      (Join-Path $BackendDir "package.json"),
      (Join-Path $WebDir "package.json"),
      (Join-Path $AdminDir "package.json"),
      (Join-Path $PartnerDir "package.json"),
      (Join-Path $Root "database\snapshots\schema.sql"),
      (Join-Path $Root "database\snapshots\data.sql")
    )
    foreach ($file in $requiredFiles) {
      if (-not (Test-Path $file)) { throw "Khong tim thay: $file" }
    }
  }

  Run-Step "Dung process cu tren port 3001, 5173, 5174" {
    Stop-PortProcesses @(3001, 5173, 5174)
    Stop-OldNwhProcesses
    Remove-Item -LiteralPath $LockPath -Force -ErrorAction SilentlyContinue
  }

  Run-Step "Kiem tra Docker Desktop" {
    Invoke-CommandChecked "docker" @("--version") -Quiet
    if (-not (Test-DockerReady)) {
      Start-DockerDesktopIfNeeded

      $deadline = (Get-Date).AddSeconds(150)
      do {
        if (Test-DockerReady) { return }
        Start-Sleep -Seconds 3
      } while ((Get-Date) -lt $deadline)
      throw "Docker Desktop chua san sang sau 150 giay."
    }
  }

  Run-Step "Khoi dong PostgreSQL Docker" {
    $composeFile = Join-Path $BackendDir "docker-compose.yml"
    Invoke-CommandChecked "docker" @("compose", "-f", $composeFile, "up", "-d", "--quiet-pull", "postgres") -Quiet
  }

  Run-Step "Doi PostgreSQL san sang" {
    Wait-Port "127.0.0.1" 5432 60
  }

  Run-Step "Reset database va nap snapshot moi nhat" {
    $env:POSTGRES_SKIP_DOCKER_UP = "1"
    Invoke-CommandChecked "node" @((Join-Path $Root "database\baseline\import.mjs"))
  }
Run-Step "Cài đặt phụ thuộc backend" {
    Set-Location $BackendDir
    Invoke-CommandChecked "pnpm" @("install") -Quiet
    Set-Location $Root
}
Run-Step "Generate Prisma client" {
    Invoke-CommandChecked "pnpm" @("--filter","backend","exec","prisma","generate")
}
  if ($env:RUN_PRISMA_MIGRATE_ON_START -eq "1") {
    Run-Step "Chay Prisma migrate deploy" {
      Invoke-CommandChecked "pnpm" @("--filter", "backend", "exec", "prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma")
    }
  } else {
    Write-Host ("[{0}] SKIP Prisma migrate deploy (snapshot schema da duoc nap)" -f (NowText)) -ForegroundColor DarkYellow
  }

  Run-Step "Build backend mot lan truoc khi chay" {
    Invoke-CommandChecked "pnpm" @("--filter", "backend", "run", "build")
  }

  Run-Step "Mo 3 tien trinh backend/admin/partner" {
    Start-ServiceWindow "nwh-backend" "pnpm --filter backend start:prod"
    Start-ServiceWindow "nwh-admin" "pnpm --filter webadmin dev --host 127.0.0.1"
    Start-ServiceWindow "nwh-partner" "pnpm --filter webpartner dev --host 127.0.0.1"
  }

  Run-Step "Doi backend san sang" {
    Wait-Http "http://127.0.0.1:3001/api/healthz" 90
  }

  Run-Step "Doi web admin/partner san sang" {
    Wait-Http "http://127.0.0.1:5173" 60
    Wait-Http "http://127.0.0.1:5174/login" 60
  }

  if ($NoBrowser) {
    Write-Host ("[{0}] SKIP Mo trinh duyet" -f (NowText)) -ForegroundColor DarkYellow
  } else {
    Run-Step "Mo trinh duyet" {
      Open-Chrome $ChromeAdmin "http://localhost:5173"
      Open-Chrome $ChromePartner "http://localhost:5174/login"
    }
  }

  Run-Step "Bat dong bo snapshot tu dong" {
    Set-Content -LiteralPath $LockPath -Value "running"
    Start-ServiceWindow "nwh-db-sync" "powershell -NoProfile -ExecutionPolicy Bypass -File `"$Root\database\auto_export_loop.ps1`""
  }

  Write-Host ""
  Write-Host "========================================" -ForegroundColor DarkGreen
  Write-Host "  DA KHOI DONG XONG - stop-all.bat de dung" -ForegroundColor Green
  Write-Host ("  Tong thoi gian: {0}" -f (Format-Elapsed $TotalTimer.Elapsed)) -ForegroundColor Green
  Write-Host "========================================" -ForegroundColor DarkGreen
  Write-Host ""

  if (-not $NoWait) {
    while (Test-Path $LockPath) {
      Start-Sleep -Seconds 2
    }
  }
} catch {
  Write-Host ""
  Write-Host "[ERROR] Start-all that bai. Xem thong bao loi ben tren." -ForegroundColor Red
  Read-Host "Nhan Enter de thoat"
  exit 1
}
