# Deploy Localhost Updates to VPS
# Script untuk deploy perubahan dari localhost ke VPS production

$VPS_HOST = "31.97.51.129"
$VPS_USER = "root"
$VPS_PATH = "/var/www/thelodgefamily"
$LOCAL_PATH = "C:\xampp\htdocs\newthelodgefamily"

Write-Host "🚀 Starting deployment of localhost updates to VPS..." -ForegroundColor Cyan
Write-Host "📍 Target: ${VPS_USER}@${VPS_HOST}:${VPS_PATH}" -ForegroundColor Yellow
Write-Host ""

# 1. Create backup on VPS first
Write-Host "💾 Creating backup on VPS..." -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH} && ./backup-lodge-family.sh"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup created successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️ Backup failed, but continuing..." -ForegroundColor Yellow
}

# 2. Deploy updated frontend files (my-ticket page)
Write-Host "📤 Uploading updated frontend files..." -ForegroundColor Yellow
scp "${LOCAL_PATH}\frontend\src\app\(dashboard)\my-ticket\page.tsx" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/frontend/src/app/(dashboard)/my-ticket/"

# 3. Deploy any updated backend files
Write-Host "📤 Uploading backend files..." -ForegroundColor Yellow
scp "${LOCAL_PATH}\backend\src\routes\admin.ts" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/src/routes/"
scp "${LOCAL_PATH}\backend\src\routes\auth.ts" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/src/routes/"

# 4. Deploy database schema if changed
Write-Host "📤 Uploading database schema..." -ForegroundColor Yellow
scp "${LOCAL_PATH}\backend\prisma\schema.prisma" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/prisma/"

# 5. Deploy package.json files if dependencies changed
Write-Host "📤 Uploading package.json files..." -ForegroundColor Yellow
scp "${LOCAL_PATH}\backend\package.json" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/"
scp "${LOCAL_PATH}\frontend\package.json" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/frontend/"

# 6. Run deployment commands on VPS
Write-Host "🔧 Running deployment commands on VPS..." -ForegroundColor Yellow

# Install dependencies (if package.json changed)
Write-Host "  📦 Installing backend dependencies..." -ForegroundColor Gray
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH}/backend && npm install"

Write-Host "  📦 Installing frontend dependencies..." -ForegroundColor Gray
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH}/frontend && npm install"

# Update database schema
Write-Host "  🗄️ Updating database..." -ForegroundColor Gray
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH}/backend && npx prisma generate"
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH}/backend && npx prisma db push"

# Build frontend
Write-Host "  🏗️ Building frontend..." -ForegroundColor Gray
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH}/frontend && npm run build"

# 7. Restart services
Write-Host "🔄 Restarting services..." -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_HOST}" "pm2 restart thelodgefamily-backend"
ssh "${VPS_USER}@${VPS_HOST}" "pm2 restart thelodgefamily-frontend"

# 8. Verify deployment
Write-Host "🔍 Verifying deployment..." -ForegroundColor Yellow

# Check if services are running
Write-Host "  📊 Checking PM2 status..." -ForegroundColor Gray
ssh "${VPS_USER}@${VPS_HOST}" "pm2 status"

# Test website accessibility
Write-Host "  🌐 Testing website..." -ForegroundColor Gray
$response = try {
    Invoke-WebRequest -Uri "https://family.thelodgegroup.id" -Method GET -TimeoutSec 10
    $response.StatusCode
} catch {
    "Failed"
}

if ($response -eq 200) {
    Write-Host "✅ Website is accessible (Status: $response)" -ForegroundColor Green
} else {
    Write-Host "❌ Website test failed (Status: $response)" -ForegroundColor Red
}

# Test API
Write-Host "  🔌 Testing API..." -ForegroundColor Gray
$apiResponse = try {
    Invoke-WebRequest -Uri "https://family.thelodgegroup.id/api/health" -Method GET -TimeoutSec 10
    $apiResponse.StatusCode
} catch {
    "Failed"
}

if ($apiResponse -eq 200) {
    Write-Host "✅ API is accessible (Status: $apiResponse)" -ForegroundColor Green
} else {
    Write-Host "❌ API test failed (Status: $apiResponse)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Deployment completed!" -ForegroundColor Green
Write-Host "🌐 Check your application at: https://family.thelodgegroup.id" -ForegroundColor Cyan
Write-Host ""

# Show final status
if ($response -eq 200 -and $apiResponse -eq 200) {
    Write-Host "🎉 DEPLOYMENT SUCCESSFUL! All services are running properly." -ForegroundColor Green
} else {
    Write-Host "⚠️ DEPLOYMENT COMPLETED WITH WARNINGS. Please check the services manually." -ForegroundColor Yellow
    Write-Host "   You can check logs with: ssh ${VPS_USER}@${VPS_HOST} 'pm2 logs'" -ForegroundColor Gray
}