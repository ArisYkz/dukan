# Dokan - Lightweight Development Setup (PowerShell)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Dokan - Lightweight Development Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script installs dependencies WITHOUT Supabase CLI binary." -ForegroundColor Yellow
Write-Host "Perfect for testing frontend optimizations locally." -ForegroundColor Yellow
Write-Host ""

# Step 1: Clean previous installation
Write-Host "[1/3] Cleaning previous installation..." -ForegroundColor Green
if (Test-Path "node_modules") {
    Write-Host "Removing node_modules..." -ForegroundColor Gray
    Remove-Item -Recurse -Force "node_modules"
}
if (Test-Path "package-lock.json") {
    Write-Host "Removing package-lock.json..." -ForegroundColor Gray
    Remove-Item -Force "package-lock.json"
}

# Step 2: Install dependencies
Write-Host ""
Write-Host "[2/3] Installing dependencies (skipping Supabase CLI)..." -ForegroundColor Green
Write-Host "This should take 1-2 minutes instead of 10+ minutes." -ForegroundColor Yellow
Write-Host ""
npm install --no-optional --ignore-scripts

# Step 3: Verify installation
Write-Host ""
Write-Host "[3/3] Verifying installation..." -ForegroundColor Green
if (Test-Path "node_modules\vite") {
    Write-Host "✓ Core dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Installation failed. Please check errors above." -ForegroundColor Red
    pause
    exit 1
}

# Complete
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " ✓ Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the development server:" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "The app will be available at:" -ForegroundColor Yellow
Write-Host "  http://localhost:8080" -ForegroundColor White
Write-Host ""
Write-Host "Note: Supabase CLI is not installed." -ForegroundColor Yellow
Write-Host "This is fine for frontend development and testing." -ForegroundColor Yellow
Write-Host "If you need Supabase CLI later, run:" -ForegroundColor Yellow
Write-Host "  npm install --force" -ForegroundColor White
Write-Host ""
pause
