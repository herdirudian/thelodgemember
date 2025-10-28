# VPS Maintenance Script untuk The Lodge Family
# Script ini membantu mengatasi masalah umum yang terjadi di VPS

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("status", "restart", "logs", "fix-nginx", "fix-permissions", "full-restart")]
    [string]$Action
)

$VPS_IP = "31.97.51.129"
$FRONTEND_PORT = "3008"
$BACKEND_PORT = "5001"

function Show-Status {
    Write-Host "=== Checking VPS Status ===" -ForegroundColor Green
    ssh root@$VPS_IP "echo 'Frontend Status:' && ps aux | grep 'next start' | grep -v grep"
    ssh root@$VPS_IP "echo 'Backend Status:' && ps aux | grep 'node.*backend' | grep -v grep"
    ssh root@$VPS_IP "echo 'Nginx Status:' && systemctl status nginx --no-pager -l"
}

function Restart-Services {
    Write-Host "=== Restarting Services ===" -ForegroundColor Yellow
    ssh root@$VPS_IP "cd /var/www/frontend && pkill -f 'next start' && nohup npx next start -p $FRONTEND_PORT -H 0.0.0.0 > /dev/null 2>&1 &"
    ssh root@$VPS_IP "systemctl restart nginx"
    Write-Host "Services restarted!" -ForegroundColor Green
}

function Show-Logs {
    Write-Host "=== Recent Error Logs ===" -ForegroundColor Cyan
    ssh root@$VPS_IP "echo 'Nginx Errors:' && tail -10 /var/log/nginx/error.log"
    ssh root@$VPS_IP "echo 'System Logs:' && journalctl -u nginx --no-pager -l -n 5"
}

function Fix-Nginx {
    Write-Host "=== Fixing Nginx Configuration ===" -ForegroundColor Magenta
    ssh root@$VPS_IP "sed -i 's/localhost:3007/localhost:$FRONTEND_PORT/g' /etc/nginx/sites-available/family.thelodgegroup.id"
    ssh root@$VPS_IP "nginx -t && systemctl reload nginx"
    Write-Host "Nginx configuration updated!" -ForegroundColor Green
}

function Fix-Permissions {
    Write-Host "=== Fixing File Permissions ===" -ForegroundColor Blue
    ssh root@$VPS_IP "mkdir -p /var/www/backend/public/files/uploads"
    ssh root@$VPS_IP "chmod 755 /var/www/backend/public/files/uploads"
    ssh root@$VPS_IP "chown -R root:root /var/www/backend/public/files"
    Write-Host "Permissions fixed!" -ForegroundColor Green
}

function Full-Restart {
    Write-Host "=== Performing Full Restart ===" -ForegroundColor Red
    Fix-Nginx
    Fix-Permissions
    Restart-Services
    Start-Sleep -Seconds 5
    Show-Status
    Write-Host "Full restart completed!" -ForegroundColor Green
}

# Execute action
switch ($Action) {
    "status" { Show-Status }
    "restart" { Restart-Services }
    "logs" { Show-Logs }
    "fix-nginx" { Fix-Nginx }
    "fix-permissions" { Fix-Permissions }
    "full-restart" { Full-Restart }
}

Write-Host "`n=== Usage Examples ===" -ForegroundColor White
Write-Host ".\vps-maintenance.ps1 status          # Check service status"
Write-Host ".\vps-maintenance.ps1 restart         # Restart services"
Write-Host ".\vps-maintenance.ps1 logs            # Show error logs"
Write-Host ".\vps-maintenance.ps1 fix-nginx       # Fix Nginx config"
Write-Host ".\vps-maintenance.ps1 fix-permissions # Fix file permissions"
Write-Host ".\vps-maintenance.ps1 full-restart    # Complete restart & fix"