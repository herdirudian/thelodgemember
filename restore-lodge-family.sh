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
