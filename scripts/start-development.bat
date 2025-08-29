@echo off
REM ICRS SPARC Development Startup Script
REM Starts both backend API and frontend React application concurrently

echo ========================================
echo  Starting ICRS SPARC Development Environment
echo ========================================
echo.

REM Check if environment files exist
if not exist ".env" (
    echo ERROR: Backend .env file not found
    echo Please run setup-dev-environment.bat first or copy .env.example to .env
    echo and configure your environment variables.
    pause
    exit /b 1
)

if not exist "src\frontend\.env" (
    echo WARNING: Frontend .env file not found
    echo Using default configuration. For custom settings, copy src\frontend\.env.example to src\frontend\.env
    echo.
)

REM Check if node_modules exist
if not exist "node_modules" (
    echo ERROR: Backend dependencies not installed
    echo Please run 'npm install' or setup-dev-environment.bat first
    pause
    exit /b 1
)

if not exist "src\frontend\node_modules" (
    echo ERROR: Frontend dependencies not installed
    echo Please run 'npm run frontend:install' or setup-dev-environment.bat first
    pause
    exit /b 1
)

echo Pre-flight checks: PASSED
echo.

REM Load environment variables and start servers
echo Starting development servers...
echo Backend API will be available at: http://localhost:5000
echo Frontend App will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop both servers
echo.

REM Start both backend and frontend concurrently
npm run dev:full