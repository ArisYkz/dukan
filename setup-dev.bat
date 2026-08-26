@echo off
echo ========================================
echo  Duken - Lightweight Development Setup
echo ========================================
echo.
echo This script installs dependencies WITHOUT Supabase CLI binary.
echo Perfect for testing frontend optimizations locally.
echo.

echo [1/3] Cleaning previous installation...
if exist node_modules (
    echo Removing node_modules...
    rmdir /s /q node_modules
)
if exist package-lock.json (
    echo Removing package-lock.json...
    del /q package-lock.json
)

echo.
echo [2/3] Installing dependencies (skipping Supabase CLI)...
echo This should take 1-2 minutes instead of 10+ minutes.
echo.
npm install --no-optional --ignore-scripts

echo.
echo [3/3] Verifying installation...
if exist node_modules\vite (
    echo ✓ Core dependencies installed successfully!
) else (
    echo ✗ Installation failed. Please check errors above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  ✓ Setup Complete!
echo ========================================
echo.
echo To start the development server:
echo   npm run dev
echo.
echo The app will be available at:
echo   http://localhost:8080
echo.
echo Note: Supabase CLI is not installed.
echo This is fine for frontend development and testing.
echo If you need Supabase CLI later, run:
echo   npm install --force
echo.
pause
