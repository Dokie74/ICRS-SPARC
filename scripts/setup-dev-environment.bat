@echo off
REM ICRS SPARC Development Environment Setup Script
REM This script sets up the complete development environment for ICRS SPARC

echo ========================================
echo  ICRS SPARC Development Environment Setup
echo ========================================
echo.

REM Check if Node.js is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js version 18 or higher from https://nodejs.org
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1 delims=." %%a in ('node --version') do set NODE_MAJOR=%%a
set NODE_MAJOR=%NODE_MAJOR:v=%
if %NODE_MAJOR% LSS 18 (
    echo ERROR: Node.js version 18 or higher is required
    echo Current version: 
    node --version
    pause
    exit /b 1
)

echo Node.js version check: PASSED
echo.

REM Check if npm is available
echo Checking npm installation...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not available
    pause
    exit /b 1
)

echo npm version check: PASSED
echo.

REM Install backend dependencies
echo Installing backend dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)

echo Backend dependencies: INSTALLED
echo.

REM Install frontend dependencies
echo Installing frontend dependencies...
cd src\frontend
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install frontend dependencies
    cd ..\..
    pause
    exit /b 1
)

cd ..\..
echo Frontend dependencies: INSTALLED
echo.

REM Check for environment files
echo Checking environment configuration...
if not exist ".env" (
    echo WARNING: .env file not found
    echo Please copy .env.example to .env and configure your environment variables
    echo Backend environment variables needed in root .env:
    echo   - SUPABASE_URL
    echo   - SUPABASE_ANON_KEY
    echo   - SUPABASE_SERVICE_KEY
    echo   - PORT (optional, defaults to 5000)
    echo.
)

if not exist "src\frontend\.env" (
    echo WARNING: Frontend .env file not found
    echo Please copy src\frontend\.env.example to src\frontend\.env
    echo Frontend environment variables needed:
    echo   - REACT_APP_API_URL
    echo   - REACT_APP_SUPABASE_URL
    echo   - REACT_APP_SUPABASE_ANON_KEY
    echo.
)

REM Create necessary directories
echo Creating necessary directories...
if not exist "tests\backend" mkdir tests\backend
if not exist "tests\frontend" mkdir tests\frontend
if not exist "tests\e2e" mkdir tests\e2e
if not exist "docs\security" mkdir docs\security

echo Directory structure: CREATED
echo.

REM Run basic health checks
echo Running basic health checks...

REM Test Node.js environment
echo Testing Node.js environment...
node -e "console.log('Node.js environment: OK')"
if errorlevel 1 (
    echo ERROR: Node.js environment test failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Configure environment variables in .env files
echo 2. Set up Supabase project and get your keys
echo 3. Run 'npm run dev:full' to start both backend and frontend
echo 4. Visit http://localhost:3000 for the application
echo 5. Visit http://localhost:5000/health for API health check
echo.
echo For more information, see the documentation in /docs/
echo.

pause