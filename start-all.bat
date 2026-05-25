@echo off
setlocal
title NWH - Start All Services

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-all.ps1"
exit /b %errorlevel%
