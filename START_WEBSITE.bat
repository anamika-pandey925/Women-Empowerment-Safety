@echo off
cd /d "%~dp0"
echo ========================================================
echo Starting Suraksha Website...
echo Please wait while we launch the server and browser.
echo ========================================================

:: Check if node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed. Please install Node.js to run this website.
    pause
    exit /b
)

:: Install dependencies if node_modules is missing
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

:: Start the server
echo Starting server on port 3000...
echo The website will open automatically in your browser.
call npm run dev
pause
