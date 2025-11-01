# Deploy Latest Updates to VPS
# Script untuk deploy fitur-fitur baru ke VPS

$VPS_HOST = "103.127.99.7"
$VPS_USER = "root"
$VPS_PATH = "/var/www/thelodgefamily"
$LOCAL_PATH = "C:\xampp\htdocs\newthelodgefamily"

Write-Host "🚀 Starting deployment of latest updates to VPS..." -ForegroundColor Cyan

# 1. Deploy new backend route files
Write-Host "📤 Uploading new backend route files..." -ForegroundColor Yellow
scp "$LOCAL_PATH\backend\src\routes\notifications.ts" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/src/routes/"
scp "$LOCAL_PATH\backend\src\routes\booking.ts" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/src/routes/"
scp "$LOCAL_PATH\backend\src\routes\webhook.ts" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/src/routes/"

# 2. Deploy updated backend files
Write-Host "📤 Uploading updated backend files..." -ForegroundColor Yellow
scp "$LOCAL_PATH\backend\src\routes\admin.ts" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/src/routes/"
scp "$LOCAL_PATH\backend\src\routes\member.ts" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/src/routes/"
scp "$LOCAL_PATH\backend\src\index.ts" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/src/"

# 3. Deploy database schema
Write-Host "📤 Uploading database schema..." -ForegroundColor Yellow
scp "$LOCAL_PATH\backend\prisma\schema.prisma" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/prisma/"

# 4. Deploy package.json files
Write-Host "📤 Uploading package.json files..." -ForegroundColor Yellow
scp "$LOCAL_PATH\backend\package.json" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/"
scp "$LOCAL_PATH\frontend\package.json" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/frontend/"

# 5. Deploy new frontend pages
Write-Host "📤 Uploading new frontend pages..." -ForegroundColor Yellow
scp -r "$LOCAL_PATH\frontend\src\app\(dashboard)\messages" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/frontend/src/app/(dashboard)/"
scp -r "$LOCAL_PATH\frontend\src\app\(dashboard)\accommodation" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/frontend/src/app/(dashboard)/"
scp -r "$LOCAL_PATH\frontend\src\app\(dashboard)\tourism-tickets" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/frontend/src/app/(dashboard)/"
scp -r "$LOCAL_PATH\frontend\src\app\(dashboard)\booking" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/frontend/src/app/(dashboard)/"
scp -r "$LOCAL_PATH\frontend\src\app\(dashboard)\settings" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/frontend/src/app/(dashboard)/"
scp -r "$LOCAL_PATH\frontend\src\app\(dashboard)\profile\edit" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/frontend/src/app/(dashboard)/profile/"
scp -r "$LOCAL_PATH\frontend\src\app\(dashboard)\rewards" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/frontend/src/app/(dashboard)/"
scp -r "$LOCAL_PATH\frontend\src\app\(dashboard)\my-activities" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/frontend/src/app/(dashboard)/"
scp -r "$LOCAL_PATH\frontend\src\app\notifications" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/frontend/src/app/"
scp -r "$LOCAL_PATH\frontend\src\app\payment" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/frontend/src/app/"
scp -r "$LOCAL_PATH\frontend\src\app\admin\notifications" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/frontend/src/app/admin/"

# 6. Deploy updated components
Write-Host "📤 Uploading updated components..." -ForegroundColor Yellow
scp "$LOCAL_PATH\frontend\src\components\AdminNotifications.tsx" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/frontend/src/components/"

# 7. Run deployment commands on VPS
Write-Host "🔧 Running deployment commands on VPS..." -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH}/backend; npm install"
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH}/frontend; npm install"
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH}/backend; npx prisma generate"
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH}/backend; npx prisma db push"
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH}/frontend; npm run build"

# 8. Restart services
Write-Host "🔄 Restarting services..." -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_HOST}" "pm2 restart thelodgefamily-backend"
ssh "${VPS_USER}@${VPS_HOST}" "pm2 restart thelodgefamily-frontend"

Write-Host "✅ Deployment completed!" -ForegroundColor Green
Write-Host "🌐 Check your application at: https://family.thelodgegroup.id" -ForegroundColor Cyan