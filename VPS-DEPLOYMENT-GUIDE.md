# The Lodge Family - VPS Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying The Lodge Family application to your VPS hosting environment.

## Prerequisites

### VPS Requirements
- **Operating System**: Ubuntu 20.04 LTS or newer
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 20GB free space
- **Network**: Public IP with domain pointing to it
- **Access**: SSH access with sudo privileges

### Local Requirements
- SSH client (OpenSSH, PuTTY, or Git Bash)
- rsync (for file synchronization)
- PowerShell 5.0+ (for Windows deployment script)

### Domain Configuration
- Domain: `family.thelodgegroup.id`
- DNS A record pointing to VPS IP address
- DNS propagation completed (check with `nslookup family.thelodgegroup.id`)

## Quick Deployment (Automated)

### Option 1: PowerShell Script (Windows)
```powershell
# Navigate to project directory
cd C:\xampp\htdocs\newthelodgefamily

# Run deployment script
.\scripts\Deploy-ToVPS.ps1 -VPSUser "your-username" -VPSHost "family.thelodgegroup.id"

# For test mode (no actual changes)
.\scripts\Deploy-ToVPS.ps1 -VPSUser "your-username" -TestOnly
```

### Option 2: Bash Script (Linux/macOS/WSL)
```bash
# Navigate to project directory
cd /path/to/newthelodgefamily

# Make script executable
chmod +x scripts/deploy-to-vps.sh

# Run deployment script
./scripts/deploy-to-vps.sh -u your-username -h family.thelodgegroup.id

# For test mode
./scripts/deploy-to-vps.sh -u your-username -t
```

## Manual Deployment Steps

### Step 1: Prepare VPS Environment

#### 1.1 Connect to VPS
```bash
ssh your-username@family.thelodgegroup.id
```

#### 1.2 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

#### 1.3 Install Node.js 18.x
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

#### 1.4 Install Required Services
```bash
# Install Nginx, MySQL, and PM2
sudo apt install -y nginx mysql-server
sudo npm install -g pm2

# Enable services
sudo systemctl enable nginx mysql
sudo systemctl start nginx mysql
```

### Step 2: Upload Application Files

#### 2.1 Create Deployment Directory
```bash
sudo mkdir -p /var/www/html
sudo chown -R $USER:$USER /var/www/html
```

#### 2.2 Upload Files (from local machine)
```bash
# Using rsync (recommended)
rsync -avz --delete deployment-packages/thelodgefamily-final-deployment-20251027_210438/ your-username@family.thelodgegroup.id:/var/www/html/

# Or using scp
scp -r deployment-packages/thelodgefamily-final-deployment-20251027_210438/* your-username@family.thelodgegroup.id:/var/www/html/
```

### Step 3: Configure Database

#### 3.1 Secure MySQL Installation
```bash
sudo mysql_secure_installation
```

#### 3.2 Create Database and User
```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE thelodgefamily;
CREATE USER 'lodge_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON thelodgefamily.* TO 'lodge_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 4: Configure Environment Variables

#### 4.1 Backend Environment
```bash
cd /var/www/html/backend
cp .env.example .env
nano .env
```

Update `.env` with production values:
```env
# Database
DATABASE_URL="mysql://lodge_user:your_secure_password@localhost:3306/thelodgefamily"

# Server
PORT=5001
NODE_ENV=production

# JWT
JWT_SECRET="your_jwt_secret_key_here"

# Email (if using)
SMTP_HOST="your_smtp_host"
SMTP_PORT=587
SMTP_USER="your_email@domain.com"
SMTP_PASS="your_email_password"

# Xendit Payment
XENDIT_SECRET_KEY="your_xendit_secret_key"
XENDIT_PUBLIC_KEY="your_xendit_public_key"

# Domain
FRONTEND_URL="https://family.thelodgegroup.id"
BACKEND_URL="https://family.thelodgegroup.id"
```

#### 4.2 Frontend Environment
```bash
cd /var/www/html/frontend
nano .env.local
```

```env
NEXT_PUBLIC_API_URL=https://family.thelodgegroup.id/api
NEXT_PUBLIC_FRONTEND_URL=https://family.thelodgegroup.id
NODE_ENV=production
```

### Step 5: Install Dependencies and Setup Database

#### 5.1 Install Backend Dependencies
```bash
cd /var/www/html/backend
npm install --production
```

#### 5.2 Setup Database Schema
```bash
npx prisma generate
npx prisma migrate deploy
```

#### 5.3 Install Frontend Dependencies
```bash
cd /var/www/html/frontend
npm install --production
npm run build
```

### Step 6: Configure Nginx

#### 6.1 Copy Nginx Configuration
```bash
sudo cp /var/www/html/nginx-family-domain-fixed.conf /etc/nginx/sites-available/family.thelodgegroup.id
```

#### 6.2 Enable Site
```bash
sudo ln -sf /etc/nginx/sites-available/family.thelodgegroup.id /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

