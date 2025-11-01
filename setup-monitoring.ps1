# Production Monitoring Setup Script - Lodge Family
# This script sets up comprehensive monitoring for the production deployment

Write-Host "PRODUCTION MONITORING SETUP - LODGE FAMILY" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""

$VPS_HOST = "31.97.51.129"
$DOMAIN = "family.thelodgegroup.id"

Write-Host "STEP 1: Creating Monitoring Scripts for VPS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Create health check script for VPS
$healthCheckScript = @'
#!/bin/bash
# Health Check Script for Lodge Family Production

LOG_FILE="/var/log/lodge-family-health.log"
DOMAIN="family.thelodgegroup.id"
API_URL="https://$DOMAIN/api/health"
BACKEND_PORT=5001
FRONTEND_PORT=3003

# Function to log with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# Function to send alert (you can customize this)
send_alert() {
    local message="$1"
    log_message "ALERT: $message"
    # Add your notification method here (email, Slack, etc.)
    echo "ALERT: $message" | mail -s "Lodge Family Alert" admin@yourdomain.com 2>/dev/null || true
}

# Check website availability
check_website() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" --max-time 10)
    if [ "$response" = "200" ]; then
        log_message "Website OK - Status: $response"
        return 0
    else
        send_alert "Website DOWN - Status: $response"
        return 1
    fi
}

# Check API health
check_api() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" --max-time 10)
    if [ "$response" = "200" ]; then
        log_message "API OK - Status: $response"
        return 0
    else
        send_alert "API DOWN - Status: $response"
        return 1
    fi
}

# Check backend service
check_backend_service() {
    if systemctl is-active --quiet lodge-family-backend; then
        log_message "Backend service OK"
        return 0
    else
        send_alert "Backend service DOWN"
        systemctl restart lodge-family-backend
        return 1
    fi
}

# Check frontend service
check_frontend_service() {
    if systemctl is-active --quiet lodge-family-frontend; then
        log_message "Frontend service OK"
        return 0
    else
        send_alert "Frontend service DOWN"
        systemctl restart lodge-family-frontend
        return 1
    fi
}

# Check disk space
check_disk_space() {
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$usage" -gt 80 ]; then
        send_alert "Disk space critical: ${usage}% used"
    elif [ "$usage" -gt 70 ]; then
        log_message "Disk space warning: ${usage}% used"
    else
        log_message "Disk space OK: ${usage}% used"
    fi
}

# Check memory usage
check_memory() {
    local mem_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ "$mem_usage" -gt 90 ]; then
        send_alert "Memory usage critical: ${mem_usage}%"
    elif [ "$mem_usage" -gt 80 ]; then
        log_message "Memory usage warning: ${mem_usage}%"
    else
        log_message "Memory usage OK: ${mem_usage}%"
    fi
}

# Check SSL certificate expiry
check_ssl_expiry() {
    local expiry_date=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    local expiry_epoch=$(date -d "$expiry_date" +%s)
    local current_epoch=$(date +%s)
    local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    if [ "$days_until_expiry" -lt 7 ]; then
        send_alert "SSL certificate expires in $days_until_expiry days"
    elif [ "$days_until_expiry" -lt 30 ]; then
        log_message "SSL certificate expires in $days_until_expiry days"
    else
        log_message "SSL certificate OK - expires in $days_until_expiry days"
    fi
}

# Main health check execution
echo "Starting health check at $(date)"
log_message "=== Health Check Started ==="

check_website
check_api
check_backend_service
check_frontend_service
check_disk_space
check_memory
check_ssl_expiry

log_message "=== Health Check Completed ==="
echo "Health check completed. Check $LOG_FILE for details."
'@

# Save health check script
$healthCheckScript | Out-File -FilePath ".\vps-health-check.sh" -Encoding UTF8

Write-Host "Created: vps-health-check.sh" -ForegroundColor Green

# Create backup script for VPS
$backupScript = @'
#!/bin/bash
# Backup Script for Lodge Family Production

BACKUP_DIR="/var/backups/lodge-family"
APP_DIR="/var/www/lodge-family-current"
DB_FILE="$APP_DIR/prisma/dev.db"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="lodge-family-backup-$DATE"

# Create backup directory
mkdir -p $BACKUP_DIR

