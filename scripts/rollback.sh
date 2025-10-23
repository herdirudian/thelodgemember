#!/bin/bash

# Rollback Script for The Lodge Family
# Quickly rollback to previous release in case of issues

set -e  # Exit on any error

echo "🔄 Starting rollback process..."

# Configuration
BASE_DIR="/var/www/thelodgefamily"
RELEASES_DIR="$BASE_DIR/releases"
CURRENT_DIR="$BASE_DIR/current"
SHARED_DIR="$BASE_DIR/shared"

# Check if releases directory exists
if [ ! -d "$RELEASES_DIR" ]; then
    echo "❌ Releases directory not found: $RELEASES_DIR"
    echo "💡 This script only works with zero-downtime deployment setup"
    exit 1
fi

# Get current release
CURRENT_RELEASE=$(readlink $CURRENT_DIR | xargs basename)
echo "📍 Current release: $CURRENT_RELEASE"

# Get previous release
PREVIOUS_RELEASE=$(ls -t $RELEASES_DIR | grep -v $CURRENT_RELEASE | head -n 1)

if [ -z "$PREVIOUS_RELEASE" ]; then
    echo "❌ No previous release found!"
    echo "📋 Available releases:"
    ls -la $RELEASES_DIR
    exit 1
fi

echo "⏮️  Previous release: $PREVIOUS_RELEASE"

# Confirm rollback
read -p "🤔 Are you sure you want to rollback to $PREVIOUS_RELEASE? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Rollback cancelled"
    exit 1
fi

# Backup current database before rollback
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
echo "💾 Creating database backup before rollback..."
mysqldump -u thelodge_user -p thelodgefamily > $SHARED_DIR/backups/db_backup_before_rollback_$TIMESTAMP.sql

# Switch symlink to previous release
echo "🔄 Switching to previous release..."
ln -sfn $RELEASES_DIR/$PREVIOUS_RELEASE $CURRENT_DIR

# Reload PM2 processes
echo "🔄 Reloading services..."
pm2 reload ecosystem.config.js --env production

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Health check
echo "🏥 Performing health check..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health || echo "000")
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")

ROLLBACK_SUCCESS=true

if [ $BACKEND_STATUS -eq 200 ]; then
    echo "✅ Backend: OK"
else
    echo "❌ Backend: FAILED ($BACKEND_STATUS)"
    ROLLBACK_SUCCESS=false
fi

if [ $FRONTEND_STATUS -eq 200 ]; then
    echo "✅ Frontend: OK"
else
    echo "❌ Frontend: FAILED ($FRONTEND_STATUS)"
    ROLLBACK_SUCCESS=false
fi

if [ "$ROLLBACK_SUCCESS" = true ]; then
    echo ""
    echo "✅ Rollback completed successfully!"
    echo "📍 Current release: $PREVIOUS_RELEASE"
    echo "📊 Service status:"
    pm2 list
    echo ""
    echo "⚠️  Note: Database was not rolled back automatically"
    echo "💡 If you need to restore database, use:"
    echo "   mysql -u thelodge_user -p thelodgefamily < $SHARED_DIR/backups/db_backup_before_rollback_$TIMESTAMP.sql"
else
    echo ""
    echo "❌ Rollback completed but services are not healthy!"
    echo "🔧 Please check the logs: pm2 logs"
    echo "📊 Service status:"
    pm2 list
fi

echo ""
echo "📝 To view logs: pm2 logs"
echo "📊 To monitor: pm2 monit"