@echo off
REM SPARC Development Environment Setup Script for Windows
REM This script sets up the local development environment using Docker

setlocal enabledelayedexpansion

echo.
echo ==================================================
echo 🚀 Setting up SPARC Development Environment...
echo ==================================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Docker is not installed or not in PATH.
    echo Please install Docker Desktop first.
    pause
    exit /b 1
)

REM Check if Docker Compose is available
docker compose version >nul 2>&1
if errorlevel 1 (
    docker-compose --version >nul 2>&1
    if errorlevel 1 (
        echo ❌ Error: Docker Compose is not available.
        echo Please ensure Docker Desktop is properly installed.
        pause
        exit /b 1
    )
    set COMPOSE_CMD=docker-compose
) else (
    set COMPOSE_CMD=docker compose
)

echo ✅ Docker and Docker Compose are available

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  Warning: No .env file found.
    if exist ".env.example" (
        echo Creating .env file from .env.example...
        copy ".env.example" ".env" >nul
        echo ✅ Created .env file from .env.example
        echo ⚠️  Please update .env file with your Supabase credentials before continuing
        echo.
        echo Press any key when you have updated the .env file...
        pause >nul
    ) else (
        echo ❌ Error: .env.example file not found.
        echo Please create a .env file manually with required environment variables.
        pause
        exit /b 1
    )
)

echo ✅ Environment configuration found

REM Create necessary directories
echo 📁 Creating required directories...
mkdir logs 2>nul
mkdir config\ssl 2>nul
mkdir data\redis 2>nul
echo ✅ Directories created

REM Stop any existing containers
echo 🛑 Stopping existing containers...
%COMPOSE_CMD% -f scripts/dev/docker-compose.yml down --remove-orphans >nul 2>&1
echo ✅ Existing containers stopped

REM Pull latest images
echo 📥 Pulling latest Docker images...
%COMPOSE_CMD% -f scripts/dev/docker-compose.yml pull
if errorlevel 1 (
    echo ❌ Error: Failed to pull Docker images
    pause
    exit /b 1
)
echo ✅ Images pulled successfully

REM Build and start services
echo 🔨 Building and starting services...
%COMPOSE_CMD% -f scripts/dev/docker-compose.yml up --build -d
if errorlevel 1 (
    echo ❌ Error: Failed to start services
    echo Checking logs...
    %COMPOSE_CMD% -f scripts/dev/docker-compose.yml logs
    pause
    exit /b 1
)
echo ✅ Services started successfully

REM Wait for services to start
echo ⏳ Waiting for services to initialize...
timeout /t 15 /nobreak >nul

echo.
echo 📊 Checking service status...
echo ================================

REM Check backend health
curl -s -f http://localhost:5000/api/health >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Backend API: Starting... (http://localhost:5000)
) else (
    echo ✅ Backend API: Running (http://localhost:5000)
)

REM Check frontend
curl -s -f http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Frontend: Starting... (http://localhost:3000)
) else (
    echo ✅ Frontend: Running (http://localhost:3000)
)

REM Check Nginx proxy
curl -s -f http://localhost >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Nginx Proxy: Starting... (http://localhost)
) else (
    echo ✅ Nginx Proxy: Running (http://localhost)
)

echo.
echo 🎉 Development environment setup complete!
echo.
echo 📝 Next Steps:
echo    1. Ensure .env file has your Supabase credentials
echo    2. Access the application at: http://localhost
echo    3. Backend API available at: http://localhost:5000
echo    4. Frontend dev server at: http://localhost:3000
echo.
echo 🔧 Useful Commands:
echo    View logs: %COMPOSE_CMD% -f scripts/dev/docker-compose.yml logs -f
echo    Stop services: %COMPOSE_CMD% -f scripts/dev/docker-compose.yml down
echo    Restart services: %COMPOSE_CMD% -f scripts/dev/docker-compose.yml restart
echo    Shell into backend: docker exec -it sparc-backend-dev sh
echo    Shell into frontend: docker exec -it sparc-frontend-dev sh
echo.

if "%1" neq "--no-pause" (
    pause
)

endlocal