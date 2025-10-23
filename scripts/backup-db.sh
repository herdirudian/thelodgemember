#!/bin/bash

# Database Backup Script for The Lodge Family
# Creates automated database backups with rotation

set -e  # Exit on any error

echo "💾 The Lodge Family - Database Backup"
echo "====================================="

# Configuration
DB_USER="thelodge_user"
DB_NAME="thelodgefamily"
BACKUP_DIR="/var/www/thelodgefamily/shared/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="db_backup_$TIMESTAMP.sql"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"

# Retention settings
KEEP_DAILY=7      # Keep daily backups for 7 days
KEEP_WEEKLY=4     # Keep weekly backups for 4 weeks
KEEP_MONTHLY=6    # Keep monthly backups for 6 months

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to get database size
get_db_size() {
    mysql -u $DB_USER -p$DB_PASS -e "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size_MB' FROM information_schema.tables WHERE table_schema='$DB_NAME';" 2>/dev/null | tail -n 1
}

# Function to compress backup
compress_backup() {
    local file=$1
    log "🗜️  Compressing backup..."
    gzip "$file"
    echo "${file}.gz"
}

# Function to cleanup old backups
cleanup_backups() {
    log "🧹 Cleaning up old backups..."
    
    cd $BACKUP_DIR
    
    # Keep daily backups (last 7 days)
    log "   Cleaning daily backups (keeping last $KEEP_DAILY days)..."
    find . -name "db_backup_*.sql.gz" -mtime +$KEEP_DAILY -delete 2>/dev/null || true
    
    # Keep weekly backups (every Sunday, last 4 weeks)
    log "   Organizing weekly backups..."
    for week in $(seq 1 $KEEP_WEEKLY); do
        week_start=$(date -d "last sunday - $((week-1)) weeks" +%Y%m%d)
        week_end=$(date -d "last sunday - $((week-2)) weeks" +%Y%m%d)
        
        # Find the latest backup from that week
        latest_weekly=$(find . -name "db_backup_${week_start}*.sql.gz" -o -name "db_backup_${week_end}*.sql.gz" | sort | tail -n 1)
        
        if [ -n "$latest_weekly" ]; then
            # Rename to weekly backup
            weekly_name="db_weekly_backup_${week_start}.sql.gz"
            if [ ! -f "$weekly_name" ] && [ "$latest_weekly" != "./$weekly_name" ]; then
                cp "$latest_weekly" "$weekly_name" 2>/dev/null || true
            fi
        fi
    done
    
    # Keep monthly backups (first backup of each month, last 6 months)
    log "   Organizing monthly backups..."
    for month in $(seq 1 $KEEP_MONTHLY); do
        month_date=$(date -d "$(date +%Y-%m-01) - $((month-1)) months" +%Y%m)
        
        # Find the first backup from that month
        first_monthly=$(find . -name "db_backup_${month_date}*.sql.gz" | sort | head -n 1)
        
        if [ -n "$first_monthly" ]; then
            # Rename to monthly backup
            monthly_name="db_monthly_backup_${month_date}.sql.gz"
            if [ ! -f "$monthly_name" ] && [ "$first_monthly" != "./$monthly_name" ]; then
                cp "$first_monthly" "$monthly_name" 2>/dev/null || true
            fi
        fi
    done
    
    # Remove old weekly backups
    find . -name "db_weekly_backup_*.sql.gz" -mtime +$((KEEP_WEEKLY * 7)) -delete 2>/dev/null || true
    
    # Remove old monthly backups
    find . -name "db_monthly_backup_*.sql.gz" -mtime +$((KEEP_MONTHLY * 30)) -delete 2>/dev/null || true
    
    log "✅ Cleanup completed"
}

