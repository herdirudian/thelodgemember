#!/bin/bash

# Simple Update Script for The Lodge Family
# This script will have a brief downtime during update

set -e  # Exit on any error

echo "🚀 Starting deployment..."
echo "⚠️  This will cause a brief downtime"

# Configuration
PROJECT_DIR="/var/www/thelodgefamily"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Navigate to project directory
cd $PROJECT_DIR

# Backup current database
echo "💾 Creating database backup..."
mysqldump -u thelodge_user -p thelodgefamily > $BACKUP_DIR/db_backup_$TIMESTAMP.sql
echo "✅ Database backup created: db_backup_$TIMESTAMP.sql"

# Stop services to prevent conflicts
echo "🛑 Stopping services..."
pm2 stop all

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install --production

# Install frontend dependencies and build
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install --production

# Build frontend
echo "🏗️ Building frontend..."
npm run build

# Update database schema
echo "🗄️ Updating database schema..."
cd ../backend
npx prisma db push

# Generate Prisma client
npx prisma generate

# Start services
echo "🔄 Starting services..."
pm2 start ecosystem.config.js --env production

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Health check
echo "🏥 Performing health check..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health || echo "000")
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")

if [ $BACKEND_STATUS -eq 200 ]; then
    echo "✅ Backend: OK"
else
    echo "❌ Backend: FAILED ($BACKEND_STATUS)"
    echo "🔄 Attempting to restart backend..."
    pm2 restart thelodge-backend
fi

if [ $FRONTEND_STATUS -eq 200 ]; then
    echo "✅ Frontend: OK"
else
    echo "❌ Frontend: FAILED ($FRONTEND_STATUS)"
    echo "🔄 Attempting to restart frontend..."
    pm2 restart thelodge-frontend
fi

# Cleanup old backups (keep last 10)
echo "🧹 Cleaning up old backups..."
cd $BACKUP_DIR
ls -t db_backup_*.sql | tail -n +11 | xargs rm -f 2>/dev/null || true

echo ""
echo "✅ Deployment completed successfully!"
echo "📊 Service status:"
pm2 list
echo ""
echo "📝 To view logs: pm2 logs"
echo "📊 To monitor: pm2 monit"