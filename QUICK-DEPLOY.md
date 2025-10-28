# Quick Deployment Guide - The Lodge Family

## Prerequisites Checklist

### ✅ VPS Requirements
- [ ] Ubuntu 20.04+ VPS with public IP
- [ ] Domain `family.thelodgegroup.id` pointing to VPS IP
- [ ] SSH access with sudo privileges
- [ ] Minimum 2GB RAM, 20GB storage

### ✅ Local Requirements
- [ ] SSH key configured for VPS access
- [ ] PowerShell 5.0+ (Windows) or Bash (Linux/macOS)
- [ ] rsync, ssh, curl installed

## Quick Start (5 Minutes)

### Option 1: Windows PowerShell
```powershell
# Navigate to project
cd C:\xampp\htdocs\newthelodgefamily

# Test connection first
.\DEPLOY-TO-VPS.ps1 -VPSUser "your-username" -TestOnly

# Deploy to production
.\DEPLOY-TO-VPS.ps1 -VPSUser "your-username"
```

### Option 2: Linux/macOS Bash
```bash
# Navigate to project
cd /path/to/newthelodgefamily

# Make script executable
chmod +x deploy-to-vps.sh

# Test connection first
./deploy-to-vps.sh -u your-username -t

# Deploy to production
./deploy-to-vps.sh -u your-username
```

## Manual Deployment (10 Minutes)

### Step 1: Upload Files
```bash
# From local machine
rsync -avz --delete deployment-packages/thelodgefamily-final-deployment-20251027_210438/ your-username@family.thelodgegroup.id:/var/www/html/
```

### Step 2: Setup VPS Environment
```bash
# Connect to VPS
ssh your-username@family.thelodgegroup.id

# Install dependencies
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs nginx mysql-server
sudo npm install -g pm2
```

### Step 3: Configure Database
```bash
# Secure MySQL
sudo mysql_secure_installation

# Create database
sudo mysql -u root -p
```
```sql
CREATE DATABASE thelodgefamily;
CREATE USER 'lodge_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON thelodgefamily.* TO 'lodge_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 4: Setup Application
```bash
# Backend setup
cd /var/www/html/backend
cp .env.production .env
# Edit .env with your database credentials
nano .env
npm install --production
npx prisma generate
npx prisma migrate deploy

# Frontend setup
cd /var/www/html/frontend
cp .env.production .env.local
npm install --production
npm run build
```

### Step 5: Configure Nginx & SSL
```bash
# Configure Nginx
sudo cp /var/www/html/nginx-family-domain-fixed.conf /etc/nginx/sites-available/family.thelodgegroup.id
sudo ln -sf /etc/nginx/sites-available/family.thelodgegroup.id /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d family.thelodgegroup.id --email admin@thelodgegroup.id --agree-tos --non-interactive
```

### Step 6: Start Application
```bash
# Deploy with PM2
cd /var/www/html
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Follow PM2 startup instructions

# Set permissions
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```

## Verification Commands

### Check Services
```bash
# Application status
pm2 status
pm2 logs

# System services
sudo systemctl status nginx
sudo systemctl status mysql

# Test endpoints
curl -I https://family.thelodgegroup.id
curl -I https://family.thelodgegroup.id/api/health
```

### Create Admin User
```bash
cd /var/www/html/backend
node create-admin.js
```

## Environment Variables to Update

### Backend (.env)
```env
DATABASE_URL="mysql://lodge_user:YOUR_PASSWORD@localhost:3306/thelodgefamily"
JWT_SECRET="YOUR_JWT_SECRET"
SMTP_USER="YOUR_EMAIL"
SMTP_PASS="YOUR_EMAIL_PASSWORD"
XENDIT_SECRET_KEY="YOUR_XENDIT_SECRET"
XENDIT_PUBLIC_KEY="YOUR_XENDIT_PUBLIC"
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://family.thelodgegroup.id/api
NEXT_PUBLIC_XENDIT_PUBLIC_KEY="YOUR_XENDIT_PUBLIC_KEY"
```

## Troubleshooting

### Application Won't Start
```bash
pm2 logs
pm2 restart all
```

### Database Connection Issues
```bash
mysql -u lodge_user -p thelodgefamily
sudo systemctl status mysql
```

### SSL Certificate Issues
```bash
sudo certbot certificates
sudo certbot renew
```

### Nginx Configuration Issues
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

## Success Indicators

✅ **Application Running**: `pm2 status` shows all processes online
✅ **Frontend Accessible**: https://family.thelodgegroup.id loads
✅ **API Working**: https://family.thelodgegroup.id/api/health returns 200
✅ **SSL Active**: Green lock icon in browser
✅ **Admin Panel**: https://family.thelodgegroup.id/admin accessible

## Post-Deployment

### Daily Monitoring
```bash
pm2 status
pm2 logs --lines 20
df -h && free -m
```

### Weekly Maintenance
```bash
sudo apt update && sudo apt upgrade
pm2 flush
sudo certbot renew --dry-run
```

## Emergency Contacts

- **Technical Support**: admin@thelodgegroup.id
- **VPS Provider**: [Your VPS provider support]
- **Domain Registrar**: [Your domain provider support]

---

**🚀 Ready to Deploy!**

Choose your deployment method and follow the steps above. The automated scripts handle most of the complexity, but manual steps are provided as backup.

**Estimated Deployment Time**: 5-15 minutes depending on method chosen.