# Function to log with timestamp
log_backup() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> /var/log/lodge-family-backup.log
}

log_backup "=== Backup Started ==="

# Backup database
if [ -f "$DB_FILE" ]; then
    cp "$DB_FILE" "$BACKUP_DIR/database-$DATE.db"
    log_backup "Database backed up: database-$DATE.db"
else
    log_backup "WARNING: Database file not found at $DB_FILE"
fi

# Backup application files
tar -czf "$BACKUP_DIR/app-files-$DATE.tar.gz" -C "$APP_DIR" . 2>/dev/null
log_backup "Application files backed up: app-files-$DATE.tar.gz"

# Backup nginx configuration
cp /etc/nginx/sites-available/lodge-family "$BACKUP_DIR/nginx-config-$DATE.conf" 2>/dev/null
log_backup "Nginx config backed up: nginx-config-$DATE.conf"

# Backup systemd services
cp /etc/systemd/system/lodge-family-*.service "$BACKUP_DIR/" 2>/dev/null
log_backup "Systemd services backed up"

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*" -type f -mtime +7 -delete
log_backup "Old backups cleaned up"

log_backup "=== Backup Completed ==="
echo "Backup completed. Files saved to $BACKUP_DIR"
'@

# Save backup script
$backupScript | Out-File -FilePath ".\vps-backup.sh" -Encoding UTF8

Write-Host "Created: vps-backup.sh" -ForegroundColor Green

# Create cron setup script
$cronScript = @'
#!/bin/bash
# Cron Setup Script for Lodge Family Monitoring

echo "Setting up cron jobs for Lodge Family monitoring..."

# Create cron jobs
(crontab -l 2>/dev/null; echo "# Lodge Family Health Check - Every 5 minutes") | crontab -
(crontab -l 2>/dev/null; echo "*/5 * * * * /var/www/lodge-family-current/scripts/health-check.sh") | crontab -

(crontab -l 2>/dev/null; echo "# Lodge Family Backup - Daily at 2 AM") | crontab -
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/lodge-family-current/scripts/backup.sh") | crontab -

(crontab -l 2>/dev/null; echo "# Lodge Family Log Rotation - Weekly") | crontab -
(crontab -l 2>/dev/null; echo "0 0 * * 0 find /var/log -name '*lodge-family*' -type f -mtime +30 -delete") | crontab -

echo "Cron jobs installed successfully!"
echo "Current cron jobs:"
crontab -l
'@

# Save cron script
$cronScript | Out-File -FilePath ".\vps-setup-cron.sh" -Encoding UTF8

Write-Host "Created: vps-setup-cron.sh" -ForegroundColor Green

Write-Host ""
Write-Host "STEP 2: Creating Local Monitoring Dashboard" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Create local monitoring script
$localMonitorScript = @'
# Local Monitoring Dashboard for Lodge Family Production
# Run this script to monitor your production deployment from your local machine

Write-Host "LODGE FAMILY PRODUCTION MONITOR" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green
Write-Host ""

$VPS_HOST = "31.97.51.129"
$DOMAIN = "family.thelodgegroup.id"

