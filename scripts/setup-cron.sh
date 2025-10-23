#!/bin/bash

# Cron Setup Script for The Lodge Family
# Sets up automated tasks for backups, monitoring, and maintenance

set -e

echo "⏰ The Lodge Family - Cron Jobs Setup"
echo "===================================="

# Configuration
PROJECT_DIR="/var/www/thelodgefamily"
SCRIPTS_DIR="$PROJECT_DIR/scripts"
LOG_DIR="$PROJECT_DIR/shared/logs"

# Create log directory if it doesn't exist
mkdir -p $LOG_DIR

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to add cron job if it doesn't exist
add_cron_job() {
    local schedule="$1"
    local command="$2"
    local description="$3"
    
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -F "$command" > /dev/null; then
        log "⚠️  Cron job already exists: $description"
        return 0
    fi
    
    # Add new cron job
    (crontab -l 2>/dev/null; echo "$schedule $command") | crontab -
    log "✅ Added cron job: $description"
    log "   Schedule: $schedule"
    log "   Command: $command"
}

# Function to setup log rotation
setup_logrotate() {
    log "📋 Setting up log rotation..."
    
    # Create logrotate configuration
    sudo tee /etc/logrotate.d/thelodgefamily > /dev/null << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        # Restart PM2 to reopen log files
        sudo -u www-data pm2 reloadLogs
    endscript
}

$PROJECT_DIR/shared/backups/*.log {
    weekly
    missingok
    rotate 12
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
EOF
    
    log "✅ Log rotation configured"
}

# Function to create maintenance script
create_maintenance_script() {
    log "🔧 Creating maintenance script..."
    
    cat > "$SCRIPTS_DIR/maintenance.sh" << 'EOF'
#!/bin/bash

# Daily maintenance script for The Lodge Family
# Performs routine maintenance tasks

set -e

PROJECT_DIR="/var/www/thelodgefamily"
LOG_FILE="$PROJECT_DIR/shared/logs/maintenance.log"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "🔧 Starting daily maintenance..."

# 1. Clean up temporary files
log "🧹 Cleaning temporary files..."
find /tmp -name "*.tmp" -mtime +1 -delete 2>/dev/null || true
find "$PROJECT_DIR" -name "*.log.*" -mtime +7 -delete 2>/dev/null || true

# 2. Clean up old PM2 logs
log "📋 Cleaning PM2 logs..."
pm2 flush

# 3. Update system packages (weekly, on Sundays)
if [ "$(date +%u)" = "7" ]; then
    log "📦 Updating system packages (weekly)..."
    sudo apt update && sudo apt upgrade -y
fi

# 4. Check disk space
log "💾 Checking disk space..."
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    log "⚠️  WARNING: Disk usage is ${DISK_USAGE}%"
    # Send alert (implement your notification method)
fi

# 5. Check memory usage
log "🧠 Checking memory usage..."
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$MEMORY_USAGE" -gt 80 ]; then
    log "⚠️  WARNING: Memory usage is ${MEMORY_USAGE}%"
fi

# 6. Restart PM2 processes if memory usage is high
if [ "$MEMORY_USAGE" -gt 90 ]; then
    log "🔄 High memory usage detected, restarting PM2 processes..."
    pm2 restart all
fi

# 7. Check SSL certificate expiration (if using HTTPS)
if command -v openssl &> /dev/null; then
    CERT_FILE="/etc/ssl/certs/thelodgefamily.crt"
    if [ -f "$CERT_FILE" ]; then
        EXPIRY_DATE=$(openssl x509 -enddate -noout -in "$CERT_FILE" | cut -d= -f2)
        EXPIRY_TIMESTAMP=$(date -d "$EXPIRY_DATE" +%s)
        CURRENT_TIMESTAMP=$(date +%s)
        DAYS_UNTIL_EXPIRY=$(( (EXPIRY_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))
        
        if [ "$DAYS_UNTIL_EXPIRY" -lt 30 ]; then
            log "⚠️  WARNING: SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
        fi
    fi
fi

log "✅ Daily maintenance completed"
EOF

    chmod +x "$SCRIPTS_DIR/maintenance.sh"
    log "✅ Maintenance script created"
}

# Main setup function
main() {
    log "🚀 Setting up cron jobs for The Lodge Family..."
    
    # Ensure scripts are executable
    chmod +x "$SCRIPTS_DIR"/*.sh
    
    # Create maintenance script
    create_maintenance_script
    
    # Setup log rotation
    setup_logrotate
    
    log "📅 Adding cron jobs..."
    
    # 1. Database backup - Daily at 2:00 AM
    add_cron_job \
        "0 2 * * *" \
        "$SCRIPTS_DIR/backup-db.sh backup >> $LOG_DIR/backup.log 2>&1" \
        "Daily database backup"
    
    # 2. Health check - Every 5 minutes
    add_cron_job \
        "*/5 * * * *" \
        "$SCRIPTS_DIR/health-check.sh >> $LOG_DIR/health-check.log 2>&1" \
        "Health check monitoring"
    
    # 3. Daily maintenance - Every day at 3:00 AM
    add_cron_job \
        "0 3 * * *" \
        "$SCRIPTS_DIR/maintenance.sh" \
        "Daily maintenance tasks"
    
    # 4. Weekly backup cleanup - Every Sunday at 4:00 AM
    add_cron_job \
        "0 4 * * 0" \
        "$SCRIPTS_DIR/backup-db.sh cleanup >> $LOG_DIR/backup.log 2>&1" \
        "Weekly backup cleanup"
    
    # 5. PM2 save - Every hour (to save current process list)
    add_cron_job \
        "0 * * * *" \
        "pm2 save" \
        "PM2 process list backup"
    
    # 6. Log rotation check - Daily at 1:00 AM
    add_cron_job \
        "0 1 * * *" \
        "/usr/sbin/logrotate /etc/logrotate.d/thelodgefamily" \
        "Log rotation"
    
    log "✅ Cron jobs setup completed!"
    
    # Show current cron jobs
    log "📋 Current cron jobs:"
    crontab -l | grep -E "(backup-db|health-check|maintenance)" || log "   No related cron jobs found"
}

