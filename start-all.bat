@echo off
setlocal
title NWH - Start All Services

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "WEB_DIR=%ROOT%web"
set "ADMIN_DIR=%WEB_DIR%\apps\admin"
set "PARTNER_DIR=%WEB_DIR%\apps\partner"
set "CUSTOMER_DIR=%WEB_DIR%\apps\customer"
set "CHROME_ADMIN=%temp%\nwh_admin"
set "CHROME_PARTNER=%temp%\nwh_partner"
set "CHROME_CUSTOMER=%temp%\nwh_customer"

for /f "usebackq delims=" %%a in (`powershell -NoProfile -Command "$ip=(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address } | Select-Object -First 1 -ExpandProperty IPv4Address).IPAddress; if(!$ip){$ip='127.0.0.1'}; $ip"`) do set "IP=%%a"

echo ========================================
echo    NWH - KHOI DONG HE THONG
echo ========================================
echo IP may tinh cua ban: %IP%
echo.
echo Link Web Admin      : http://localhost:5173
echo Link Web Partner    : http://localhost:5174/login
echo Link Web Khach Hang : http://localhost:5175
echo Link Mobile Customer: http://%IP%:5175
echo.

if not exist "%BACKEND_DIR%\package.json" (
  echo [ERROR] Khong tim thay backend tai "%BACKEND_DIR%"
  pause
  exit /b 1
)

if not exist "%WEB_DIR%\package.json" (
  echo [ERROR] Khong tim thay web tai "%WEB_DIR%"
  pause
  exit /b 1
)

if not exist "%ADMIN_DIR%\package.json" (
  echo [ERROR] Khong tim thay web admin tai "%ADMIN_DIR%"
  pause
  exit /b 1
)

if not exist "%PARTNER_DIR%\package.json" (
  echo [ERROR] Khong tim thay web partner tai "%PARTNER_DIR%"
  pause
  exit /b 1
)

if not exist "%CUSTOMER_DIR%\package.json" (
  echo [ERROR] Khong tim thay web customer tai "%CUSTOMER_DIR%"
  pause
  exit /b 1
)

echo Dung cac process cu tren port 3001, 5173, 5174, 5175 neu co...
for /f "usebackq delims=" %%p in (`powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3001,5173,5174,5175 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"`) do (
  taskkill /F /PID %%p /T >nul 2>&1
)

echo.
echo Dang khoi dong backend va 3 web app (su dung pnpm)...
start "nwh-backend" cmd /k "pnpm --filter backend dev"
start "nwh-admin" cmd /k "pnpm --filter webadmin dev -- --host 127.0.0.1"
start "nwh-partner" cmd /k "pnpm --filter webpartner dev -- --host 127.0.0.1"
start "nwh-customer" cmd /k "pnpm --filter webcustomer dev -- --host 0.0.0.0"

echo.
echo Dang doi server khoi dong de mo trinh duyet...
powershell -NoProfile -Command "Start-Sleep -Seconds 7" >nul 2>&1

start "" chrome --user-data-dir="%CHROME_ADMIN%" --incognito "http://localhost:5173"
start "" chrome --user-data-dir="%CHROME_PARTNER%" --incognito "http://localhost:5174/login"
start "" chrome --user-data-dir="%CHROME_CUSTOMER%" --incognito "http://%IP%:5175"

echo running > "%temp%\nwh_running.lock"

echo.
echo Da khoi dong xong. Chay stop-all.bat de dung he thong.

:waitloop
powershell -NoProfile -Command "Start-Sleep -Seconds 2" >nul 2>&1
if exist "%temp%\nwh_running.lock" goto waitloop

exit
