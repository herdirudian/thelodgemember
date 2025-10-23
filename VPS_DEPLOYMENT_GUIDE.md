# 🚀 VPS Deployment & Update Guide

## 📋 Overview
Panduan lengkap untuk deploy dan update aplikasi The Lodge Family di VPS dengan strategi zero-downtime deployment.

## 🏗️ Arsitektur Deployment

```
VPS Server
├── /var/www/thelodgefamily/
│   ├── current/           # Symlink ke release aktif
│   ├── releases/          # Folder untuk setiap release
│   │   ├── 20241021-001/
│   │   ├── 20241021-002/
│   │   └── 20241021-003/
│   ├── shared/            # File yang dibagi antar release
│   │   ├── .env
│   │   ├── uploads/
│   │   └── logs/
│   └── scripts/           # Deployment scripts
```

## 🔧 Setup Awal VPS

### 🏢 Hostinger VPS Specific Notes

#### Akses VPS Hostinger
```bash
# Connect via SSH (gunakan IP dan credentials dari Hostinger panel)
ssh root@your-vps-ip

# Update hostname (opsional)
sudo hostnamectl set-hostname thelodgefamily
```

#### Hostinger VPS Optimizations
```bash
# Check available resources
free -h
df -h
nproc

# Hostinger biasanya sudah include:
# - UFW Firewall (disabled by default)
# - Basic security setup
# - Latest Ubuntu packages

# Enable UFW Firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# Check if swap is available (Hostinger biasanya sudah setup)
sudo swapon --show

# Jika tidak ada swap, buat swap file (untuk VPS 2GB+)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### Domain Setup di Hostinger
1. **DNS Management**: Login ke Hostinger panel → Domain → DNS Zone
2. **A Record**: Tambahkan A record untuk `family.thelodgegroup.id` pointing ke VPS IP
3. **CNAME Record**: Tambahkan CNAME `www` pointing ke `family.thelodgegroup.id`
4. **Propagation**: Tunggu 24-48 jam untuk DNS propagation (biasanya 1-2 jam)

```bash
# Verify DNS propagation
nslookup family.thelodgegroup.id
dig family.thelodgegroup.id
```

### 1. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Nginx (Reverse Proxy)
sudo apt install nginx -y

# Install Git
sudo apt install git -y
```

### 2. Setup PostgreSQL Database
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE thelodgefamily;
CREATE USER thelodge_user WITH ENCRYPTED PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE thelodgefamily TO thelodge_user;

# Grant additional permissions for Prisma
GRANT CREATE ON SCHEMA public TO thelodge_user;
GRANT USAGE ON SCHEMA public TO thelodge_user;

# Exit PostgreSQL
\q

# Configure PostgreSQL for local connections
sudo nano /etc/postgresql/14/main/pg_hba.conf
# Tambahkan atau ubah line berikut:
# local   all             thelodge_user                           md5

# Restart PostgreSQL
sudo systemctl restart postgresql
sudo systemctl enable postgresql
```

### 3. Setup Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/thelodgefamily

# Isi dengan konfigurasi berikut:
server {
    listen 80;
    server_name family.thelodgegroup.id www.family.thelodgegroup.id;

    # Redirect HTTP to HTTPS (akan diaktifkan setelah SSL setup)
    # return 301 https://$server_name$request_uri;

    # Static files untuk uploads
    location /files/ {
        alias /var/www/thelodgefamily/current/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout for file uploads
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Frontend (Next.js)
    location / {
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

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # File upload size limit
    client_max_body_size 50M;
}

# Enable site
sudo ln -s /etc/nginx/sites-available/thelodgefamily /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Setup SSL/TLS dengan Let's Encrypt
```bash
# Install Certbot
sudo apt install snapd -y
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot

# Create symlink
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Pastikan domain sudah pointing ke VPS IP
# Cek dengan: nslookup family.thelodgegroup.id

# Generate SSL certificate
sudo certbot --nginx -d family.thelodgegroup.id -d www.family.thelodgegroup.id

# Test auto-renewal
sudo certbot renew --dry-run

# Setup auto-renewal cron job
sudo crontab -e
# Tambahkan line berikut:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Update Nginx untuk HTTPS
Setelah SSL certificate berhasil, Certbot akan otomatis mengupdate konfigurasi Nginx. Namun, Anda bisa manual update jika diperlukan:

```bash
sudo nano /etc/nginx/sites-available/thelodgefamily

# Uncomment redirect line dan tambahkan server block untuk HTTPS:
server {
    listen 80;
    server_name family.thelodgegroup.id www.family.thelodgegroup.id;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name family.thelodgegroup.id www.family.thelodgegroup.id;

    ssl_certificate /etc/letsencrypt/live/family.thelodgegroup.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/family.thelodgegroup.id/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Rest of your location blocks here...
    # (Copy dari konfigurasi HTTP di atas)
}
```

## 🚀 Deployment Strategies

### Strategy 1: Git-Based Manual Deployment

#### Setup Repository
```bash
# Di VPS, clone repository
cd /var/www
sudo git clone https://github.com/yourusername/thelodgefamily.git
sudo chown -R $USER:$USER thelodgefamily
cd thelodgefamily
```

#### Manual Update Process
```bash
# 1. Pull latest changes
git pull origin main

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Build frontend
npm run build

# 4. Update database schema
cd ../backend
npx prisma db push

# 5. Restart services
pm2 restart all
```

### Strategy 2: Automated Deployment dengan PM2 Ecosystem

#### Setup PM2 Ecosystem File
```bash
# Di root project, buat ecosystem.config.js
```

### Strategy 3: Zero-Downtime Deployment dengan Symlinks

#### Setup Directory Structure
```bash
sudo mkdir -p /var/www/thelodgefamily/{releases,shared,scripts}
sudo mkdir -p /var/www/thelodgefamily/shared/{logs,uploads}
```

## ⚙️ Production Environment Configuration

### Production .env Template
Buat file `.env` di `/var/www/thelodgefamily/shared/.env` dengan konfigurasi berikut:

```bash
# Database Configuration
DATABASE_URL="postgresql://thelodge_user:secure_password_here@localhost:5432/thelodgefamily"

# Server Configuration
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://family.thelodgegroup.id
BACKEND_URL=https://family.thelodgegroup.id/api

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_here_minimum_32_characters
JWT_EXPIRES_IN=7d

# Email Configuration (gunakan SMTP provider seperti Gmail, SendGrid, dll)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@family.thelodgegroup.id
FROM_NAME="The Lodge Family"

# Xendit Configuration (Production)
XENDIT_SECRET_KEY=xnd_production_your_secret_key_here
XENDIT_PUBLIC_KEY=xnd_public_production_your_public_key_here
XENDIT_WEBHOOK_TOKEN=your_webhook_verification_token_here

# File Upload Configuration
UPLOAD_DIR=/var/www/thelodgefamily/shared/uploads
MAX_FILE_SIZE=50MB

# Cloudinary Configuration (untuk image optimization)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Security Configuration
CORS_ORIGIN=https://family.thelodgegroup.id
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=/var/www/thelodgefamily/shared/logs/app.log

# Admin Configuration
ADMIN_EMAIL=admin@thelodgegroup.id
ADMIN_PASSWORD=secure_admin_password_here
```

### Environment Variables Setup
```bash
# Copy .env template ke shared directory
sudo cp /var/www/thelodgefamily/current/backend/.env.example /var/www/thelodgefamily/shared/.env

# Edit dengan nilai production
sudo nano /var/www/thelodgefamily/shared/.env

# Set proper permissions
sudo chown www-data:www-data /var/www/thelodgefamily/shared/.env
sudo chmod 600 /var/www/thelodgefamily/shared/.env

# Create symlink dari current release ke shared .env
ln -sf /var/www/thelodgefamily/shared/.env /var/www/thelodgefamily/current/backend/.env
```

### Database Migration untuk Production
```bash
cd /var/www/thelodgefamily/current/backend

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed database dengan data awal (jika ada)
npm run seed
```

## 🔄 Update Workflow

### Option 1: Simple Git Pull (Dengan Downtime Singkat)
```bash
#!/bin/bash
# update-simple.sh

echo "🚀 Starting deployment..."

# Navigate to project directory
cd /var/www/thelodgefamily

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

# Build frontend
echo "🏗️ Building frontend..."
npm run build

# Update database
echo "🗄️ Updating database..."
cd ../backend
npx prisma db push

# Restart services
echo "🔄 Restarting services..."
pm2 restart all

echo "✅ Deployment completed!"
```

### Option 2: Zero-Downtime Deployment
```bash
#!/bin/bash
# update-zero-downtime.sh

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RELEASE_DIR="/var/www/thelodgefamily/releases/$TIMESTAMP"
CURRENT_DIR="/var/www/thelodgefamily/current"
SHARED_DIR="/var/www/thelodgefamily/shared"

echo "🚀 Starting zero-downtime deployment..."

# Create new release directory
mkdir -p $RELEASE_DIR

# Clone latest code
echo "📥 Cloning latest code..."
git clone https://github.com/yourusername/thelodgefamily.git $RELEASE_DIR

# Link shared files
echo "🔗 Linking shared files..."
ln -sf $SHARED_DIR/.env $RELEASE_DIR/backend/.env
ln -sf $SHARED_DIR/uploads $RELEASE_DIR/backend/uploads

# Install dependencies and build
echo "📦 Installing dependencies..."
cd $RELEASE_DIR/backend && npm install
cd $RELEASE_DIR/frontend && npm install

echo "🏗️ Building frontend..."
cd $RELEASE_DIR/frontend && npm run build

# Update database
echo "🗄️ Updating database..."
cd $RELEASE_DIR/backend && npx prisma db push

# Switch symlink (atomic operation)
echo "🔄 Switching to new release..."
ln -sfn $RELEASE_DIR $CURRENT_DIR

# Restart services
echo "🔄 Restarting services..."
pm2 restart all

# Cleanup old releases (keep last 5)
echo "🧹 Cleaning up old releases..."
cd /var/www/thelodgefamily/releases
ls -t | tail -n +6 | xargs rm -rf

echo "✅ Zero-downtime deployment completed!"
```