# Function to verify backup
verify_backup() {
    local backup_file=$1
    log "🔍 Verifying backup integrity..."
    
    # Check if file exists and is not empty
    if [ ! -s "$backup_file" ]; then
        log "❌ Backup file is empty or doesn't exist!"
        return 1
    fi
    
    # Check if it's a valid SQL file (basic check)
    if file "$backup_file" | grep -q "gzip compressed"; then
        # It's compressed, check the compressed content
        if zcat "$backup_file" | head -n 5 | grep -q "MySQL dump"; then
            log "✅ Backup verification passed"
            return 0
        fi
    elif head -n 5 "$backup_file" | grep -q "MySQL dump"; then
        log "✅ Backup verification passed"
        return 0
    fi
    
    log "❌ Backup verification failed!"
    return 1
}

# Function to send notification (optional)
send_notification() {
    local status=$1
    local message=$2
    
    # You can implement notification here (email, Slack, etc.)
    # Example for email (requires mailutils):
    # echo "$message" | mail -s "Database Backup $status" admin@yourdomain.com
    
    log "📧 Notification: $status - $message"
}

# Main backup process
main() {
    log "🚀 Starting database backup process..."
    
    # Get database size before backup
    DB_SIZE=$(get_db_size)
    log "📊 Database size: ${DB_SIZE}MB"
    
    # Check available disk space
    AVAILABLE_SPACE=$(df $BACKUP_DIR | awk 'NR==2 {print $4}')
    AVAILABLE_SPACE_MB=$((AVAILABLE_SPACE / 1024))
    
    log "💾 Available disk space: ${AVAILABLE_SPACE_MB}MB"
    
    if [ "$AVAILABLE_SPACE_MB" -lt "$((DB_SIZE * 3))" ]; then
        log "⚠️  Warning: Low disk space! Available: ${AVAILABLE_SPACE_MB}MB, Recommended: $((DB_SIZE * 3))MB"
    fi
    
    # Create backup
    log "📥 Creating database backup..."
    log "   Source: $DB_NAME"
    log "   Destination: $BACKUP_PATH"
    
    if mysqldump -u $DB_USER -p$DB_PASS \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --add-drop-database \
        --databases $DB_NAME > "$BACKUP_PATH"; then
        
        log "✅ Database backup created successfully"
        
        # Get backup file size
        BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
        log "📊 Backup size: $BACKUP_SIZE"
        
        # Compress backup
        COMPRESSED_BACKUP=$(compress_backup "$BACKUP_PATH")
        COMPRESSED_SIZE=$(du -h "$COMPRESSED_BACKUP" | cut -f1)
        log "📊 Compressed size: $COMPRESSED_SIZE"
        
        # Verify backup
        if verify_backup "$COMPRESSED_BACKUP"; then
            log "✅ Backup verification successful"
            
            # Cleanup old backups
            cleanup_backups
            
            # Success notification
            send_notification "SUCCESS" "Database backup completed successfully. Size: $COMPRESSED_SIZE"
            
            log "🎉 Backup process completed successfully!"
            log "📁 Backup location: $COMPRESSED_BACKUP"
            
        else
            log "❌ Backup verification failed!"
            send_notification "FAILED" "Database backup verification failed"
            exit 1
        fi
        
    else
        log "❌ Database backup failed!"
        send_notification "FAILED" "Database backup creation failed"
        exit 1
    fi
}

# Show backup statistics
show_stats() {
    log "📊 Backup Statistics:"
    log "   Total backups: $(find $BACKUP_DIR -name "*.sql.gz" | wc -l)"
    log "   Total size: $(du -sh $BACKUP_DIR | cut -f1)"
    log "   Latest backup: $(find $BACKUP_DIR -name "db_backup_*.sql.gz" | sort | tail -n 1 | xargs basename)"
}

# Handle command line arguments
case "${1:-backup}" in
    "backup")
        main
        show_stats
        ;;
    "cleanup")
        log "🧹 Running cleanup only..."
        cleanup_backups
        show_stats
        ;;
    "stats")
        show_stats
        ;;
    "help")
        echo "Usage: $0 [backup|cleanup|stats|help]"
        echo "  backup  - Create new backup (default)"
        echo "  cleanup - Clean up old backups only"
        echo "  stats   - Show backup statistics"
        echo "  help    - Show this help"
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac