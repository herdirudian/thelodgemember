# 🚀 Quick Deployment Guide - The Lodge Family

Panduan singkat untuk deployment dan update aplikasi di VPS.

## 📋 Prerequisites

- VPS dengan Ubuntu 20.04+ atau CentOS 8+
- Domain yang sudah di-pointing ke VPS
- SSH access ke VPS
- Git repository yang sudah di-setup

## ⚡ Quick Commands

### 🔧 Initial Setup (Sekali saja)

```bash
# 1. Clone repository
git clone https://github.com/yourusername/thelodgefamily.git /var/www/thelodgefamily
cd /var/www/thelodgefamily

# 2. Setup environment
cp .env.example .env.production
nano .env.production  # Edit sesuai kebutuhan

# 3. Install dependencies
chmod +x scripts/*.sh
./scripts/setup-vps.sh

# 4. Setup PM2 ecosystem
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 5. Setup automated tasks
./scripts/setup-cron.sh setup
```

### 🔄 Regular Updates

#### Simple Update (dengan downtime singkat)
```bash
cd /var/www/thelodgefamily
./scripts/update-simple.sh
```

#### Zero-Downtime Update (recommended untuk production)
```bash
cd /var/www/thelodgefamily
./scripts/update-zero-downtime.sh
```

### 🆘 Emergency Rollback
```bash
cd /var/www/thelodgefamily
./scripts/rollback.sh
```

### 📊 Health Check
```bash
cd /var/www/thelodgefamily
./scripts/health-check.sh
```

## 📁 File Structure

```
/var/www/thelodgefamily/
├── current/                 # Symlink ke release aktif
├── releases/               # Folder untuk setiap release
│   ├── 20240101_120000/   # Release berdasarkan timestamp
│   └── 20240102_150000/
├── shared/                 # File yang dibagi antar release
│   ├── .env.production
│   ├── uploads/
│   ├── logs/
│   └── backups/
└── scripts/               # Deployment scripts
```

## 🔐 Environment Variables

File: `/var/www/thelodgefamily/shared/.env.production`

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/thelodgefamily"

# Application
NODE_ENV=production
PORT=5000
APP_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Email (untuk notifikasi)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Cloudinary (untuk upload gambar)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# WhatsApp API
WATZAP_API_KEY=your-watzap-key
WATZAP_PHONE_NUMBER=your-phone-number

# Xendit Payment
XENDIT_SECRET_KEY=your-xendit-secret-key
XENDIT_PUBLIC_KEY=your-xendit-public-key
```

## 🔄 Update Workflow

### 1. Development → Staging
```bash
# Di local development
git add .
git commit -m "feat: new feature"
git push origin main

# Di staging server
cd /var/www/thelodgefamily
./scripts/update-simple.sh
```

### 2. Staging → Production
```bash
# Setelah testing di staging OK
cd /var/www/thelodgefamily
./scripts/update-zero-downtime.sh
```

## 📱 Monitoring Commands

### Check Application Status
```bash
pm2 status
pm2 logs
pm2 monit
```

### Check System Resources
```bash
# CPU dan Memory
htop

# Disk space
df -h

# Network connections
netstat -tulpn | grep :5000
```

### Check Database
```bash
# Login ke MySQL
mysql -u thelodge_user -p thelodgefamily

# Check database size
mysql -u thelodge_user -p -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size_MB' FROM information_schema.tables WHERE table_schema='thelodgefamily';"
```

## 🔧 Troubleshooting

### Application Won't Start
```bash
# Check PM2 logs
pm2 logs thelodge-backend
pm2 logs thelodge-frontend

# Restart services
pm2 restart all

# Check environment variables
cat /var/www/thelodgefamily/shared/.env.production
```

### Database Connection Issues
```bash
# Check MySQL status
sudo systemctl status mysql

# Test connection
mysql -u thelodge_user -p -e "SELECT 1;"

# Check database exists
mysql -u thelodge_user -p -e "SHOW DATABASES;"
```

### High Memory Usage
```bash
# Check memory usage
free -h

# Restart PM2 with memory limit
pm2 restart all --max-memory-restart 500M
```

### SSL Certificate Issues
```bash
# Check certificate expiry
openssl x509 -enddate -noout -in /etc/ssl/certs/thelodgefamily.crt

# Renew Let's Encrypt certificate
sudo certbot renew
```

## 📞 Emergency Contacts

- **Server Issues**: Check `/var/www/thelodgefamily/shared/logs/`
- **Database Issues**: Check MySQL error logs
- **Application Issues**: Check PM2 logs dengan `pm2 logs`

## 🔄 Backup & Recovery

### Manual Backup
```bash
# Database backup
./scripts/backup-db.sh backup

# Full application backup
tar -czf backup-$(date +%Y%m%d).tar.gz /var/www/thelodgefamily/
```

### Restore from Backup
```bash
# Database restore
mysql -u thelodge_user -p thelodgefamily < backup_file.sql

# Application restore
tar -xzf backup-file.tar.gz -C /
```

## 📈 Performance Optimization

### Enable Gzip Compression (Nginx)
```nginx
# Add to nginx config
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

### Enable Caching
```nginx
# Static files caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);
```

---

**💡 Tips:**
- Selalu test di staging sebelum deploy ke production
- Backup database sebelum update major
- Monitor logs secara regular
- Setup alerting untuk downtime
- Dokumentasikan setiap perubahan konfigurasi