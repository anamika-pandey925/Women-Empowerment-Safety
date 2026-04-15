@echo off
echo Attempting to add firewall rule for Port 3000...
netsh advfirewall firewall add rule name="Allow Site Port 3000" dir=in action=allow protocol=TCP localport=3000
if %errorlevel% equ 0 (
    echo.
    echo SUCCESS! Firewall rule added.
    echo Your mobile should now be able to connect.
) else (
    echo.
    echo ERROR: Please run this file as ADMINISTRATOR.
    echo Right-click -> Run as administrator
)
pause
