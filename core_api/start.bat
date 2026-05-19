@echo off
title Nowayhome API Dev Server
color 0b
echo ===================================================
echo   KHOI DONG HE THONG API DEV SERVER...
echo   Giao dien Scalar: http://localhost:5299/scalar/v1
echo ===================================================
echo.
dotnet run --project core_api.csproj
if %errorlevel% neq 0 (
    echo.
    echo [LOI] Khong the khoi dong API Server. Vui long kiem tra code hoac moi truong!
    pause
)
