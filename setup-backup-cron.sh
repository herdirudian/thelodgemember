#!/bin/bash
# Setup cron job for automated backups

(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-lodge-family.sh >> /var/log/lodge-backup.log 2>&1") | crontab -

echo "Cron job added successfully"
echo "Backup will run daily at 2:00 AM"
