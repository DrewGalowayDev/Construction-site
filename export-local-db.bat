@echo off
REM Export Local Database Script
echo ========================================
echo   Export Local Database to SQL File
echo ========================================
echo.

REM Check if database name exists
set DB_NAME=topline
echo [INFO] Database name: %DB_NAME%
echo.

REM Ask for MySQL password
set /p MYSQL_PASS="Enter your local MySQL root password: "

echo.
echo [INFO] Exporting database...
mysqldump -u root -p%MYSQL_PASS% %DB_NAME% > topline_export.sql 2>error.log

if errorlevel 1 (
    echo [ERROR] Export failed! Check error.log for details.
    echo.
    echo Common issues:
    echo - Wrong password
    echo - Database '%DB_NAME%' doesn't exist
    echo - MySQL not in PATH
    type error.log
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Database exported to: topline_export.sql
echo.

REM Get file size
for %%A in (topline_export.sql) do set FILE_SIZE=%%~zA
echo File size: %FILE_SIZE% bytes
echo.

echo [NEXT STEPS]
echo 1. Upload file to server:
echo    scp topline_export.sql root@169.58.244.109:/root/
echo.
echo 2. Or use WinSCP/FileZilla to upload the file
echo.
pause
