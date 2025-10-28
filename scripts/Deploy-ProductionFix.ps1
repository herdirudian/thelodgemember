# Production Deployment Fix Script for Windows
# This script fixes common deployment issues when moving from localhost to VPS

Write-Host "🚀 Starting production deployment fix..." -ForegroundColor Green

# 1. Navigate to project directory
$ProjectPath = "C:\xampp\htdocs\newthelodgefamily"
Set-Location $ProjectPath

# 2. Stop existing processes (if running locally)
Write-Host "📦 Stopping existing processes..." -ForegroundColor Yellow
try {
    # Stop any running npm processes
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "✅ Stopped existing Node.js processes" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ No existing Node.js processes to stop" -ForegroundColor Blue
}

# 3. Copy environment files
Write-Host "🔧 Setting up environment files..." -ForegroundColor Yellow

# Copy backend environment
Copy-Item "backend\.env.vps" "backend\.env" -Force
Write-Host "✅ Backend environment configured" -ForegroundColor Green

# Copy frontend environment
Copy-Item "frontend\.env.production" "frontend\.env.local" -Force
Write-Host "✅ Frontend environment configured" -ForegroundColor Green

# 4. Install backend dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location "backend"
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}

# 5. Install frontend dependencies and build
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location "..\frontend"
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}

# 6. Build frontend
Write-Host "🏗️ Building frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend built successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to build frontend" -ForegroundColor Red
    exit 1
}

# 7. Run database operations
Write-Host "🗄️ Running database operations..." -ForegroundColor Yellow
Set-Location "..\backend"
npx prisma generate
npx prisma db push
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database operations completed" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to run database operations" -ForegroundColor Red
    exit 1
}

# 8. Create deployment package
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow
Set-Location ".."
$DeploymentDate = Get-Date -Format "yyyyMMdd_HHmmss"
$PackageName = "deployment-fix-$DeploymentDate.tar.gz"

# Create tar.gz package (requires tar command available in Windows 10+)
try {
    tar -czf $PackageName --exclude=node_modules --exclude=.git --exclude=*.log backend frontend ecosystem.config.js nginx-family-domain-fixed.conf
    Write-Host "✅ Deployment package created: $PackageName" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Could not create tar.gz package. Please manually copy files to VPS." -ForegroundColor Yellow
}

Write-Host "🎉 Local preparation completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps for VPS deployment:" -ForegroundColor Cyan
Write-Host "1. Upload the deployment package to your VPS" -ForegroundColor White
Write-Host "2. Extract the package in /var/www/thelodgefamily/current/" -ForegroundColor White
Write-Host "3. Run the deploy-production-fix.sh script on the VPS" -ForegroundColor White
Write-Host "4. Check PM2 status: pm2 status" -ForegroundColor White
Write-Host "5. Check logs: pm2 logs" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Test the application at: https://family.thelodgegroup.id" -ForegroundColor Green