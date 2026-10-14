@echo off
REM MySQL Database Backup Script
REM TopLine Construction Database

set DATE=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set DATE=%DATE: =0%

echo Creating backup: construction_backup_%DATE%.sql
mysqldump -u root -pHackifyoucan254 construction > "backups\construction_backup_%DATE%.sql"

if %errorlevel% equ 0 (
    echo ✓ Backup successful: backups\construction_backup_%DATE%.sql
) else (
    echo ✗ Backup failed!
)

pause
