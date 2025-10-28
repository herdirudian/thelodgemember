param(
    [Parameter(Mandatory=$true)]
    [string]$VPSHost,
    
    [Parameter(Mandatory=$true)]
    [string]$VPSUser,
    
    [string]$SSHKeyPath = "",
    
    [switch]$SkipBackup = $false
)

# Colors for output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Blue = "Cyan"

Write-Host "🚀 Starting WhatsApp Verification Feature Deployment" -ForegroundColor $Blue
Write-Host "📡 Target VPS: $VPSHost" -ForegroundColor $Yellow
Write-Host "👤 SSH User: $VPSUser" -ForegroundColor $Yellow

# Test SSH connection
Write-Host "🔍 Testing SSH connection..." -ForegroundColor $Blue

$SSHCommand = "ssh"
if ($SSHKeyPath) {
    $SSHCommand += " -i `"$SSHKeyPath`""
}
$SSHCommand += " $VPSUser@$VPSHost"

$TestConnection = "$SSHCommand 'echo Connection successful'"
try {
    $TestResult = Invoke-Expression $TestConnection
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ SSH connection failed!" -ForegroundColor $Red
        exit 1
    }
    Write-Host "✅ SSH connection successful!" -ForegroundColor $Green
} catch {
    Write-Host "❌ SSH connection failed: $($_.Exception.Message)" -ForegroundColor $Red
    exit 1
}

# Create deployment script content
$DeploymentScript = @"
#!/bin/bash
set -e

echo "🚀 Starting WhatsApp Verification Feature Deployment..."

# Navigate to application directory
cd /var/www/thelodgefamily/current || { echo "❌ Application directory not found"; exit 1; }

# Create backup if not skipped
if [ "$1" != "--skip-backup" ]; then
    echo "💾 Creating backup..."
    BACKUP_DIR="../shared/backups"
    mkdir -p `$BACKUP_DIR
    TIMESTAMP=`$(date +%Y%m%d_%H%M%S)
    tar -czf `$BACKUP_DIR/frontend_backup_`$TIMESTAMP.tar.gz frontend/ || echo "⚠️ Frontend backup failed"
    echo "✅ Backup created: `$BACKUP_DIR/frontend_backup_`$TIMESTAMP.tar.gz"
fi

# Pull latest changes
echo "📥 Pulling latest changes from Git..."
git stash push -m "Auto-stash before WhatsApp verification deployment" || true
git pull origin main || { echo "❌ Git pull failed"; exit 1; }

# Install dependencies
echo "📦 Installing dependencies..."
cd frontend && npm install || { echo "❌ Frontend npm install failed"; exit 1; }
cd ../backend && npm install || { echo "❌ Backend npm install failed"; exit 1; }

# Build frontend
echo "🔨 Building frontend..."
cd ../frontend && npm run build || { echo "❌ Frontend build failed"; exit 1; }

# Update database schema
echo "🗄️ Updating database schema..."
cd ../backend
npx prisma db push || { echo "❌ Database schema update failed"; exit 1; }
npx prisma generate || { echo "❌ Prisma client generation failed"; exit 1; }

# Restart PM2 processes
echo "🔄 Restarting PM2 processes..."
pm2 reload ecosystem.config.js --env production || { echo "❌ PM2 reload failed"; exit 1; }

# Wait for services to stabilize
echo "⏳ Waiting for services to stabilize..."
sleep 10

# Health checks
echo "🏥 Performing health checks..."
BACKEND_STATUS=`$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health || echo "000")
FRONTEND_STATUS=`$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")

echo "Backend Health: `$BACKEND_STATUS"
echo "Frontend Health: `$FRONTEND_STATUS"

if [ "`$BACKEND_STATUS" = "200" ] && [ "`$FRONTEND_STATUS" = "200" ]; then
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    echo "📱 WhatsApp Verification Features deployed successfully!"
    echo ""
    echo "📋 Features deployed:"
    echo "• 📱 WhatsApp verification notification in dashboard"
    echo "• 🔧 Enhanced profile edit page with verification UI"
    echo "• ✅ Improved verification status display"
    echo "• 🔄 Better user experience for unverified members"
    exit 0
else
    echo "❌ DEPLOYMENT FAILED!"
    echo "Backend Status: `$BACKEND_STATUS"
    echo "Frontend Status: `$FRONTEND_STATUS"
    exit 1
fi
"@

# Write deployment script to temporary file
$TempScript = [System.IO.Path]::GetTempFileName() + ".sh"
$DeploymentScript | Out-File -FilePath $TempScript -Encoding UTF8

Write-Host "📤 Uploading deployment script to VPS..." -ForegroundColor $Blue

# Upload script to VPS
$SCPCommand = "scp"
if ($SSHKeyPath) {
    $SCPCommand += " -i `"$SSHKeyPath`""
}
$SCPCommand += " `"$TempScript`" $VPSUser@$VPSHost`:/tmp/deploy-whatsapp.sh"

try {
    Invoke-Expression $SCPCommand
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to upload deployment script!" -ForegroundColor $Red
        exit 1
    }
    Write-Host "✅ Deployment script uploaded successfully!" -ForegroundColor $Green
} catch {
    Write-Host "❌ SCP upload failed: $($_.Exception.Message)" -ForegroundColor $Red
    exit 1
}

Write-Host "🚀 Executing deployment on VPS..." -ForegroundColor $Blue

# Execute deployment script on VPS
$BackupFlag = if ($SkipBackup) { "--skip-backup" } else { "" }
$DeployCommand = "$SSHCommand 'chmod +x /tmp/deploy-whatsapp.sh && /tmp/deploy-whatsapp.sh $BackupFlag'"

try {
    Invoke-Expression $DeployCommand
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "🎉 DEPLOYMENT SUCCESSFUL!" -ForegroundColor $Green
        Write-Host "📱 WhatsApp Verification Features have been deployed to VPS!" -ForegroundColor $Green
        
        Write-Host "`n📋 What was deployed:" -ForegroundColor $Blue
        Write-Host "• Dashboard notification for unverified members" -ForegroundColor $Yellow
        Write-Host "• Enhanced profile edit page with verification UI" -ForegroundColor $Yellow
        Write-Host "• Improved verification status display" -ForegroundColor $Yellow
        Write-Host "• Better user experience flow" -ForegroundColor $Yellow
        
        Write-Host "`n📝 Next Steps:" -ForegroundColor $Blue
        Write-Host "1. Test the verification flow on your live site" -ForegroundColor $Yellow
        Write-Host "2. Monitor application logs for any issues" -ForegroundColor $Yellow
        Write-Host "3. Verify WhatsApp API integration is working" -ForegroundColor $Yellow
        
    } else {
        Write-Host "❌ DEPLOYMENT FAILED!" -ForegroundColor $Red
        Write-Host "Please check the error messages above and try again." -ForegroundColor $Red
        Write-Host "You can also manually run the deployment script on VPS." -ForegroundColor $Yellow
    }
} catch {
    Write-Host "❌ Deployment execution failed: $($_.Exception.Message)" -ForegroundColor $Red
    exit 1
}

# Cleanup
Remove-Item $TempScript -Force

Write-Host "`n🏁 Deployment process completed!" -ForegroundColor $Blue