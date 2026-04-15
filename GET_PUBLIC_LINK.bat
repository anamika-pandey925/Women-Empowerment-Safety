@echo off
echo ========================================================
echo Generating Public Link...
echo This will create a temporary link to share your website.
echo ========================================================
echo.
echo Please wait while we generate the link...
call npx -y localtunnel --port 3000
pause
