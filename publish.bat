@echo off
REM Double-click after replacing the spreadsheet in the data folder.
REM Shows what changed, asks before publishing, then pushes. GitHub rebuilds the
REM site by itself — nothing to upload.
cd /d "%~dp0"
python tools\publish.py
pause
