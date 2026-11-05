@echo off
chcp 65001 >nul
title JISIK public link (Cloudflare Tunnel)
cd /d "%~dp0"

rem 1) Start the local server in another window if it is not running yet
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if errorlevel 1 (
  echo Starting local server in a new window...
  start "JISIK server" cmd /c start.bat
  timeout /t 3 /nobreak >nul
)

rem 2) Find cloudflared
set "CF="
where cloudflared >nul 2>nul && set "CF=cloudflared"
if not defined CF if exist "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" set "CF=%ProgramFiles(x86)%\cloudflared\cloudflared.exe"
if not defined CF if exist "%ProgramFiles%\cloudflared\cloudflared.exe" set "CF=%ProgramFiles%\cloudflared\cloudflared.exe"
if not defined CF if exist "%~dp0cloudflared.exe" set "CF=%~dp0cloudflared.exe"

if not defined CF (
  echo cloudflared is not installed. Installing with winget...
  winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
  if exist "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" set "CF=%ProgramFiles(x86)%\cloudflared\cloudflared.exe"
  if exist "%ProgramFiles%\cloudflared\cloudflared.exe" set "CF=%ProgramFiles%\cloudflared\cloudflared.exe"
)

if not defined CF (
  echo.
  echo [ERROR] Could not find cloudflared. Close this window and run share.bat again,
  echo or download cloudflared-windows-amd64.exe from
  echo https://github.com/cloudflare/cloudflared/releases/latest
  echo rename it to cloudflared.exe and put it in this folder.
  pause
  exit /b 1
)

echo.
echo ================================================================
echo  Look for the line with  https://xxxx.trycloudflare.com  below.
echo  Share that link - anyone can open it while this window is open.
echo  Stop sharing: Ctrl + C or close this window.
echo ================================================================
echo.
"%CF%" tunnel --url http://localhost:3000
pause
