@echo off
setlocal
title NWH - Stop All Services

echo ========================================
echo    NWH - DUNG HE THONG
echo ========================================

echo Dung backend va cac Vite server tren port 3001, 5173, 5174, 5175, 8081...
for /f "usebackq delims=" %%p in (`powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3001,5173,5174,5175,8081 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"`) do (
  taskkill /F /PID %%p /T >nul 2>&1
)

echo Dung cac process NWH cu con chay ngam...
for /f "usebackq delims=" %%p in (`powershell -NoProfile -Command "$root='%~dp0'; Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine -like ('*' + $root + '*') -and $_.CommandLine -match 'pnpm|nest|vite|node --enable-source-maps|expo' } | Select-Object -ExpandProperty ProcessId -Unique"`) do (
  taskkill /F /PID %%p /T >nul 2>&1
)

echo Dong cac cua so CMD cua NWH...
taskkill /F /FI "WINDOWTITLE eq nwh-backend*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq nwh-admin*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq nwh-partner*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq nwh-customer*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq nwh-mobile*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq nwh-db-sync*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq NWH - Start All Services*" /T >nul 2>&1

for /f "usebackq delims=" %%p in (`powershell -NoProfile -Command "$root='%~dp0'; Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine -like ('*' + $root + '*database*auto_export_loop.ps1*') } | Select-Object -ExpandProperty ProcessId -Unique"`) do (
  taskkill /F /PID %%p /T >nul 2>&1
)

if exist "%temp%\nwh_running.lock" del "%temp%\nwh_running.lock" >nul 2>&1

echo Dung PostgreSQL Docker neu Docker dang chay...
docker info >nul 2>&1
if not errorlevel 1 (
  docker compose -f "%~dp0backend\docker-compose.yml" stop postgres >nul 2>&1
)

echo Dong Chrome profile rieng cua NWH neu dang mo...
wmic process where "name='chrome.exe' and (commandline like '%%nwh_admin%%' or commandline like '%%nwh_partner%%')" call terminate >nul 2>&1

echo.
echo Da dung tat ca dich vu NWH.
powershell -NoProfile -Command "Start-Sleep -Seconds 2" >nul 2>&1
exit
