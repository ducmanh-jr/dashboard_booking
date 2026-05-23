$ErrorActionPreference = "Continue"

$databaseDir = $PSScriptRoot
$root = Split-Path -Parent $databaseDir
$envFiles = @(
  (Join-Path $databaseDir ".env"),
  (Join-Path $root ".env"),
  (Join-Path $root "backend\.env")
)

foreach ($envPath in $envFiles) {
  if (-not (Test-Path $envPath)) { continue }
  Get-Content $envPath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
    $key, $value = $line.Split("=", 2)
    if (-not [Environment]::GetEnvironmentVariable($key.Trim(), "Process")) {
      [Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim().Trim('"'), "Process")
    }
  }
}

$interval = 60
if ($env:DATA_SYNC_INTERVAL_SECONDS) {
  $parsed = 0
  if ([int]::TryParse($env:DATA_SYNC_INTERVAL_SECONDS, [ref]$parsed) -and $parsed -ge 10) {
    $interval = $parsed
  }
}

$lockPath = Join-Path $env:TEMP "nwh_running.lock"
$exportScript = Join-Path $databaseDir "snapshots\export.ps1"

Write-Host "NWH database auto export is running. Interval: $interval seconds."
Write-Host "Target files: database\snapshots\schema.sql and database\snapshots\data.sql"

while (Test-Path $lockPath) {
  try {
    powershell -NoProfile -ExecutionPolicy Bypass -File $exportScript
  } catch {
    Write-Host "[WARN] Database auto export failed: $($_.Exception.Message)" -ForegroundColor Yellow
  }
  Start-Sleep -Seconds $interval
}

Write-Host "NWH database auto export stopped."
