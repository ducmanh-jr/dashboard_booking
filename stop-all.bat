@echo off
setlocal
title NWH - Stop All Services

echo ========================================
echo    NWH - DUNG HE THONG
echo ========================================

echo Dung backend va cac Vite server tren port 3001, 5173, 5174, 5175...
for /f "usebackq delims=" %%p in (`powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3001,5173,5174,5175 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"`) do (
  taskkill /F /PID %%p /T >nul 2>&1
)

echo Dong cac cua so CMD cua NWH...
taskkill /F /FI "WINDOWTITLE eq nwh-backend*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq nwh-admin*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq nwh-partner*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq nwh-customer*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq NWH - Start All Services*" /T >nul 2>&1

if exist "%temp%\nwh_running.lock" del "%temp%\nwh_running.lock" >nul 2>&1

echo Dong Chrome profile rieng cua NWH neu dang mo...
wmic process where "name='chrome.exe' and (commandline like '%%nwh_admin%%' or commandline like '%%nwh_partner%%' or commandline like '%%nwh_customer%%')" call terminate >nul 2>&1

echo.
echo Da dung tat ca dich vu NWH.
powershell -NoProfile -Command "Start-Sleep -Seconds 2" >nul 2>&1
exit
