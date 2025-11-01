#!/bin/bash

# Manual Deployment Script for Lodge Family Application
# Use this for manual deployments or as backup to GitHub Actions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_USER="lodge-family"
APP_DIR="/var/www/lodge-family"
BACKUP_DIR="/var/backups/lodge-family"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DEPLOY_DIR="$APP_DIR-$TIMESTAMP"

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

# Check if running as correct user
if [[ "$USER" != "$APP_USER" ]]; then
   print_error "This script should be run as the $APP_USER user"
   print_status "Switch to $APP_USER: sudo su - $APP_USER"
   exit 1
fi

# Function to check if service is running
check_service() {
    local service=$1
    if systemctl is-active --quiet $service; then
        return 0
    else
        return 1
    fi
}

# Function to backup current deployment
backup_current() {
    if [[ -L "/var/www/lodge-family-current" ]]; then
        local current_target=$(readlink /var/www/lodge-family-current)
        print_status "Backing up current deployment: $current_target"
        
        sudo mkdir -p $BACKUP_DIR
        sudo cp -r $current_target $BACKUP_DIR/backup-$TIMESTAMP
        
        # Backup database
        if [[ -f "/var/lib/lodge-family/production.db" ]]; then
            sudo cp /var/lib/lodge-family/production.db $BACKUP_DIR/production-$TIMESTAMP.db
            print_status "Database backed up to $BACKUP_DIR/production-$TIMESTAMP.db"
        fi
    fi
}

