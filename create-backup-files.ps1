# Lodge Family Backup Files Generator - Simplified

Write-Host "LODGE FAMILY - BACKUP FILES GENERATOR" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow
Write-Host "Started: $(Get-Date)" -ForegroundColor Gray

# Create main backup script
$backupContent = @'
#!/bin/bash
# Lodge Family Automated Backup Script

BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/root/lodge-family"
DB_NAME="lodge_family_db"

mkdir -p $BACKUP_DIR/daily
mkdir -p $BACKUP_DIR/weekly
mkdir -p $BACKUP_DIR/monthly

echo "Starting backup process at $(date)"

# Database Backup
echo "Backing up database..."
mysqldump -u root -p$MYSQL_ROOT_PASSWORD $DB_NAME > $BACKUP_DIR/daily/db_backup_$DATE.sql
gzip $BACKUP_DIR/daily/db_backup_$DATE.sql

# Application Files Backup
echo "Backing up application files..."
tar -czf $BACKUP_DIR/daily/app_backup_$DATE.tar.gz -C /root lodge-family

# Environment Files Backup
echo "Backing up environment files..."
mkdir -p $BACKUP_DIR/daily/env_$DATE
cp $APP_DIR/backend/.env* $BACKUP_DIR/daily/env_$DATE/ 2>/dev/null || true
tar -czf $BACKUP_DIR/daily/env_backup_$DATE.tar.gz -C $BACKUP_DIR/daily env_$DATE
rm -rf $BACKUP_DIR/daily/env_$DATE

# Cleanup old backups (keep 7 days)
find $BACKUP_DIR/daily -name "*.gz" -mtime +7 -delete
find $BACKUP_DIR/daily -name "*.tar.gz" -mtime +7 -delete

echo "Backup process completed at $(date)"
'@

# Create restore script
$restoreContent = @'
#!/bin/bash
# Lodge Family Restore Script

BACKUP_DIR="/root/backups"
APP_DIR="/root/lodge-family"

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_date>"
    echo "Available backups:"
    ls -la $BACKUP_DIR/daily/ | grep backup
    exit 1
fi

BACKUP_DATE=$1
DB_NAME="lodge_family_db"

echo "Starting restore process for backup: $BACKUP_DATE"

# Stop services
systemctl stop nginx
pkill -f "node"

# Restore database
gunzip -c $BACKUP_DIR/daily/db_backup_$BACKUP_DATE.sql.gz | mysql -u root -p$MYSQL_ROOT_PASSWORD $DB_NAME

# Restore application files
mv $APP_DIR $APP_DIR.backup
tar -xzf $BACKUP_DIR/daily/app_backup_$BACKUP_DATE.tar.gz -C /root

# Start services
cd $APP_DIR/backend && npm install
cd $APP_DIR/frontend && npm install
systemctl start nginx

echo "Restore process completed"
'@

# Create cron setup script
$cronContent = @'
#!/bin/bash
# Setup cron job for automated backups

(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-lodge-family.sh >> /var/log/lodge-backup.log 2>&1") | crontab -

echo "Cron job added successfully"
echo "Backup will run daily at 2:00 AM"
'@

Write-Host "Creating backup files..." -ForegroundColor Cyan

# Write files
$backupContent | Out-File -FilePath "backup-lodge-family.sh" -Encoding UTF8
$restoreContent | Out-File -FilePath "restore-lodge-family.sh" -Encoding UTF8  
$cronContent | Out-File -FilePath "setup-backup-cron.sh" -Encoding UTF8

Write-Host "Backup files created successfully!" -ForegroundColor Green
Write-Host "Files created:" -ForegroundColor Cyan
Write-Host "- backup-lodge-family.sh" -ForegroundColor White
Write-Host "- restore-lodge-family.sh" -ForegroundColor White
Write-Host "- setup-backup-cron.sh" -ForegroundColor White

Write-Host "`nDeployment Commands:" -ForegroundColor Yellow
Write-Host "1. Upload to VPS:" -ForegroundColor White
Write-Host "   scp *.sh root@31.97.51.129:/root/" -ForegroundColor Gray
Write-Host "2. Make executable:" -ForegroundColor White
Write-Host "   ssh root@31.97.51.129 'chmod +x /root/*.sh'" -ForegroundColor Gray
Write-Host "3. Setup cron:" -ForegroundColor White
Write-Host "   ssh root@31.97.51.129 '/root/setup-backup-cron.sh'" -ForegroundColor Gray

Write-Host "`nCompleted: $(Get-Date)" -ForegroundColor Gray