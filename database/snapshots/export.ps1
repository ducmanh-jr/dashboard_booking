$ErrorActionPreference = "Stop"

$snapshotsDir = $PSScriptRoot
$root = Split-Path -Parent (Split-Path -Parent $snapshotsDir)
$envPath = Join-Path $root ".env"
$backendEnvPath = Join-Path $root "backend\.env"

$schemaOut = Join-Path $snapshotsDir "schema.sql"
$dataOut = Join-Path $snapshotsDir "data.sql"

if (Test-Path $envPath) {
  Get-Content $envPath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
    $key, $value = $line.Split("=", 2)
    [Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim(), "Process")
  }
}

if (Test-Path $backendEnvPath) {
  Get-Content $backendEnvPath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
    $key, $value = $line.Split("=", 2)
    [Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim(), "Process")
  }
}

$nodeExporter = Join-Path $snapshotsDir "export.mjs"

Write-Host "Exporting schema to $schemaOut"
Write-Host "Exporting data   to $dataOut"
node $nodeExporter
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host "Snapshot export completed." -ForegroundColor Green