# Function to deploy new version
deploy() {
    local source_dir=$1
    
    print_step "Starting deployment to $DEPLOY_DIR"
    
    # Create deployment directory
    sudo mkdir -p $DEPLOY_DIR
    sudo chown $APP_USER:www-data $DEPLOY_DIR
    
    # Copy application files
    print_status "Copying application files..."
    cp -r $source_dir/* $DEPLOY_DIR/
    
    # Install dependencies
    print_status "Installing dependencies..."
    cd $DEPLOY_DIR
    npm install --production
    
    # Setup database
    print_status "Setting up database..."
    npx prisma generate
    npx prisma migrate deploy
    
    # Copy environment file
    if [[ -f "/home/$APP_USER/.env.production" ]]; then
        cp /home/$APP_USER/.env.production $DEPLOY_DIR/.env
        print_status "Environment file copied"
    else
        print_warning "No environment file found at /home/$APP_USER/.env.production"
    fi
    
    # Set permissions
    sudo chown -R $APP_USER:www-data $DEPLOY_DIR
    sudo chmod -R 755 $DEPLOY_DIR
    
    print_status "Deployment directory prepared: $DEPLOY_DIR"
}

# Function to switch to new deployment
switch_deployment() {
    print_step "Switching to new deployment"
    
    # Stop services
    print_status "Stopping services..."
    sudo systemctl stop lodge-family-backend || true
    sudo systemctl stop lodge-family-frontend || true
    
    # Update symlink
    sudo rm -f /var/www/lodge-family-current
    sudo ln -s $DEPLOY_DIR /var/www/lodge-family-current
    
    # Start services
    print_status "Starting services..."
    sudo systemctl start lodge-family-backend
    sudo systemctl start lodge-family-frontend
    
    # Wait for services to start
    sleep 10
    
    # Check if services are running
    if check_service "lodge-family-backend" && check_service "lodge-family-frontend"; then
        print_status "✅ Services started successfully"
    else
        print_error "❌ Services failed to start"
        return 1
    fi
}

# Function to test deployment
test_deployment() {
    print_step "Testing deployment"
    
    # Test backend API
    if curl -f -s http://localhost:3000/api/health > /dev/null; then
        print_status "✅ Backend API is responding"
    else
        print_error "❌ Backend API is not responding"
        return 1
    fi
    
    # Test frontend
    if curl -f -s http://localhost:3001/ > /dev/null; then
        print_status "✅ Frontend is responding"
    else
        print_error "❌ Frontend is not responding"
        return 1
    fi
    
    print_status "✅ All tests passed"
}

# Function to cleanup old deployments
cleanup_old_deployments() {
    print_step "Cleaning up old deployments"
    
    cd /var/www
    # Keep last 3 deployments
    local old_deployments=$(ls -dt lodge-family-* 2>/dev/null | tail -n +4)
    
    if [[ -n "$old_deployments" ]]; then
        echo "$old_deployments" | while read dir; do
            if [[ "$dir" != "lodge-family-current" ]]; then
                print_status "Removing old deployment: $dir"
                sudo rm -rf "$dir"
            fi
        done
    else
        print_status "No old deployments to clean up"
    fi
}

# Function to rollback to previous deployment
rollback() {
    print_step "Rolling back to previous deployment"
    
    # Find previous deployment
    local prev_deploy=$(ls -dt /var/www/lodge-family-* 2>/dev/null | grep -v current | head -n 1)
    
    if [[ -n "$prev_deploy" ]]; then
        print_status "Rolling back to: $prev_deploy"
        
        # Stop services
        sudo systemctl stop lodge-family-backend || true
        sudo systemctl stop lodge-family-frontend || true
        
        # Update symlink
        sudo rm -f /var/www/lodge-family-current
        sudo ln -s $prev_deploy /var/www/lodge-family-current
        
        # Start services
        sudo systemctl start lodge-family-backend
        sudo systemctl start lodge-family-frontend
        
        print_status "✅ Rollback completed"
    else
        print_error "No previous deployment found for rollback"
        return 1
    fi
}

# Main deployment function
main_deploy() {
    local source_dir=$1
    
    if [[ ! -d "$source_dir" ]]; then
        print_error "Source directory not found: $source_dir"
        exit 1
    fi
    
    print_status "🚀 Starting deployment from: $source_dir"
    
    # Backup current deployment
    backup_current
    
    # Deploy new version
    deploy $source_dir
    
    # Switch to new deployment
    if switch_deployment; then
        # Test deployment
        if test_deployment; then
            print_status "🎉 Deployment successful!"
            
            # Cleanup old deployments
            cleanup_old_deployments
            
            print_status "Deployment completed at: $(date)"
            print_status "Deployment directory: $DEPLOY_DIR"
        else
            print_error "Deployment tests failed, rolling back..."
            rollback
            exit 1
        fi
    else
        print_error "Failed to switch deployment, rolling back..."
        rollback
        exit 1
    fi
}

# Script usage
usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  deploy <source_dir>  Deploy from source directory"
    echo "  rollback            Rollback to previous deployment"
    echo "  status              Show deployment status"
    echo "  logs                Show recent logs"
    echo "  health              Run health check"
    echo ""
    echo "Examples:"
    echo "  $0 deploy /tmp/lodge-family-build"
    echo "  $0 rollback"
    echo "  $0 status"
}

# Command handling
case "${1:-}" in
    "deploy")
        if [[ -z "${2:-}" ]]; then
            print_error "Source directory required for deploy command"
            usage
            exit 1
        fi
        main_deploy "$2"
        ;;
    "rollback")
        rollback
        ;;
    "status")
        print_status "Current deployment:"
        if [[ -L "/var/www/lodge-family-current" ]]; then
            readlink /var/www/lodge-family-current
        else
            echo "No current deployment"
        fi
        
        print_status "Service status:"
        systemctl status lodge-family-backend --no-pager -l
        systemctl status lodge-family-frontend --no-pager -l
        ;;
    "logs")
        print_status "Recent backend logs:"
        tail -n 20 /var/log/lodge-family/backend.log
        
        print_status "Recent frontend logs:"
        tail -n 20 /var/log/lodge-family/frontend.log
        ;;
    "health")
        /usr/local/bin/lodge-family-health-check
        ;;
    *)
        usage
        exit 1
        ;;
esac