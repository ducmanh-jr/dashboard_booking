$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$envPath = Join-Path $root ".env"
$sqlPath = Join-Path $PSScriptRoot "3.8.sql"

if (-not (Test-Path $sqlPath)) {
  throw "Cannot find SQL baseline: $sqlPath"
}

if (Test-Path $envPath) {
  Get-Content $envPath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
    $key, $value = $line.Split("=", 2)
    [Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim(), "Process")
  }
}

$dbHost = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$dbPort = if ($env:DB_PORT) { $env:DB_PORT } else { "3306" }
$dbUser = if ($env:DB_USER) { $env:DB_USER } else { "root" }
$dbPassword = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "" }

Write-Host "This will reset the database defined inside database/baseline/3.8.sql." -ForegroundColor Yellow
Write-Host "SQL file: $sqlPath"
$confirm = Read-Host "Type RESET to continue"
if ($confirm -ne "RESET") {
  Write-Host "Cancelled."
  exit 1
}

$mysqlArgs = @("-h", $dbHost, "-P", $dbPort, "-u", $dbUser, "--default-character-set=utf8mb4")
if ($dbPassword) {
  $mysqlArgs += "-p$dbPassword"
}

Get-Content $sqlPath -Raw | mysql @mysqlArgs
Write-Host "Imported database/baseline/3.8.sql successfully." -ForegroundColor Green
