#!/bin/bash

# Final Deployment Fix Script for The Lodge Family
# This script addresses all identified issues from localhost to VPS deployment

set -e  # Exit on any error

echo "🚀 Starting final deployment fix for The Lodge Family..."
echo "📅 $(date)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
    print_warning "Running as root. This is not recommended for application deployment."
fi

# Set project directory
PROJECT_DIR="/var/www/thelodgefamily/current"
BACKUP_DIR="/var/www/thelodgefamily/backups/$(date +%Y%m%d_%H%M%S)"

print_step "1. Creating backup..."
mkdir -p "$BACKUP_DIR"
if [ -d "$PROJECT_DIR" ]; then
    cp -r "$PROJECT_DIR" "$BACKUP_DIR/project_backup"
    print_status "Backup created at $BACKUP_DIR"
else
    print_warning "Project directory not found. Skipping backup."
fi

print_step "2. Stopping existing PM2 processes..."
pm2 stop all || print_warning "No PM2 processes to stop"
pm2 delete all || print_warning "No PM2 processes to delete"

print_step "3. Navigating to project directory..."
cd "$PROJECT_DIR" || {
    print_error "Project directory not found: $PROJECT_DIR"
    exit 1
}

print_step "4. Setting up environment files..."
# Backend environment
if [ -f "backend/.env.vps" ]; then
    cp backend/.env.vps backend/.env
    print_status "Backend environment configured"
else
    print_error "Backend .env.vps not found"
    exit 1
fi

# Frontend environment
if [ -f "frontend/.env.production" ]; then
    cp frontend/.env.production frontend/.env.local
    print_status "Frontend environment configured"
else
    print_warning "Frontend .env.production not found, creating one..."
    cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=https://family.thelodgegroup.id
NEXT_PUBLIC_XENDIT_PUBLIC_KEY=xnd_public_development_ZmDaRXsyswaNKu1JOxiNKxy79NZ4YGMi7tvvL66Z2I6zWqAecypFh2EadYmzGfc
NODE_ENV=production
EOF
    print_status "Frontend environment created"
fi

print_step "5. Installing backend dependencies..."
cd backend
npm ci --production
if [ $? -eq 0 ]; then
    print_status "Backend dependencies installed"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi

print_step "6. Installing frontend dependencies..."
cd ../frontend
npm ci
if [ $? -eq 0 ]; then
    print_status "Frontend dependencies installed"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi

print_step "7. Building frontend..."
npm run build
if [ $? -eq 0 ]; then
    print_status "Frontend built successfully"
else
    print_error "Failed to build frontend"
    exit 1
fi

print_step "8. Setting up database..."
cd ../backend
npx prisma generate
if [ $? -eq 0 ]; then
    print_status "Prisma client generated"
else
    print_error "Failed to generate Prisma client"
    exit 1
fi

npx prisma db push
if [ $? -eq 0 ]; then
    print_status "Database schema updated"
else
    print_warning "Database push failed - check database connection"
fi

print_step "9. Setting file permissions..."
cd ..
chown -R www-data:www-data . || print_warning "Could not set www-data ownership"
chmod -R 755 . || print_warning "Could not set file permissions"

print_step "10. Starting PM2 processes..."
pm2 start ecosystem.config.js --env production
if [ $? -eq 0 ]; then
    print_status "PM2 processes started"
else
    print_error "Failed to start PM2 processes"
    exit 1
fi

print_step "11. Configuring Nginx..."
# Check if nginx config exists and test it
if [ -f "nginx-family-domain-fixed.conf" ]; then
    sudo cp nginx-family-domain-fixed.conf /etc/nginx/sites-available/family.thelodgegroup.id
    sudo ln -sf /etc/nginx/sites-available/family.thelodgegroup.id /etc/nginx/sites-enabled/
    
    # Test nginx configuration
    sudo nginx -t
    if [ $? -eq 0 ]; then
        print_status "Nginx configuration is valid"
        sudo systemctl reload nginx
        print_status "Nginx reloaded"
    else
        print_error "Nginx configuration test failed"
        exit 1
    fi
else
    print_warning "Nginx configuration file not found"
fi

print_step "12. Running health checks..."
sleep 5  # Wait for services to start

# Check PM2 status
print_status "PM2 Status:"
pm2 status

# Check if backend is responding
print_status "Testing backend health..."
curl -f http://localhost:5001/api/health || print_warning "Backend health check failed"

# Check if frontend is responding
print_status "Testing frontend health..."
curl -f http://localhost:3000 || print_warning "Frontend health check failed"

print_step "13. Final verification..."
echo ""
print_status "🎉 Deployment completed successfully!"
echo ""
print_status "📊 Service Status:"
pm2 status
echo ""
print_status "📝 Next steps:"
echo "   1. Test the application: https://family.thelodgegroup.id"
echo "   2. Monitor logs: pm2 logs"
echo "   3. Check Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo ""
print_status "🔍 Troubleshooting commands:"
echo "   - Check PM2 logs: pm2 logs"
echo "   - Restart services: pm2 restart all"
echo "   - Check Nginx: sudo nginx -t && sudo systemctl status nginx"
echo "   - Check database: cd backend && node test-env.js"
echo ""
print_status "📞 If issues persist, check the DEPLOYMENT-FIXES.md documentation"

# Save deployment info
cat > deployment-info.txt << EOF
Deployment completed: $(date)
PM2 Status: $(pm2 jlist)
Nginx Status: $(sudo systemctl is-active nginx)
Backend URL: http://localhost:5001
Frontend URL: http://localhost:3000
Public URL: https://family.thelodgegroup.id
EOF

print_status "✅ Deployment information saved to deployment-info.txt"
echo ""
print_status "🚀 The Lodge Family is now deployed and ready!"