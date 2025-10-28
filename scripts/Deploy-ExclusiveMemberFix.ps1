# PowerShell script to deploy exclusive member page fix to VPS
# Run this script from the project root directory

param(
    [string]$VpsHost = "31.97.51.129",
    [string]$VpsUser = "root",
    [string]$ProjectDir = "/var/www/thelodgefamily"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying exclusive member page fix to VPS..." -ForegroundColor Green
Write-Host ""

# Configuration
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ArchiveName = "frontend-fixed-exclusive-member.zip"

Write-Host "📋 Deployment Configuration:" -ForegroundColor Yellow
Write-Host "  VPS Host: $VpsHost"
Write-Host "  VPS User: $VpsUser"
Write-Host "  Project Dir: $ProjectDir"
Write-Host "  Timestamp: $Timestamp"
Write-Host ""

# Check if archive exists
if (-not (Test-Path $ArchiveName)) {
    Write-Host "❌ Archive file not found: $ArchiveName" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory where the archive was created." -ForegroundColor Yellow
    exit 1
}

# Step 1: Create backup on VPS
Write-Host "💾 Creating backup of current frontend..." -ForegroundColor Yellow
$BackupCommand = @"
cd $ProjectDir
if [ -d 'frontend' ]; then
    tar -czf frontend_backup_$Timestamp.tar.gz frontend/
    echo '✅ Backup created: frontend_backup_$Timestamp.tar.gz'
else
    echo '⚠️  Frontend directory not found, skipping backup'
fi
"@

try {
    ssh "$VpsUser@$VpsHost" $BackupCommand
    Write-Host "✅ Backup completed" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backup failed, continuing anyway..." -ForegroundColor Yellow
}

# Step 2: Upload the archive
Write-Host "📤 Uploading fixed frontend code..." -ForegroundColor Yellow
try {
    scp $ArchiveName "$VpsUser@${VpsHost}:$ProjectDir/"
    Write-Host "✅ Upload completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Upload failed: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Deploy the fix
Write-Host "🔧 Extracting and deploying the fix..." -ForegroundColor Yellow
$DeployCommand = @"
cd $ProjectDir

# Extract the new frontend code
unzip -o $ArchiveName -d frontend_temp/

# Stop the frontend service temporarily
echo '🛑 Stopping frontend service...'
pm2 stop frontend || echo 'Frontend service not running'

# Backup current src directory
if [ -d 'frontend/src' ]; then
    mv frontend/src frontend/src_backup_$Timestamp
fi

# Copy the fixed files
echo '📋 Copying fixed files...'
cp -r frontend_temp/src frontend/
cp frontend_temp/package.json frontend/ 2>/dev/null || true
cp frontend_temp/next.config.ts frontend/ 2>/dev/null || true
cp frontend_temp/tsconfig.json frontend/ 2>/dev/null || true

# Install dependencies and build
cd frontend
echo '📦 Installing dependencies...'
npm install --production

echo '🏗️ Building frontend...'
npm run build

# Start the frontend service
echo '🚀 Starting frontend service...'
pm2 start ecosystem.config.js --only frontend || pm2 restart frontend

# Cleanup
cd ..
rm -rf frontend_temp/
rm $ArchiveName

echo '✅ Deployment completed successfully!'
"@

try {
    ssh "$VpsUser@$VpsHost" $DeployCommand
    Write-Host "✅ Deployment completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Health check
Write-Host "🔍 Performing health check..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

try {
    $Response = Invoke-WebRequest -Uri "http://$VpsHost/exclusive-member" -Method Head -TimeoutSec 10
    if ($Response.StatusCode -eq 200) {
        Write-Host "✅ Health check passed! Exclusive member page is accessible." -ForegroundColor Green
    } else {
        throw "Unexpected status code: $($Response.StatusCode)"
    }
} catch {
    Write-Host "❌ Health check failed! Page may not be accessible." -ForegroundColor Red
    Write-Host "🔄 Attempting to restart services..." -ForegroundColor Yellow
    
    $RestartCommand = @"
cd $ProjectDir
pm2 restart all
sleep 3
pm2 status
"@
    ssh "$VpsUser@$VpsHost" $RestartCommand
}

Write-Host ""
Write-Host "🎉 Deployment process completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Test the page: http://$VpsHost/exclusive-member"
Write-Host "  2. Check PM2 status: ssh $VpsUser@$VpsHost 'pm2 status'"
Write-Host "  3. View logs if needed: ssh $VpsUser@$VpsHost 'pm2 logs'"