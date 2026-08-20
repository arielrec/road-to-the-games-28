@echo off
REM Regenerate the app's data from the spreadsheet and report what changed.
REM This does NOT publish anything — use publish.bat for that.
cd /d "%~dp0"
python tools\update.py
pause
