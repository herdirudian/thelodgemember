#!/bin/bash

# Zero-Downtime Deployment Script for The Lodge Family
# Uses symlink strategy to achieve zero-downtime updates

set -e  # Exit on any error

echo "🚀 Starting zero-downtime deployment..."

# Configuration
BASE_DIR="/var/www/thelodgefamily"
RELEASES_DIR="$BASE_DIR/releases"
SHARED_DIR="$BASE_DIR/shared"
CURRENT_DIR="$BASE_DIR/current"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RELEASE_DIR="$RELEASES_DIR/$TIMESTAMP"
REPO_URL="https://github.com/yourusername/thelodgefamily.git"  # Update this!

# Create directories if they don't exist
mkdir -p $RELEASES_DIR
mkdir -p $SHARED_DIR/{logs,uploads,backups}

# Backup current database
echo "💾 Creating database backup..."
mysqldump -u thelodge_user -p thelodgefamily > $SHARED_DIR/backups/db_backup_$TIMESTAMP.sql
echo "✅ Database backup created: db_backup_$TIMESTAMP.sql"

# Create new release directory
echo "📁 Creating new release directory..."
mkdir -p $RELEASE_DIR

# Clone latest code
echo "📥 Cloning latest code..."
git clone $REPO_URL $RELEASE_DIR
cd $RELEASE_DIR

# Link shared files and directories
echo "🔗 Linking shared files..."
ln -sf $SHARED_DIR/.env $RELEASE_DIR/backend/.env
ln -sf $SHARED_DIR/uploads $RELEASE_DIR/backend/uploads
ln -sf $SHARED_DIR/logs $RELEASE_DIR/logs

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd $RELEASE_DIR/backend
npm install --production

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd $RELEASE_DIR/frontend
npm install --production

# Build frontend
echo "🏗️ Building frontend..."
npm run build

# Update database schema (if needed)
echo "🗄️ Updating database schema..."
cd $RELEASE_DIR/backend
npx prisma db push

# Generate Prisma client
npx prisma generate

# Test the new release (basic syntax check)
echo "🧪 Testing new release..."
cd $RELEASE_DIR/backend
node -c src/index.ts || node -pe "require('./src/index.js')" > /dev/null

# Switch symlink atomically (this is the zero-downtime moment)
echo "🔄 Switching to new release..."
ln -sfn $RELEASE_DIR $CURRENT_DIR

# Reload PM2 processes (graceful restart)
echo "🔄 Reloading services..."
pm2 reload ecosystem.config.js --env production

# Wait for services to stabilize
echo "⏳ Waiting for services to stabilize..."
sleep 15

# Health check
echo "🏥 Performing health check..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health || echo "000")
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")

# Verify deployment success
DEPLOYMENT_SUCCESS=true

if [ $BACKEND_STATUS -eq 200 ]; then
    echo "✅ Backend: OK"
else
    echo "❌ Backend: FAILED ($BACKEND_STATUS)"
    DEPLOYMENT_SUCCESS=false
fi

if [ $FRONTEND_STATUS -eq 200 ]; then
    echo "✅ Frontend: OK"
else
    echo "❌ Frontend: FAILED ($FRONTEND_STATUS)"
    DEPLOYMENT_SUCCESS=false
fi

# If deployment failed, rollback
if [ "$DEPLOYMENT_SUCCESS" = false ]; then
    echo "🚨 Deployment failed! Rolling back..."
    
    # Get previous release
    PREVIOUS_RELEASE=$(ls -t $RELEASES_DIR | sed -n '2p')
    
    if [ -n "$PREVIOUS_RELEASE" ]; then
        echo "🔄 Rolling back to: $PREVIOUS_RELEASE"
        ln -sfn $RELEASES_DIR/$PREVIOUS_RELEASE $CURRENT_DIR
        pm2 reload ecosystem.config.js --env production
        
        # Remove failed release
        rm -rf $RELEASE_DIR
        
        echo "❌ Deployment failed and rolled back!"
        exit 1
    else
        echo "❌ No previous release found for rollback!"
        exit 1
    fi
fi

# Cleanup old releases (keep last 5)
echo "🧹 Cleaning up old releases..."
cd $RELEASES_DIR
ls -t | tail -n +6 | xargs rm -rf 2>/dev/null || true

# Cleanup old database backups (keep last 10)
cd $SHARED_DIR/backups
ls -t db_backup_*.sql | tail -n +11 | xargs rm -f 2>/dev/null || true

echo ""
echo "✅ Zero-downtime deployment completed successfully!"
echo "🎯 Current release: $TIMESTAMP"
echo "📊 Service status:"
pm2 list
echo ""
echo "📝 To view logs: pm2 logs"
echo "📊 To monitor: pm2 monit"
echo "🔄 To rollback: ./scripts/rollback.sh"