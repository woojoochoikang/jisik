@echo off
chcp 65001 >nul
title JISIK server
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel%==0 (
  node server.js
  goto :end
)

where python >nul 2>nul
if %errorlevel%==0 (
  echo Node.js not found. Starting with Python instead...
  echo Open http://localhost:3000
  python -m http.server 3000 --bind 0.0.0.0 --directory public
  goto :end
)

echo [ERROR] Node.js (or Python) is required.
echo Install Node.js LTS from https://nodejs.org and run start.bat again.

:end
pause
