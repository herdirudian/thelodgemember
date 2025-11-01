#!/bin/bash

# VPS Setup Script for Lodge Family Application
# This script prepares the VPS for automated GitHub Actions deployment

set -e

echo "🚀 Setting up VPS for Lodge Family Application..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_USER="lodge-family"
APP_DIR="/var/www/lodge-family"
DOMAIN="your-domain.com"  # Replace with your actual domain

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as a regular user with sudo privileges."
   exit 1
fi

print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

print_status "Installing required packages..."
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx ufw fail2ban

# Install Node.js 20
print_status "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
print_status "Installing PM2..."
sudo npm install -g pm2

# Create application user
print_status "Creating application user..."
if ! id "$APP_USER" &>/dev/null; then
    sudo useradd -m -s /bin/bash $APP_USER
    sudo usermod -aG www-data $APP_USER
    print_status "User $APP_USER created"
else
    print_warning "User $APP_USER already exists"
fi

# Create application directories
print_status "Creating application directories..."
sudo mkdir -p $APP_DIR
sudo mkdir -p /var/log/lodge-family
sudo chown -R $APP_USER:www-data $APP_DIR
sudo chown -R $APP_USER:www-data /var/log/lodge-family

# Setup SSH key for deployment user
print_status "Setting up SSH for deployment..."
sudo -u $APP_USER mkdir -p /home/$APP_USER/.ssh
sudo -u $APP_USER chmod 700 /home/$APP_USER/.ssh

print_warning "Please add your GitHub Actions public key to /home/$APP_USER/.ssh/authorized_keys"
print_warning "You can generate this key in your GitHub repository secrets"

# Configure firewall
print_status "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000  # Backend API
sudo ufw allow 3001  # Frontend (if needed)

# Configure fail2ban
print_status "Configuring fail2ban..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create systemd service for backend
print_status "Creating systemd service files..."
sudo tee /etc/systemd/system/lodge-family-backend.service > /dev/null <<EOF
[Unit]
Description=Lodge Family Backend API
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=/var/www/lodge-family-current
ExecStart=/usr/bin/node backend-dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

# Logging
StandardOutput=append:/var/log/lodge-family/backend.log
StandardError=append:/var/log/lodge-family/backend-error.log

[Install]
WantedBy=multi-user.target
EOF

# Create systemd service for frontend
sudo tee /etc/systemd/system/lodge-family-frontend.service > /dev/null <<EOF
[Unit]
Description=Lodge Family Frontend
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=/var/www/lodge-family-current
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3001

# Logging
StandardOutput=append:/var/log/lodge-family/frontend.log
StandardError=append:/var/log/lodge-family/frontend-error.log

[Install]
WantedBy=multi-user.target
EOF

# Create nginx configuration
print_status "Creating nginx configuration..."
sudo tee /etc/nginx/sites-available/lodge-family > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # API routes
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Frontend routes
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Static files
    location /_next/static/ {
        proxy_pass http://localhost:3001;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Enable nginx site
sudo ln -sf /etc/nginx/sites-available/lodge-family /etc/nginx/sites-enabled/
sudo nginx -t

# Remove default nginx site
sudo rm -f /etc/nginx/sites-enabled/default

# Create database directory
print_status "Setting up database directory..."
sudo mkdir -p /var/lib/lodge-family
sudo chown -R $APP_USER:$APP_USER /var/lib/lodge-family

# Create environment file template
print_status "Creating environment file template..."
sudo -u $APP_USER tee /home/$APP_USER/.env.production > /dev/null <<EOF
# Production Environment Variables
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL="file:/var/lib/lodge-family/production.db"

# JWT Secret (CHANGE THIS!)
JWT_SECRET="your-super-secret-jwt-key-change-this"

# API Keys (ADD YOUR ACTUAL KEYS)
XENDIT_SECRET_KEY="your-xendit-secret-key"
WHATSAPP_API_KEY="your-whatsapp-api-key"

# Domain
DOMAIN="$DOMAIN"
FRONTEND_URL="https://$DOMAIN"
BACKEND_URL="https://$DOMAIN/api"
EOF

# Setup log rotation
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/lodge-family > /dev/null <<EOF
/var/log/lodge-family/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $APP_USER $APP_USER
    postrotate
        systemctl reload lodge-family-backend lodge-family-frontend
    endscript
}
EOF

# Create deployment health check script
print_status "Creating health check script..."
sudo tee /usr/local/bin/lodge-family-health-check > /dev/null <<'EOF'
#!/bin/bash

# Health check script for Lodge Family application

check_service() {
    local service=$1
    if systemctl is-active --quiet $service; then
        echo "✅ $service is running"
        return 0
    else
        echo "❌ $service is not running"
        return 1
    fi
}

check_endpoint() {
    local url=$1
    local name=$2
    if curl -f -s $url > /dev/null; then
        echo "✅ $name endpoint is responding"
        return 0
    else
        echo "❌ $name endpoint is not responding"
        return 1
    fi
}

echo "🏥 Lodge Family Health Check"
echo "=========================="

# Check services
check_service "lodge-family-backend"
check_service "lodge-family-frontend"
check_service "nginx"

# Check endpoints
check_endpoint "http://localhost:3000/api/health" "Backend API"
check_endpoint "http://localhost:3001/" "Frontend"

# Check disk space
echo ""
echo "💾 Disk Usage:"
df -h /var/www /var/log/lodge-family

# Check memory usage
echo ""
echo "🧠 Memory Usage:"
free -h

# Check recent logs for errors
echo ""
echo "📋 Recent Errors (last 10 lines):"
tail -n 10 /var/log/lodge-family/backend-error.log 2>/dev/null || echo "No backend errors"
tail -n 10 /var/log/lodge-family/frontend-error.log 2>/dev/null || echo "No frontend errors"
EOF

sudo chmod +x /usr/local/bin/lodge-family-health-check

# Setup cron job for health checks
print_status "Setting up health check cron job..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/lodge-family-health-check >> /var/log/lodge-family/health-check.log 2>&1") | crontab -

# Reload systemd and start nginx
sudo systemctl daemon-reload
sudo systemctl enable nginx
sudo systemctl start nginx

print_status "VPS setup completed! 🎉"
echo ""
print_warning "Next steps:"
echo "1. Add your GitHub Actions SSH public key to /home/$APP_USER/.ssh/authorized_keys"
echo "2. Update /home/$APP_USER/.env.production with your actual environment variables"
echo "3. Configure your domain DNS to point to this server"
echo "4. Run: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN (after DNS is configured)"
echo "5. Test the deployment with: /usr/local/bin/lodge-family-health-check"
echo ""
print_status "GitHub Actions secrets needed:"
echo "- VPS_HOST: $(curl -s ifconfig.me)"
echo "- VPS_USER: $APP_USER"
echo "- VPS_SSH_KEY: (your private SSH key)"