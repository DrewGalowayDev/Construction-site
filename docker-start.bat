@echo off
REM Docker Start Script for TopLine Marketplace (Windows)
REM This script helps you run the application locally with Docker

echo.
echo ========================================
echo   TopLine Marketplace - Docker Setup
echo ========================================
echo.

REM Check if .env file exists
if not exist .env (
    echo [WARNING] .env file not found!
    echo Creating .env from .env.example...
    copy .env.example .env
    echo.
    echo [SUCCESS] .env file created.
    echo Please edit .env with your credentials before continuing.
    echo.
    pause
)

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo [INFO] Building Docker containers...
docker-compose build

echo.
echo [INFO] Starting containers...
docker-compose up -d

echo.
echo [INFO] Waiting for database to be ready...
timeout /t 10 /nobreak >nul

echo.
echo ========================================
echo   Application Started Successfully!
echo ========================================
echo.
echo [ACCESS POINTS]
echo   - Frontend: http://localhost:3000
echo   - Admin: http://localhost:3000/dashboard/admin
echo.
echo [USEFUL COMMANDS]
echo   - View logs: docker-compose logs -f
echo   - Stop: docker-compose down
echo   - Restart: docker-compose restart
echo   - View containers: docker-compose ps
echo.
echo [CURRENT STATUS]
docker-compose ps

echo.
echo [TIP] Run 'docker-compose logs -f' to see application logs
echo.
pause
