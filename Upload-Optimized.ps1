# Upload Optimized Package to VPS
param(
    [string]$VPSHost = "31.97.51.129",
    [string]$VPSUser = "root",
    [string]$DeploymentPath = "/var/www/thelodgefamily"
)

Write-Host "=== Upload Optimized Package to VPS ===" -ForegroundColor Green
Write-Host "VPS: $VPSHost" -ForegroundColor Yellow
Write-Host "User: $VPSUser" -ForegroundColor Yellow
Write-Host "Path: $DeploymentPath" -ForegroundColor Yellow

# Create optimized package directory
$OptimizedDir = "deployment-optimized"
if (Test-Path $OptimizedDir) {
    Remove-Item $OptimizedDir -Recurse -Force
}
New-Item -ItemType Directory -Path $OptimizedDir | Out-Null

Write-Host "Creating optimized package..." -ForegroundColor Cyan

# Copy essential files only (check if exists first)
if (Test-Path "frontend/dist") {
    Copy-Item "frontend/dist" -Destination "$OptimizedDir/frontend-dist" -Recurse -Force
} else {
    Write-Host "Warning: frontend/dist not found, skipping..." -ForegroundColor Yellow
}

Copy-Item "backend/package.json" -Destination "$OptimizedDir/" -Force
Copy-Item "backend/package-lock.json" -Destination "$OptimizedDir/" -Force
Copy-Item "backend/prisma" -Destination "$OptimizedDir/" -Recurse -Force
Copy-Item "backend/src" -Destination "$OptimizedDir/" -Recurse -Force

if (Test-Path "backend/.env.vps") {
    Copy-Item "backend/.env.vps" -Destination "$OptimizedDir/.env" -Force
} else {
    Write-Host "Warning: .env.vps not found, skipping..." -ForegroundColor Yellow
}

Copy-Item "ecosystem.config.js" -Destination "$OptimizedDir/" -Force

if (Test-Path "nginx-config.conf") {
    Copy-Item "nginx-config.conf" -Destination "$OptimizedDir/nginx.conf" -Force
}

if (Test-Path "deploy-to-vps.sh") {
    Copy-Item "deploy-to-vps.sh" -Destination "$OptimizedDir/" -Force
}

Write-Host "Package created successfully!" -ForegroundColor Green
Write-Host "Package size: " -NoNewline
$Size = (Get-ChildItem $OptimizedDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "$([math]::Round($Size, 2)) MB" -ForegroundColor Yellow

# Upload optimized package
Write-Host "Uploading optimized package..." -ForegroundColor Cyan
$UploadCommand = "scp -r $OptimizedDir ${VPSUser}@${VPSHost}:$DeploymentPath"
Write-Host "Command: $UploadCommand" -ForegroundColor Gray

try {
    Invoke-Expression $UploadCommand
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Upload berhasil!" -ForegroundColor Green
        Write-Host "Langkah selanjutnya:" -ForegroundColor Yellow
        Write-Host "1. SSH ke VPS: ssh $VPSUser@$VPSHost" -ForegroundColor White
        Write-Host "2. Masuk ke direktori: cd $DeploymentPath/deployment-optimized" -ForegroundColor White
        Write-Host "3. Jalankan deployment: chmod +x deploy-vps.sh && ./deploy-vps.sh" -ForegroundColor White
    } else {
        Write-Host "Upload gagal!" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}