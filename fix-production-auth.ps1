# Fix Production Authentication Issues
# This script updates VPS environment variables and restarts services

Write-Host "🔧 Fixing Production Authentication Issues..." -ForegroundColor Cyan

# VPS connection details
$VPS_IP = "103.127.99.103"
$VPS_USER = "root"
$BACKEND_PATH = "/var/www/lodge-family/backend"

Write-Host "📋 Steps to fix:" -ForegroundColor Yellow
Write-Host "1. Update .env file with correct JWT_SECRET and ADMIN_EMAIL"
Write-Host "2. Restart backend service"
Write-Host "3. Test authentication endpoints"
Write-Host ""

Write-Host "🚀 Deploying fixes to VPS..." -ForegroundColor Green

# Create the deployment commands
$commands = @"
# Navigate to backend directory
cd $BACKEND_PATH

# Backup current .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Update environment variables
echo 'DATABASE_URL="mysql://root:BI5mill4h%40%40%40@localhost:3306/lodge_family_db"' > .env
echo 'PORT=5001' >> .env
echo 'APP_URL=https://family.thelodgegroup.id' >> .env
echo 'FRONTEND_URL=https://family.thelodgegroup.id' >> .env
echo 'JWT_SECRET=lodge_family_jwt_secret_2025_production_key' >> .env
echo 'QR_HMAC_SECRET=secure_qr_secret' >> .env
echo 'ADMIN_EMAIL=admin@thelodgegroup.id' >> .env
echo 'ADMIN_PASSWORD=admin123' >> .env
echo 'ADMIN_FULL_NAME=Administrator' >> .env
echo 'ADMIN_PHONE=0000000000' >> .env
echo 'EMAIL_PROVIDER=smtp' >> .env
echo 'SMTP_HOST=smtp.hostinger.com' >> .env
echo 'SMTP_PORT=465' >> .env
echo 'SMTP_SECURE=true' >> .env
echo 'SMTP_USER=no-reply@thelodgegroup.id' >> .env
echo 'SMTP_PASS=No2025!@' >> .env
echo 'FROM_EMAIL=no-reply@thelodgegroup.id' >> .env
echo 'FROM_NAME=The Lodge Family' >> .env
echo 'CLOUDINARY_CLOUD_NAME=' >> .env
echo 'CLOUDINARY_API_KEY=' >> .env
echo 'CLOUDINARY_API_SECRET=' >> .env
echo 'WATZAP_API_KEY=3QEKEK0NLNNSBYSB' >> .env
echo 'WATZAP_NUMBER_KEY=En9f2o0tEMTg8QLH' >> .env
echo 'XENDIT_SECRET_KEY=xnd_development_ZmDaRXsyswaNKu1JOxiNKxy79NZ4YGMi7tvvL66Z2I6zWqAecypFh2EadYmzGfc' >> .env
echo 'XENDIT_WEBHOOK_TOKEN=3tmtpsz2eGYaYdRyYp5SzR7V2aHHaoTtwNFmFQZQpxDMNPw1' >> .env
echo 'XENDIT_PUBLIC_KEY=xnd_public_development_ZmDaRXsyswaNKu1JOxiNKxy79NZ4YGMi7tvvL66Z2I6zWqAecypFh2EadYmzGfc' >> .env

# Restart PM2 backend service
pm2 restart backend

# Wait for service to start
sleep 5

# Check service status
pm2 status

echo "✅ Environment updated and service restarted"
echo "🔍 Testing authentication..."

# Test login endpoint
curl -X POST https://family.thelodgegroup.id/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@thelodgegroup.id","password":"admin123"}' \
  -w "\nStatus: %{http_code}\n"

echo "🎯 Authentication fix deployment completed!"
"@

# Save commands to file for manual execution
$commands | Out-File -FilePath "vps-auth-fix-commands.sh" -Encoding UTF8

Write-Host "📝 Commands saved to: vps-auth-fix-commands.sh" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 To apply the fix, run these commands on VPS:" -ForegroundColor Yellow
Write-Host "ssh root@$VPS_IP" -ForegroundColor Cyan
Write-Host "bash /path/to/vps-auth-fix-commands.sh" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or copy and paste the commands manually:" -ForegroundColor Yellow
Write-Host $commands -ForegroundColor Gray

Write-Host ""
Write-Host "🧪 After deployment, test with:" -ForegroundColor Yellow
Write-Host "curl -X POST https://family.thelodgegroup.id/api/login -H 'Content-Type: application/json' -d '{\"email\":\"admin@thelodgegroup.id\",\"password\":\"admin123\"}'" -ForegroundColor Cyan