## 📱 PM2 Process Management

### Setup PM2 Configuration
```bash
# ecosystem.config.js di root project
```

### PM2 Commands
```bash
# Start applications
pm2 start ecosystem.config.js

# Restart all
pm2 restart all

# Stop all
pm2 stop all

# View logs
pm2 logs

# Monitor
pm2 monit

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

## 🔒 Environment Configuration

### Production .env Setup
```bash
# /var/www/thelodgefamily/shared/.env
DATABASE_URL="mysql://thelodge_user:secure_password@localhost:3306/thelodgefamily"
PORT=5000
APP_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com
JWT_SECRET=your_super_secure_jwt_secret_here
QR_HMAC_SECRET=your_secure_qr_secret_here

# Email Configuration
EMAIL_PROVIDER=smtp
SMTP_HOST=your-smtp-host.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password
FROM_EMAIL=noreply@your-domain.com
FROM_NAME=The Lodge Family

# Xendit Configuration
XENDIT_SECRET_KEY=your_production_xendit_secret_key
XENDIT_WEBHOOK_TOKEN=your_xendit_webhook_token
XENDIT_PUBLIC_KEY=your_production_xendit_public_key
```

## 🔄 Backup & Rollback

### Database Backup Script
```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/var/www/thelodgefamily/shared/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="thelodgefamily"

mkdir -p $BACKUP_DIR

mysqldump -u thelodge_user -p $DB_NAME > $BACKUP_DIR/db_backup_$TIMESTAMP.sql

# Keep only last 10 backups
cd $BACKUP_DIR
ls -t db_backup_*.sql | tail -n +11 | xargs rm -f

echo "Database backup completed: db_backup_$TIMESTAMP.sql"
```

### Rollback Script
```bash
#!/bin/bash
# rollback.sh

RELEASES_DIR="/var/www/thelodgefamily/releases"
CURRENT_DIR="/var/www/thelodgefamily/current"

# Get previous release
PREVIOUS_RELEASE=$(ls -t $RELEASES_DIR | sed -n '2p')

if [ -z "$PREVIOUS_RELEASE" ]; then
    echo "❌ No previous release found!"
    exit 1
fi

echo "🔄 Rolling back to: $PREVIOUS_RELEASE"

# Switch symlink to previous release
ln -sfn $RELEASES_DIR/$PREVIOUS_RELEASE $CURRENT_DIR

# Restart services
pm2 restart all

echo "✅ Rollback completed!"
```

## 📊 Monitoring & Health Checks

### Health Check Script
```bash
#!/bin/bash
# health-check.sh

# Check backend
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health)
if [ $BACKEND_STATUS -eq 200 ]; then
    echo "✅ Backend: OK"
else
    echo "❌ Backend: FAILED ($BACKEND_STATUS)"
fi

# Check frontend
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ $FRONTEND_STATUS -eq 200 ]; then
    echo "✅ Frontend: OK"
else
    echo "❌ Frontend: FAILED ($FRONTEND_STATUS)"
fi

# Check database
DB_STATUS=$(mysql -u thelodge_user -p -e "SELECT 1" thelodgefamily 2>/dev/null && echo "OK" || echo "FAILED")
echo "🗄️ Database: $DB_STATUS"
```

## 🔧 Troubleshooting

### Common Issues & Solutions

1. **Port sudah digunakan**
   ```bash
   sudo lsof -i :3000
   sudo lsof -i :5000
   kill -9 <PID>
   ```

2. **Permission issues**
   ```bash
   sudo chown -R $USER:$USER /var/www/thelodgefamily
   chmod +x scripts/*.sh
   ```

3. **Database connection failed**
   ```bash
   # Check MySQL status
   sudo systemctl status mysql
   
   # Restart MySQL
   sudo systemctl restart mysql
   ```

4. **Nginx configuration error**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## 📝 Best Practices

1. **Selalu backup database sebelum update**
2. **Test di staging environment dulu**
3. **Monitor logs setelah deployment**
4. **Gunakan environment variables untuk konfigurasi**
5. **Setup SSL certificate dengan Let's Encrypt**
6. **Implement proper logging dan monitoring**
7. **Regular security updates**

## 🚀 Quick Commands

```bash
# Quick update (dengan downtime singkat)
./scripts/update-simple.sh

# Zero-downtime update
./scripts/update-zero-downtime.sh

# Backup database
./scripts/backup-db.sh

# Rollback ke release sebelumnya
./scripts/rollback.sh

# Health check
./scripts/health-check.sh

# View logs
pm2 logs

# Monitor processes
pm2 monit
```

---

**💡 Tips:** Untuk update yang lebih advanced, pertimbangkan menggunakan CI/CD tools seperti GitHub Actions atau GitLab CI untuk automated deployment.