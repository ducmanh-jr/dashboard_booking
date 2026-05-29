$ErrorActionPreference = "Stop"

$baselineDir = $PSScriptRoot
$databaseDir = Split-Path -Parent $baselineDir
$root = Split-Path -Parent $databaseDir
$schemaPath = Join-Path $databaseDir "snapshots\schema.sql"
$dataPath = Join-Path $databaseDir "snapshots\data.sql"

if (-not (Test-Path $schemaPath)) {
  throw "Cannot find schema snapshot: $schemaPath"
}

if (-not (Test-Path $dataPath)) {
  throw "Cannot find data snapshot: $dataPath"
}

Write-Host "This will DROP all objects in PostgreSQL schema public and reload:" -ForegroundColor Yellow
Write-Host "  $schemaPath"
Write-Host "  $dataPath"
Write-Host ""
$confirm = Read-Host "Type RESET to continue"
if ($confirm -ne "RESET") {
  Write-Host "Cancelled."
  exit 1
}

node (Join-Path $baselineDir "import.mjs")
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host "Imported PostgreSQL snapshots successfully." -ForegroundColor Green
