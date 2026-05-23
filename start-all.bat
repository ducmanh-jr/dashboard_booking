@echo off
setlocal
title NWH - Start All Services

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-all.ps1"
exit /b %errorlevel%