# Function to remove all cron jobs
remove_cron_jobs() {
    log "🗑️  Removing The Lodge Family cron jobs..."
    
    # Get current crontab without our jobs
    crontab -l 2>/dev/null | grep -v -E "(backup-db|health-check|maintenance|pm2 save)" | crontab -
    
    log "✅ Cron jobs removed"
}

# Function to show current status
show_status() {
    log "📊 Cron Jobs Status:"
    echo ""
    echo "Current cron jobs:"
    crontab -l 2>/dev/null || echo "No cron jobs found"
    echo ""
    echo "Recent log files:"
    ls -la "$LOG_DIR"/*.log 2>/dev/null || echo "No log files found"
    echo ""
    echo "Script permissions:"
    ls -la "$SCRIPTS_DIR"/*.sh 2>/dev/null || echo "No scripts found"
}

# Handle command line arguments
case "${1:-setup}" in
    "setup")
        main
        ;;
    "remove")
        remove_cron_jobs
        ;;
    "status")
        show_status
        ;;
    "test")
        log "🧪 Testing cron jobs..."
        
        # Test backup script
        log "Testing backup script..."
        "$SCRIPTS_DIR/backup-db.sh" backup
        
        # Test health check
        log "Testing health check..."
        "$SCRIPTS_DIR/health-check.sh"
        
        # Test maintenance
        log "Testing maintenance..."
        "$SCRIPTS_DIR/maintenance.sh"
        
        log "✅ All tests completed"
        ;;
    "help")
        echo "Usage: $0 [setup|remove|status|test|help]"
        echo "  setup  - Setup all cron jobs (default)"
        echo "  remove - Remove all cron jobs"
        echo "  status - Show current status"
        echo "  test   - Test all scripts"
        echo "  help   - Show this help"
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac