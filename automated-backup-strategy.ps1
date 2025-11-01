# Lodge Family Automated Backup Strategy Script

param(
    [string]$VpsHost = "31.97.51.129",
    [string]$BackupPath = "/root/backups"
)

Write-Host "LODGE FAMILY - AUTOMATED BACKUP STRATEGY" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow
Write-Host "Target VPS: $VpsHost" -ForegroundColor Gray
Write-Host "Backup Path: $BackupPath" -ForegroundColor Gray
Write-Host "Started: $(Get-Date)" -ForegroundColor Gray

# Create backup script for VPS
$backupScript = @"
#!/bin/bash
# Lodge Family Automated Backup Script
# Run this script daily via cron job

BACKUP_DIR="$BackupPath"
DATE=`$(date +%Y%m%d_%H%M%S)
APP_DIR="/root/lodge-family"
DB_NAME="lodge_family_db"

# Create backup directory if it doesn't exist
mkdir -p `$BACKUP_DIR/daily
mkdir -p `$BACKUP_DIR/weekly
mkdir -p `$BACKUP_DIR/monthly

echo "Starting backup process at `$(date)"

# 1. Database Backup
echo "Backing up database..."
mysqldump -u root -p`$MYSQL_ROOT_PASSWORD `$DB_NAME > `$BACKUP_DIR/daily/db_backup_`$DATE.sql
if [ `$? -eq 0 ]; then
    echo "Database backup completed successfully"
    gzip `$BACKUP_DIR/daily/db_backup_`$DATE.sql
else
    echo "Database backup failed"
fi

# 2. Application Files Backup
echo "Backing up application files..."
tar -czf `$BACKUP_DIR/daily/app_backup_`$DATE.tar.gz -C /root lodge-family
if [ `$? -eq 0 ]; then
    echo "Application backup completed successfully"
else
    echo "Application backup failed"
fi

# 3. Environment Files Backup
echo "Backing up environment files..."
mkdir -p `$BACKUP_DIR/daily/env_`$DATE
cp `$APP_DIR/backend/.env* `$BACKUP_DIR/daily/env_`$DATE/ 2>/dev/null || true
cp `$APP_DIR/frontend/.env* `$BACKUP_DIR/daily/env_`$DATE/ 2>/dev/null || true
tar -czf `$BACKUP_DIR/daily/env_backup_`$DATE.tar.gz -C `$BACKUP_DIR/daily env_`$DATE
rm -rf `$BACKUP_DIR/daily/env_`$DATE

# 4. Nginx Configuration Backup
echo "Backing up Nginx configuration..."
cp -r /etc/nginx `$BACKUP_DIR/daily/nginx_`$DATE
tar -czf `$BACKUP_DIR/daily/nginx_backup_`$DATE.tar.gz -C `$BACKUP_DIR/daily nginx_`$DATE
rm -rf `$BACKUP_DIR/daily/nginx_`$DATE

# 5. SSL Certificates Backup
echo "Backing up SSL certificates..."
cp -r /etc/letsencrypt `$BACKUP_DIR/daily/ssl_`$DATE 2>/dev/null || true
if [ -d `$BACKUP_DIR/daily/ssl_`$DATE ]; then
    tar -czf `$BACKUP_DIR/daily/ssl_backup_`$DATE.tar.gz -C `$BACKUP_DIR/daily ssl_`$DATE
    rm -rf `$BACKUP_DIR/daily/ssl_`$DATE
fi

# 6. Weekly Backup (every Sunday)
if [ `$(date +%u) -eq 7 ]; then
    echo "Creating weekly backup..."
    cp `$BACKUP_DIR/daily/db_backup_`$DATE.sql.gz `$BACKUP_DIR/weekly/
    cp `$BACKUP_DIR/daily/app_backup_`$DATE.tar.gz `$BACKUP_DIR/weekly/
fi

# 7. Monthly Backup (first day of month)
if [ `$(date +%d) -eq 01 ]; then
    echo "Creating monthly backup..."
    cp `$BACKUP_DIR/daily/db_backup_`$DATE.sql.gz `$BACKUP_DIR/monthly/
    cp `$BACKUP_DIR/daily/app_backup_`$DATE.tar.gz `$BACKUP_DIR/monthly/
fi

# 8. Cleanup old backups
echo "Cleaning up old backups..."
# Keep daily backups for 7 days
find `$BACKUP_DIR/daily -name "*.gz" -mtime +7 -delete
find `$BACKUP_DIR/daily -name "*.tar.gz" -mtime +7 -delete

# Keep weekly backups for 4 weeks
find `$BACKUP_DIR/weekly -name "*.gz" -mtime +28 -delete
find `$BACKUP_DIR/weekly -name "*.tar.gz" -mtime +28 -delete

# Keep monthly backups for 12 months
find `$BACKUP_DIR/monthly -name "*.gz" -mtime +365 -delete
find `$BACKUP_DIR/monthly -name "*.tar.gz" -mtime +365 -delete

echo "Backup process completed at `$(date)"
echo "----------------------------------------"
"@

# Create restore script
$restoreScript = @"
#!/bin/bash
# Lodge Family Restore Script

BACKUP_DIR="$BackupPath"
APP_DIR="/root/lodge-family"

if [ -z "`$1" ]; then
    echo "Usage: `$0 <backup_date>"
    echo "Example: `$0 20241101_235900"
    echo "Available backups:"
    ls -la `$BACKUP_DIR/daily/ | grep backup
    exit 1
fi

BACKUP_DATE=`$1
DB_NAME="lodge_family_db"

echo "Starting restore process for backup: `$BACKUP_DATE"

# 1. Stop services
echo "Stopping services..."
systemctl stop nginx
pkill -f "node"

# 2. Restore database
if [ -f "`$BACKUP_DIR/daily/db_backup_`$BACKUP_DATE.sql.gz" ]; then
    echo "Restoring database..."
    gunzip -c `$BACKUP_DIR/daily/db_backup_`$BACKUP_DATE.sql.gz | mysql -u root -p`$MYSQL_ROOT_PASSWORD `$DB_NAME
    echo "Database restored successfully"
else
    echo "Database backup file not found"
fi

# 3. Restore application files
if [ -f "`$BACKUP_DIR/daily/app_backup_`$BACKUP_DATE.tar.gz" ]; then
    echo "Restoring application files..."
    rm -rf `$APP_DIR.backup
    mv `$APP_DIR `$APP_DIR.backup
    tar -xzf `$BACKUP_DIR/daily/app_backup_`$BACKUP_DATE.tar.gz -C /root
    echo "Application files restored successfully"
else
    echo "Application backup file not found"
fi

# 4. Restore environment files
if [ -f "`$BACKUP_DIR/daily/env_backup_`$BACKUP_DATE.tar.gz" ]; then
    echo "Restoring environment files..."
    tar -xzf `$BACKUP_DIR/daily/env_backup_`$BACKUP_DATE.tar.gz -C `$BACKUP_DIR/daily/
    cp `$BACKUP_DIR/daily/env_`$BACKUP_DATE/* `$APP_DIR/backend/ 2>/dev/null || true
    cp `$BACKUP_DIR/daily/env_`$BACKUP_DATE/* `$APP_DIR/frontend/ 2>/dev/null || true
    rm -rf `$BACKUP_DIR/daily/env_`$BACKUP_DATE
    echo "Environment files restored successfully"
fi

# 5. Start services
echo "Starting services..."
cd `$APP_DIR/backend && npm install && npm run build
cd `$APP_DIR/frontend && npm install && npm run build
systemctl start nginx

echo "Restore process completed"
"@

# Create cron job setup script
$cronSetup = @"
#!/bin/bash
# Setup cron job for automated backups

# Add backup script to cron (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-lodge-family.sh >> /var/log/lodge-backup.log 2>&1") | crontab -

echo "Cron job added successfully"
echo "Backup will run daily at 2:00 AM"
echo "Check logs at: /var/log/lodge-backup.log"
"@

# Write scripts to files
Write-Host "Creating backup strategy files..." -ForegroundColor Cyan

$backupScript | Out-File -FilePath "backup-lodge-family.sh" -Encoding UTF8
$restoreScript | Out-File -FilePath "restore-lodge-family.sh" -Encoding UTF8
$cronSetup | Out-File -FilePath "setup-backup-cron.sh" -Encoding UTF8

# Create deployment guide
$deploymentGuide = @"
# Lodge Family Backup Strategy Deployment Guide

## Files Created:
1. backup-lodge-family.sh - Main backup script
2. restore-lodge-family.sh - Restore script
3. setup-backup-cron.sh - Cron job setup

## Deployment Steps:

### 1. Upload scripts to VPS:
```bash
scp backup-lodge-family.sh root@$VpsHost:/root/
scp restore-lodge-family.sh root@$VpsHost:/root/
scp setup-backup-cron.sh root@$VpsHost:/root/
```

### 2. Make scripts executable:
```bash
ssh root@$VpsHost "chmod +x /root/backup-lodge-family.sh"
ssh root@$VpsHost "chmod +x /root/restore-lodge-family.sh"
ssh root@$VpsHost "chmod +x /root/setup-backup-cron.sh"
```

### 3. Setup automated backups:
```bash
ssh root@$VpsHost "/root/setup-backup-cron.sh"
```

### 4. Test backup manually:
```bash
ssh root@$VpsHost "/root/backup-lodge-family.sh"
```

## Backup Schedule:
- Daily backups at 2:00 AM
- Weekly backups every Sunday
- Monthly backups on 1st of each month

## Retention Policy:
- Daily: 7 days
- Weekly: 4 weeks  
- Monthly: 12 months

## Restore Usage:
```bash
# List available backups
ssh root@$VpsHost "ls -la /root/backups/daily/"

# Restore from specific backup
ssh root@$VpsHost "/root/restore-lodge-family.sh 20241101_235900"
```

## Backup Locations:
- Daily: /root/backups/daily/
- Weekly: /root/backups/weekly/
- Monthly: /root/backups/monthly/

## What Gets Backed Up:
1. MySQL database (compressed)
2. Application files (tar.gz)
3. Environment files (.env)
4. Nginx configuration
5. SSL certificates (Let's Encrypt)

## Monitoring:
- Check backup logs: `tail -f /var/log/lodge-backup.log`
- Verify cron job: `crontab -l`
"@

$deploymentGuide | Out-File -FilePath "BACKUP_DEPLOYMENT_GUIDE.md" -Encoding UTF8

Write-Host "Backup strategy files created successfully!" -ForegroundColor Green
Write-Host "Files created:" -ForegroundColor Cyan
Write-Host "- backup-lodge-family.sh" -ForegroundColor White
Write-Host "- restore-lodge-family.sh" -ForegroundColor White
Write-Host "- setup-backup-cron.sh" -ForegroundColor White
Write-Host "- BACKUP_DEPLOYMENT_GUIDE.md" -ForegroundColor White

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Review BACKUP_DEPLOYMENT_GUIDE.md for deployment instructions" -ForegroundColor White
Write-Host "2. Upload scripts to VPS and make them executable" -ForegroundColor White
Write-Host "3. Setup cron job for automated daily backups" -ForegroundColor White
Write-Host "4. Test backup and restore procedures" -ForegroundColor White

Write-Host "`nCompleted: $(Get-Date)" -ForegroundColor Gray