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
