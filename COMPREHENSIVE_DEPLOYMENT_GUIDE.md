# Lodge Family - Comprehensive Deployment Guide

## Overview
This guide provides complete deployment instructions for the Lodge Family application, including production optimization, security configurations, backup strategies, and monitoring setup.

## Current Production Status
- **VPS Host**: 31.97.51.129
- **Domain**: family.thelodgegroup.id
- **SSL Status**: ✅ Valid (Let's Encrypt)
- **Backend Port**: 3003
- **Frontend**: Next.js (Static/SSR)
- **Database**: MySQL
- **Web Server**: Nginx

## Architecture Overview
```
Internet → Nginx (Port 80/443) → Next.js Frontend → Backend API (Port 3003) → MySQL Database
```

## 1. Initial Server Setup

### Prerequisites
- Ubuntu/Debian VPS with root access
- Domain name pointing to VPS IP
- SSH access configured

### Basic Server Configuration
```bash
# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y nginx mysql-server nodejs npm git curl

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2
```

## 2. Application Deployment

### Clone and Setup Application
```bash
# Clone repository
cd /root
git clone <repository-url> lodge-family
cd lodge-family

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
```

### Environment Configuration
Create the following environment files:

#### Backend (.env)
```env
# Database Configuration
DATABASE_URL="mysql://root:password@localhost:3306/lodge_family_db"
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=lodge_family_db

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here
NEXTAUTH_SECRET=your_nextauth_secret_key_here
NEXTAUTH_URL=https://family.thelodgegroup.id

# Xendit Payment Gateway
XENDIT_SECRET_KEY=your_xendit_secret_key
XENDIT_PUBLIC_KEY=your_xendit_public_key
XENDIT_WEBHOOK_TOKEN=your_xendit_webhook_token

# WhatsApp Business API
WHATSAPP_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_whatsapp_verify_token

# Application Settings
NODE_ENV=production
PORT=3003
FRONTEND_URL=https://family.thelodgegroup.id
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://family.thelodgegroup.id/api
NEXT_PUBLIC_XENDIT_PUBLIC_KEY=your_xendit_public_key
NEXTAUTH_URL=https://family.thelodgegroup.id
NEXTAUTH_SECRET=your_nextauth_secret_key_here
```

## 3. Database Setup

### MySQL Configuration
```bash
# Secure MySQL installation
mysql_secure_installation

# Create database and user
mysql -u root -p
```

```sql
CREATE DATABASE lodge_family_db;
CREATE USER 'lodge_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON lodge_family_db.* TO 'lodge_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Run Database Migrations
```bash
cd /root/lodge-family/backend
npm run migrate  # or your migration command
```

## 4. Build and Start Application

### Build Applications
```bash
# Build backend
cd /root/lodge-family/backend
npm run build

# Build frontend
cd /root/lodge-family/frontend
npm run build
```

### Start with PM2
```bash
# Start backend
cd /root/lodge-family/backend
pm2 start npm --name "lodge-backend" -- run start

# Start frontend
cd /root/lodge-family/frontend
pm2 start npm --name "lodge-frontend" -- run start

# Save PM2 configuration
pm2 save
pm2 startup
```

## 5. Nginx Configuration

### Main Nginx Configuration
```nginx
server {
    listen 80;
    server_name family.thelodgegroup.id;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name family.thelodgegroup.id;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/family.thelodgegroup.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/family.thelodgegroup.id/privkey.pem;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;

    # Frontend (Next.js)
    location / {
        limit_req zone=general burst=50 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL Certificate Setup
```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
certbot --nginx -d family.thelodgegroup.id

# Setup auto-renewal
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 6. Security Configuration

### Firewall Setup
```bash
# Configure UFW
ufw allow ssh
ufw allow 'Nginx Full'
ufw enable
```

### Fail2Ban Configuration
```bash
# Install Fail2Ban
apt install -y fail2ban

# Configure Fail2Ban for Nginx
cat > /etc/fail2ban/jail.local << EOF
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

systemctl restart fail2ban
```

## 7. Automated Backup Strategy

### Backup Scripts
The following backup scripts have been created:

1. **backup-lodge-family.sh** - Main backup script
2. **restore-lodge-family.sh** - Restore script
3. **setup-backup-cron.sh** - Cron job setup

### Deploy Backup System
```bash
# Upload backup scripts
scp backup-lodge-family.sh root@31.97.51.129:/root/
scp restore-lodge-family.sh root@31.97.51.129:/root/
scp setup-backup-cron.sh root@31.97.51.129:/root/

# Make executable
ssh root@31.97.51.129 "chmod +x /root/*.sh"

# Setup automated backups (daily at 2 AM)
ssh root@31.97.51.129 "/root/setup-backup-cron.sh"
```

### Backup Schedule
- **Daily**: Database + Application files (7 days retention)
- **Weekly**: Full backup every Sunday (4 weeks retention)
- **Monthly**: Archive backup on 1st of month (12 months retention)

### Backup Locations
- Daily: `/root/backups/daily/`
- Weekly: `/root/backups/weekly/`
- Monthly: `/root/backups/monthly/`

## 8. Monitoring and Logging

### Log Locations
- **Nginx Access**: `/var/log/nginx/access.log`
- **Nginx Error**: `/var/log/nginx/error.log`
- **PM2 Logs**: `pm2 logs`
- **Backup Logs**: `/var/log/lodge-backup.log`

### Monitoring Commands
```bash
# Check application status
pm2 status

# View logs
pm2 logs lodge-backend
pm2 logs lodge-frontend

# Check Nginx status
systemctl status nginx

# Monitor system resources
htop
df -h
free -h
```

## 9. Maintenance Procedures

### Regular Maintenance Tasks
1. **Weekly**: Check backup logs and verify backups
2. **Monthly**: Update system packages and restart services
3. **Quarterly**: Review SSL certificate expiration
4. **As needed**: Monitor application logs for errors

### Update Procedure
```bash
# 1. Backup current version
/root/backup-lodge-family.sh

# 2. Pull latest changes
cd /root/lodge-family
git pull origin main

# 3. Update dependencies
cd backend && npm install
cd ../frontend && npm install

# 4. Rebuild applications
cd backend && npm run build
cd ../frontend && npm run build

# 5. Restart services
pm2 restart all

# 6. Verify deployment
curl -I https://family.thelodgegroup.id
```

## 10. Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs

# Restart services
pm2 restart all
```

#### Database Connection Issues
```bash
# Check MySQL status
systemctl status mysql

# Test database connection
mysql -u root -p lodge_family_db
```

#### SSL Certificate Issues
```bash
# Check certificate status
certbot certificates

# Renew certificate
certbot renew --dry-run
```

#### High Memory Usage
```bash
# Check memory usage
free -h

# Restart PM2 processes
pm2 restart all

# Check for memory leaks
pm2 monit
```

## 11. Performance Optimization

### Nginx Optimizations
- Gzip compression enabled
- Browser caching configured
- Rate limiting implemented
- Security headers added

### Application Optimizations
- PM2 cluster mode for scaling
- Database connection pooling
- Static asset optimization
- CDN integration (if needed)

## 12. Security Checklist

- ✅ SSL/TLS encryption (Let's Encrypt)
- ✅ Security headers configured
- ✅ Rate limiting implemented
- ✅ Firewall configured (UFW)
- ✅ Fail2Ban protection
- ✅ Regular security updates
- ✅ Environment variables secured
- ✅ Database access restricted

## 13. API Endpoints

### Available Endpoints
- `GET /api` - Health check
- `POST /api/member` - Member operations
- `POST /api/admin` - Admin operations
- `POST /api/booking` - Booking management
- `POST /api/webhook` - Payment webhooks
- `GET /api/notifications` - Notification system

### Testing Endpoints
```bash
# Health check
curl https://family.thelodgegroup.id/api

# Test with authentication
curl -H "Authorization: Bearer <token>" https://family.thelodgegroup.id/api/member
```

## 14. Contact and Support

### Key Personnel
- **System Administrator**: [Contact Info]
- **Developer**: [Contact Info]
- **Emergency Contact**: [Contact Info]

### External Services
- **Domain Registrar**: [Provider Info]
- **VPS Provider**: [Provider Info]
- **Payment Gateway**: Xendit
- **WhatsApp Business**: Meta Business

---

**Last Updated**: November 1, 2024
**Version**: 1.0
**Status**: Production Ready

For questions or issues, please refer to the troubleshooting section or contact the development team.