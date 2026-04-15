@echo off
cd /d "%~dp0"
echo Building project for production...
call npm run build
if %errorlevel% equ 0 (
    echo.
    echo BUILD SUCCESS!
    if exist "UPLOAD_TO_NETLIFY" rmdir /s /q "UPLOAD_TO_NETLIFY"
    ren dist "UPLOAD_TO_NETLIFY"
    echo.
    echo -------------------------------------------------------
    echo A folder named 'UPLOAD_TO_NETLIFY' has been created.
    echo DRAG THAT FOLDER to Netlify.
    echo -------------------------------------------------------
    explorer .
) else (
    echo Build failed.
)
pause