#### 6.3 Test and Reload Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7: Setup SSL Certificate

#### 7.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

#### 7.2 Obtain SSL Certificate
```bash
sudo certbot --nginx -d family.thelodgegroup.id --email admin@thelodgegroup.id --agree-tos --non-interactive
```

#### 7.3 Test SSL Renewal
```bash
sudo certbot renew --dry-run
```

### Step 8: Deploy Application with PM2

#### 8.1 Start Application
```bash
cd /var/www/html
pm2 start ecosystem.config.js
```

#### 8.2 Save PM2 Configuration
```bash
pm2 save
pm2 startup
# Follow the instructions provided by PM2 startup command
```

### Step 9: Set File Permissions

```bash
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
sudo chmod -R 777 /var/www/html/backend/public/files
```

### Step 10: Verify Deployment

#### 10.1 Check Services Status
```bash
sudo systemctl status nginx
sudo systemctl status mysql
pm2 status
```

#### 10.2 Test Endpoints
```bash
# Test frontend
curl -I https://family.thelodgegroup.id

# Test API
curl -I https://family.thelodgegroup.id/api/health

# Test admin panel
curl -I https://family.thelodgegroup.id/admin
```

#### 10.3 Check Logs
```bash
# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Post-Deployment Configuration

### Create Admin User
```bash
cd /var/www/html/backend
node create-admin.js
```

### Setup Monitoring
```bash
# Install monitoring scripts
chmod +x scripts/*.sh

# Run health check
./scripts/monitor-deployment.sh --status
```

### Setup Automated Backups
```bash
# Create backup script
crontab -e

# Add daily backup at 2 AM
0 2 * * * /var/www/html/scripts/backup-db.sh
```

## Troubleshooting

### Common Issues

#### 1. Application Not Starting
```bash
# Check PM2 logs
pm2 logs

# Restart application
pm2 restart all

# Check environment variables
cd /var/www/html/backend && node -e "console.log(process.env)"
```

#### 2. Database Connection Issues
```bash
# Test database connection
mysql -u lodge_user -p thelodgefamily

# Check database service
sudo systemctl status mysql

# Review database logs
sudo tail -f /var/log/mysql/error.log
```

#### 3. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test SSL configuration
openssl s_client -connect family.thelodgegroup.id:443
```

#### 4. Nginx Configuration Issues
```bash
# Test configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### Monitoring Commands

```bash
# System resources
htop
df -h
free -m

# Application status
pm2 status
pm2 monit

# Network connections
netstat -tulpn | grep :80
netstat -tulpn | grep :443
```

## Maintenance

### Daily Tasks
- Check application status: `pm2 status`
- Review error logs: `pm2 logs --err`
- Monitor system resources: `htop`

### Weekly Tasks
- Update system packages: `sudo apt update && sudo apt upgrade`
- Clean old logs: `pm2 flush`
- Backup database: `./scripts/backup-db.sh`

### Monthly Tasks
- Review SSL certificate expiry: `sudo certbot certificates`
- Update Node.js dependencies: `npm audit`
- Review security logs: `sudo grep "Failed password" /var/log/auth.log`

## Rollback Procedure

### Quick Rollback
```bash
# Stop current application
pm2 stop all

# Restore from backup
sudo cp -r /backup/backup-YYYYMMDD_HHMMSS/* /var/www/html/

# Restart application
pm2 start ecosystem.config.js
```

### Database Rollback
```bash
# Backup current database
mysqldump -u lodge_user -p thelodgefamily > current_backup.sql

# Restore previous database
mysql -u lodge_user -p thelodgefamily < previous_backup.sql
```

## Support

### Log Files Locations
- **PM2 Logs**: `~/.pm2/logs/`
- **Nginx Logs**: `/var/log/nginx/`
- **MySQL Logs**: `/var/log/mysql/`
- **System Logs**: `/var/log/syslog`

### Useful Commands
```bash
# Application status
pm2 status
pm2 logs --lines 50

# System status
sudo systemctl status nginx mysql
df -h && free -m

# Network status
sudo netstat -tulpn | grep -E ':(80|443|3000|5001)'
```

---

**Deployment completed successfully!** 

Your application should now be accessible at:
- **Frontend**: https://family.thelodgegroup.id
- **API**: https://family.thelodgegroup.id/api
- **Admin Panel**: https://family.thelodgegroup.id/admin

For ongoing support, refer to the troubleshooting guides and monitoring scripts included in the deployment package.