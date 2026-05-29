$ErrorActionPreference = "Stop"

$snapshotsDir = $PSScriptRoot
$databaseDir = Split-Path -Parent $snapshotsDir
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
    [Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim().Trim('"'), "Process")
  }
}

$nodeExporter = Join-Path $snapshotsDir "export.mjs"

Write-Host "Exporting PostgreSQL snapshot from DATABASE_URL..."
node $nodeExporter
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host "Snapshot export completed." -ForegroundColor Green
