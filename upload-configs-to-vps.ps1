# Upload Configuration Files to VPS 31.97.51.129
# This script uploads security, backup, and optimization configuration files

Write-Host "=== Uploading Configuration Files to VPS 31.97.51.129 ===" -ForegroundColor Green
Write-Host ""

$vpsHost = "31.97.51.129"
$vpsUser = "root"

# Check if files exist locally
$filesToUpload = @(
    @{Local="nginx-security-config.conf"; Remote="/etc/nginx/conf.d/"; Description="Nginx Security Configuration"},
    @{Local="nginx-rate-limit-config.conf"; Remote="/etc/nginx/conf.d/"; Description="Nginx Rate Limiting Configuration"},
    @{Local="ssl-optimization-config.conf"; Remote="/etc/nginx/conf.d/"; Description="SSL Optimization Configuration"},
    @{Local="backup-lodge-family.sh"; Remote="/root/"; Description="Backup Script"},
    @{Local="restore-lodge-family.sh"; Remote="/root/"; Description="Restore Script"},
    @{Local="setup-backup-cron.sh"; Remote="/root/"; Description="Backup Cron Setup Script"}
)

Write-Host "Checking local files..." -ForegroundColor Cyan
$filesFound = 0
foreach ($file in $filesToUpload) {
    if (Test-Path $file.Local) {
        Write-Host "✓ Found: $($file.Local)" -ForegroundColor Green
        $filesFound++
    } else {
        Write-Host "✗ Missing: $($file.Local)" -ForegroundColor Red
    }
}
Write-Host "Files found: $filesFound/$($filesToUpload.Count)" -ForegroundColor Yellow
Write-Host ""

if ($filesFound -eq 0) {
    Write-Host "No files found to upload. Please ensure configuration files are generated first." -ForegroundColor Red
    exit 1
}

Write-Host "Starting file upload process..." -ForegroundColor Yellow
Write-Host "Note: You will be prompted for the root password for each file" -ForegroundColor Yellow
Write-Host ""

$successCount = 0
foreach ($file in $filesToUpload) {
    if (Test-Path $file.Local) {
        Write-Host "Uploading $($file.Description)..." -ForegroundColor Cyan
        $scpCommand = "scp `"$($file.Local)`" ${vpsUser}@${vpsHost}:$($file.Remote)"
        Write-Host "Command: $scpCommand" -ForegroundColor Gray
        
        try {
            $result = Invoke-Expression $scpCommand
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Successfully uploaded $($file.Local)" -ForegroundColor Green
                $successCount++
            } else {
                Write-Host "✗ Failed to upload $($file.Local)" -ForegroundColor Red
            }
        }
        catch {
            Write-Host "✗ Error uploading $($file.Local): $($_.Exception.Message)" -ForegroundColor Red
        }
        Write-Host ""
    }
}

Write-Host "=== Upload Summary ===" -ForegroundColor Green
Write-Host "Successfully uploaded: $successCount/$filesFound files" -ForegroundColor White

if ($successCount -gt 0) {
    Write-Host ""
    Write-Host "Next steps on VPS (SSH: ssh root@31.97.51.129):" -ForegroundColor Yellow
    Write-Host "1. Make backup scripts executable:" -ForegroundColor White
    Write-Host "   chmod +x /root/backup-lodge-family.sh" -ForegroundColor Gray
    Write-Host "   chmod +x /root/restore-lodge-family.sh" -ForegroundColor Gray
    Write-Host "   chmod +x /root/setup-backup-cron.sh" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Test Nginx configuration:" -ForegroundColor White
    Write-Host "   nginx -t" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Reload Nginx if test passes:" -ForegroundColor White
    Write-Host "   systemctl reload nginx" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Setup backup cron job:" -ForegroundColor White
    Write-Host "   /root/setup-backup-cron.sh" -ForegroundColor Gray
    Write-Host ""
    Write-Host "5. Verify services:" -ForegroundColor White
    Write-Host "   systemctl status nginx" -ForegroundColor Gray
    Write-Host "   systemctl status pm2-root" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Upload process completed!" -ForegroundColor Green