function Test-ProductionHealth {
    Write-Host "Checking production health..." -ForegroundColor Yellow
    
    # Test website
    try {
        $response = Invoke-WebRequest -Uri "https://$DOMAIN" -Method HEAD -TimeoutSec 10 -UseBasicParsing
        Write-Host "Website: ONLINE (Status: $($response.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "Website: OFFLINE - $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test API
    try {
        $apiResponse = Invoke-WebRequest -Uri "https://$DOMAIN/api/health" -Method GET -TimeoutSec 10 -UseBasicParsing
        Write-Host "API: ONLINE (Status: $($apiResponse.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "API: OFFLINE - $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test SSL
    try {
        $sslTest = Invoke-WebRequest -Uri "https://$DOMAIN" -Method HEAD -TimeoutSec 10 -UseBasicParsing
        Write-Host "SSL: VALID" -ForegroundColor Green
    } catch {
        Write-Host "SSL: INVALID - $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Get-VPSStatus {
    Write-Host "Getting VPS status..." -ForegroundColor Yellow
    
    # This requires SSH access - you can uncomment and modify as needed
    # ssh root@$VPS_HOST "systemctl status lodge-family-backend lodge-family-frontend"
    
    Write-Host "To check VPS status manually, run:" -ForegroundColor Gray
    Write-Host "ssh root@$VPS_HOST" -ForegroundColor Gray
    Write-Host "systemctl status lodge-family-backend lodge-family-frontend" -ForegroundColor Gray
}

function Show-RecentLogs {
    Write-Host "To view recent logs, run these commands on VPS:" -ForegroundColor Yellow
    Write-Host "ssh root@$VPS_HOST" -ForegroundColor Gray
    Write-Host "tail -f /var/log/lodge-family-health.log" -ForegroundColor Gray
    Write-Host "journalctl -u lodge-family-backend -f" -ForegroundColor Gray
    Write-Host "journalctl -u lodge-family-frontend -f" -ForegroundColor Gray
}

# Main monitoring loop
while ($true) {
    Clear-Host
    Write-Host "LODGE FAMILY PRODUCTION MONITOR - $(Get-Date)" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    
    Test-ProductionHealth
    
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Cyan
    Write-Host "1. Refresh (Enter)" -ForegroundColor White
    Write-Host "2. VPS Status (v)" -ForegroundColor White
    Write-Host "3. View Logs (l)" -ForegroundColor White
    Write-Host "4. Exit (q)" -ForegroundColor White
    Write-Host ""
    
    $input = Read-Host "Enter command"
    
    switch ($input.ToLower()) {
        "v" { Get-VPSStatus; Read-Host "Press Enter to continue" }
        "l" { Show-RecentLogs; Read-Host "Press Enter to continue" }
        "q" { break }
        default { continue }
    }
}
'@

# Save local monitoring script
$localMonitorScript | Out-File -FilePath ".\monitor-production.ps1" -Encoding UTF8

Write-Host "Created: monitor-production.ps1" -ForegroundColor Green

Write-Host ""
Write-Host "STEP 3: VPS Installation Instructions" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "To install monitoring on your VPS, run these commands:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Upload scripts to VPS:" -ForegroundColor White
Write-Host "scp vps-health-check.sh root@${VPS_HOST}:/var/www/lodge-family-current/scripts/health-check.sh" -ForegroundColor Gray
Write-Host "scp vps-backup.sh root@${VPS_HOST}:/var/www/lodge-family-current/scripts/backup.sh" -ForegroundColor Gray
Write-Host "scp vps-setup-cron.sh root@${VPS_HOST}:/tmp/setup-cron.sh" -ForegroundColor Gray
Write-Host ""

Write-Host "2. SSH to VPS and setup:" -ForegroundColor White
Write-Host "ssh root@$VPS_HOST" -ForegroundColor Gray
Write-Host "chmod +x /var/www/lodge-family-current/scripts/*.sh" -ForegroundColor Gray
Write-Host "chmod +x /tmp/setup-cron.sh" -ForegroundColor Gray
Write-Host "/tmp/setup-cron.sh" -ForegroundColor Gray
Write-Host ""

Write-Host "3. Test monitoring:" -ForegroundColor White
Write-Host "/var/www/lodge-family-current/scripts/health-check.sh" -ForegroundColor Gray
Write-Host "/var/www/lodge-family-current/scripts/backup.sh" -ForegroundColor Gray
Write-Host ""

Write-Host "STEP 4: Local Monitoring" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start local monitoring dashboard:" -ForegroundColor Yellow
Write-Host ".\monitor-production.ps1" -ForegroundColor Gray
Write-Host ""

Write-Host "MONITORING FEATURES:" -ForegroundColor Green
Write-Host "===================" -ForegroundColor Green
Write-Host "- Website availability check (every 5 minutes)" -ForegroundColor Gray
Write-Host "- API health monitoring" -ForegroundColor Gray
Write-Host "- Service status monitoring" -ForegroundColor Gray
Write-Host "- SSL certificate expiry alerts" -ForegroundColor Gray
Write-Host "- Disk space and memory monitoring" -ForegroundColor Gray
Write-Host "- Automated daily backups" -ForegroundColor Gray
Write-Host "- Log rotation and cleanup" -ForegroundColor Gray
Write-Host "- Local monitoring dashboard" -ForegroundColor Gray
Write-Host ""

Write-Host "Setup complete! Follow the instructions above to install monitoring." -ForegroundColor Green