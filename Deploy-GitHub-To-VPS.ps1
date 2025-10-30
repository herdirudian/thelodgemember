# Deploy dari GitHub ke VPS 31.97.51.129
# Script ini akan pull perubahan terbaru dari GitHub dan deploy ke VPS

param(
    [string]$VPSHost = "31.97.51.129",
    [string]$VPSUser = "root",
    [string]$AppPath = "/var/www/thelodgefamily/current",
    [string]$GitRepo = "git@github.com:herdirudian/thelodgemember.git",
    [string]$Branch = "main"
)

Write-Host "Deployment dari GitHub ke VPS" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "VPS: $VPSUser@$VPSHost" -ForegroundColor Yellow
Write-Host "Repository: $GitRepo" -ForegroundColor Yellow
Write-Host "Branch: $Branch" -ForegroundColor Yellow
Write-Host "App Path: $AppPath" -ForegroundColor Yellow
Write-Host ""

# Membuat script deployment untuk dijalankan di VPS
$deployScript = @'
#!/bin/bash
set -e

echo "Starting deployment from GitHub..."
echo "Repository: git@github.com:herdirudian/thelodgemember.git"
echo "Branch: main"
echo "App Path: /var/www/thelodgefamily/current"
echo ""

# Create base directory if it doesn't exist
echo "Creating base directory..."
mkdir -p /var/www/thelodgefamily

# Backup current deployment
echo "Creating backup..."
if [ -d "/var/www/thelodgefamily/current" ]; then
    cp -r /var/www/thelodgefamily/current /var/www/thelodgefamily/current_backup_$(date +%Y%m%d_%H%M%S)
    echo "Backup created"
fi

# Clone or pull from GitHub
if [ ! -d "/var/www/thelodgefamily/current/.git" ]; then
    echo "Cloning repository..."
    rm -rf /var/www/thelodgefamily/current
    cd /var/www/thelodgefamily
    
    # Try SSH first, fallback to HTTPS
    if git clone git@github.com:herdirudian/thelodgemember.git current; then
        echo "Cloned using SSH"
    elif git clone https://github.com/herdirudian/thelodgemember.git current; then
        echo "Cloned using HTTPS"
    else
        echo "Failed to clone repository"
        exit 1
    fi
    
    cd current
    git checkout main
else
    echo "Pulling latest changes..."
    cd /var/www/thelodgefamily/current
    git fetch origin
    git reset --hard origin/main
    git pull origin main
fi

echo "Code updated from GitHub"

# Check if directories exist
if [ ! -d "/var/www/thelodgefamily/current/backend" ]; then
    echo "Error: Backend directory not found!"
    exit 1
fi

if [ ! -d "/var/www/thelodgefamily/current/frontend" ]; then
    echo "Error: Frontend directory not found!"
    exit 1
fi

# Install dependencies for backend
echo "Installing backend dependencies..."
cd /var/www/thelodgefamily/current/backend
npm install --production

# Install dependencies for frontend
echo "Installing frontend dependencies..."
cd /var/www/thelodgefamily/current/frontend
npm install

# Build frontend
echo "Building frontend..."
npm run build

# Copy environment files if they don't exist
echo "Setting up environment..."
cd /var/www/thelodgefamily/current/backend
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "Environment file created from example"
        echo "WARNING: Please update .env file with your database configuration"
        echo "Current .env needs to be configured with proper DATABASE_URL"
    fi
fi

# Run database migrations if prisma exists and .env is properly configured
echo "Checking database configuration..."
if [ -f "package.json" ] && grep -q "prisma" package.json; then
    if [ -f .env ] && grep -q "DATABASE_URL" .env; then
        echo "Running database migrations..."
        if npx prisma migrate deploy; then
            echo "Database migrations completed successfully"
            npx prisma generate
        else
            echo "Database migration failed - continuing without migrations"
            echo "Please check your DATABASE_URL in .env file"
        fi
    else
        echo "DATABASE_URL not found in .env - skipping migrations"
        echo "Please configure DATABASE_URL in .env file"
    fi
else
    echo "Prisma not found, skipping migrations"
fi

# Restart services
echo "Restarting services..."
pm2 restart all || pm2 start ecosystem.config.js || echo "PM2 restart failed, continuing..."

# Restart Nginx
echo "Restarting Nginx..."
systemctl restart nginx || echo "Nginx restart failed, continuing..."

echo ""
echo "Deployment completed successfully!"
echo "Website: https://family.thelodgegroup.id"
echo "Check status: pm2 status"
echo "Check logs: pm2 logs"
'@

# Simpan script ke file temporary dengan Unix line endings
$tempScript = "deploy-from-github.sh"
$deployScript -replace "`r`n", "`n" | Out-File -FilePath $tempScript -Encoding ASCII -NoNewline
Add-Content -Path $tempScript -Value "`n" -Encoding ASCII -NoNewline

Write-Host "Script deployment dibuat: $tempScript" -ForegroundColor Green

# Upload script ke VPS
Write-Host "Uploading deployment script ke VPS..." -ForegroundColor Yellow
Write-Host "Anda akan diminta memasukkan password VPS..." -ForegroundColor Cyan

# Upload ke home directory dulu, baru pindah
$uploadCommand = "scp `"$tempScript`" `"${VPSUser}@${VPSHost}:~/`""
Write-Host "Command: $uploadCommand" -ForegroundColor Gray

try {
    Invoke-Expression $uploadCommand
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Script berhasil diupload!" -ForegroundColor Green
        
        # SSH ke VPS dan jalankan deployment
        Write-Host ""
        Write-Host "Menjalankan deployment di VPS..." -ForegroundColor Yellow
        Write-Host "Anda akan diminta memasukkan password VPS lagi..." -ForegroundColor Cyan
        
        $sshCommand = "ssh ${VPSUser}@${VPSHost} `"chmod +x ~/$tempScript && ~/$tempScript`""
        Write-Host "Command: $sshCommand" -ForegroundColor Gray
        
        Invoke-Expression $sshCommand
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "Deployment berhasil!" -ForegroundColor Green
            Write-Host "Website: https://family.thelodgegroup.id" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Verifikasi deployment:" -ForegroundColor Yellow
            Write-Host "1. Buka website: https://family.thelodgegroup.id" -ForegroundColor White
            Write-Host "2. Test API: curl https://family.thelodgegroup.id/api/health" -ForegroundColor White
            Write-Host "3. Check PM2 status: ssh $VPSUser@$VPSHost 'pm2 status'" -ForegroundColor White
        } else {
            Write-Host "Deployment gagal!" -ForegroundColor Red
        }
    } else {
        Write-Host "Upload script gagal!" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Cleanup temporary script
    if (Test-Path $tempScript) {
        Remove-Item $tempScript
        Write-Host "Temporary script cleaned up" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Untuk troubleshooting, lihat:" -ForegroundColor Yellow
Write-Host "- DEPLOY-TO-31.97.51.129.md" -ForegroundColor White
Write-Host "- DEPLOYMENT-TROUBLESHOOTING.md" -ForegroundColor White