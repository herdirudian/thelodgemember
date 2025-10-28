# Upload Deployment Package ke VPS 31.97.51.129

param(
    [string]$VPSHost = "31.97.51.129",
    [string]$VPSUser = "root",
    [string]$DeploymentPath = "/var/www/thelodgefamily/current"
)

Write-Host "Uploading deployment package ke VPS..." -ForegroundColor Green
Write-Host "VPS: $VPSUser@$VPSHost" -ForegroundColor Yellow
Write-Host "Path: $DeploymentPath" -ForegroundColor Yellow

# Check if deployment package exists
$PackagePath = "deployment-packages\vps-fix-deployment-20251028_160850"
if (-not (Test-Path $PackagePath)) {
    Write-Host "Deployment package tidak ditemukan: $PackagePath" -ForegroundColor Red
    exit 1
}

Write-Host "Package ditemukan: $PackagePath" -ForegroundColor Green

# Upload files
Write-Host "Uploading files..." -ForegroundColor Yellow
Write-Host "Anda akan diminta memasukkan password VPS..." -ForegroundColor Cyan

$uploadCommand = "scp -r `"$PackagePath\*`" `"${VPSUser}@${VPSHost}:${DeploymentPath}/`""
Write-Host "Command: $uploadCommand" -ForegroundColor Gray

Invoke-Expression $uploadCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host "Upload berhasil!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Langkah selanjutnya:" -ForegroundColor Yellow
    Write-Host "1. SSH ke VPS: ssh $VPSUser@$VPSHost" -ForegroundColor White
    Write-Host "2. Masuk ke direktori: cd $DeploymentPath" -ForegroundColor White
    Write-Host "3. Jalankan script: chmod +x fix-vps-blank-page.sh && ./fix-vps-blank-page.sh" -ForegroundColor White
    Write-Host ""
    Write-Host "Lihat panduan lengkap di: DEPLOY-TO-31.97.51.129.md" -ForegroundColor Cyan
} else {
    Write-Host "Upload gagal!" -ForegroundColor Red
    Write-Host "Pastikan:" -ForegroundColor Yellow
    Write-Host "- SSH client terinstall" -ForegroundColor White
    Write-Host "- Password VPS benar" -ForegroundColor White
    Write-Host "- Koneksi internet stabil" -ForegroundColor White
}