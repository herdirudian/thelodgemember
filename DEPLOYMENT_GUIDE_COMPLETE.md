# 🚀 Complete Deployment Guide - Lodge Family Application

Panduan lengkap untuk deploy aplikasi Lodge Family menggunakan **GitHub Actions + VPS** dengan otomatisasi penuh.

## 📋 Overview

Sistem deployment ini menggunakan:
- **GitHub Actions** untuk CI/CD pipeline
- **VPS** sebagai production server
- **Automated deployment** dengan rollback otomatis
- **Zero-downtime deployment** dengan health checks
- **SSL/HTTPS** dengan Let's Encrypt

## 🏗️ Architecture

```
GitHub Repository
       ↓ (push to main)
GitHub Actions Workflow
       ↓ (build & test)
Deployment Package
       ↓ (SSH deploy)
VPS Server
├── Nginx (Reverse Proxy)
├── Backend API (Node.js)
├── Frontend (Next.js)
└── Database (SQLite/PostgreSQL)
```

## 🛠️ Prerequisites

### Local Development
- [x] Node.js 20+
- [x] Git
- [x] SSH client

### VPS Requirements
- [x] Ubuntu 20.04+ atau Debian 11+
- [x] 2GB+ RAM
- [x] 20GB+ Storage
- [x] Root access
- [x] Domain name (optional tapi recommended)

## 📦 Step 1: VPS Initial Setup

### 1.1 Connect to VPS

```bash
ssh root@your-vps-ip
```

### 1.2 Run Setup Script

```bash
# Download setup script
wget https://raw.githubusercontent.com/your-username/lodge-family/main/scripts/setup-vps.sh

# Make executable
chmod +x setup-vps.sh

# Run setup (as regular user with sudo)
./setup-vps.sh
```

### 1.3 Configure Domain (Optional)

Jika menggunakan domain, update DNS records:

```
A Record: yourdomain.com → your-vps-ip
A Record: www.yourdomain.com → your-vps-ip
```

## 🔐 Step 2: SSH Keys Setup

### 2.1 Generate SSH Key Pair

```bash
# Di komputer lokal
ssh-keygen -t ed25519 -C "github-actions@yourdomain.com" -f ~/.ssh/lodge-family-deploy

# Copy public key
cat ~/.ssh/lodge-family-deploy.pub
```

### 2.2 Add Public Key to VPS

```bash
# Login ke VPS
ssh root@your-vps-ip

# Switch to app user
su - lodge-family

# Add public key
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "PASTE_YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 2.3 Test SSH Connection

```bash
# Test dari komputer lokal
ssh -i ~/.ssh/lodge-family-deploy lodge-family@your-vps-ip
```

## 🔧 Step 3: GitHub Secrets Configuration

### 3.1 Add Repository Secrets

Buka GitHub repository → Settings → Secrets and variables → Actions

**Required Secrets:**

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `VPS_HOST` | `your-vps-ip` | IP address VPS |
| `VPS_USER` | `lodge-family` | Username untuk SSH |
| `VPS_SSH_KEY` | `private-key-content` | Private SSH key |
| `JWT_SECRET` | `your-jwt-secret-32-chars+` | JWT secret key |
| `XENDIT_SECRET_KEY` | `xnd_production_...` | Xendit API key |
| `WHATSAPP_API_KEY` | `your-whatsapp-key` | WhatsApp API key |

### 3.2 Copy Private Key

```bash
# Copy private key content
cat ~/.ssh/lodge-family-deploy
```

Paste seluruh content (termasuk `-----BEGIN` dan `-----END`) ke GitHub secret `VPS_SSH_KEY`.

## 🌍 Step 4: Environment Configuration

### 4.1 Create Production Environment File

Login ke VPS dan buat file environment:

```bash
ssh lodge-family@your-vps-ip

# Create production environment file
nano ~/.env.production
```

**Content:**

```env
# Production Environment
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL="file:/var/lib/lodge-family/production.db"

# Security
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters"

# Payment Gateway
XENDIT_SECRET_KEY="xnd_production_your_actual_key"

# WhatsApp Integration
WHATSAPP_API_KEY="your-whatsapp-api-key"
WHATSAPP_PHONE_NUMBER="+6281234567890"

# Domain Configuration
DOMAIN="yourdomain.com"
FRONTEND_URL="https://yourdomain.com"
BACKEND_URL="https://yourdomain.com/api"

# CORS
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# File Upload
MAX_FILE_SIZE="10MB"
UPLOAD_PATH="/var/www/lodge-family-current/uploads"

# Logging
LOG_LEVEL="info"
```

## 🚀 Step 5: First Deployment

### 5.1 Trigger Deployment

**Option A: Automatic (Push to main)**
```bash
git add .
git commit -m "Initial deployment setup"
git push origin main
```

**Option B: Manual Trigger**
1. Buka GitHub repository
2. Klik tab "Actions"
3. Pilih "Deploy to VPS"
4. Klik "Run workflow"
5. Pilih "production"
6. Klik "Run workflow"

### 5.2 Monitor Deployment

1. **GitHub Actions**: Monitor di tab Actions
2. **VPS Logs**: 
   ```bash
   ssh lodge-family@your-vps-ip
   tail -f /var/log/lodge-family/backend.log
   ```

### 5.3 Verify Deployment

```bash
# Run health check
ssh lodge-family@your-vps-ip
/usr/local/bin/lodge-family-health-check
```

## 🔒 Step 6: SSL Certificate (HTTPS)

### 6.1 Install SSL Certificate

```bash
# Login ke VPS sebagai root
ssh root@your-vps-ip

# Install SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
certbot renew --dry-run
```

### 6.2 Update Nginx Configuration

SSL akan otomatis dikonfigurasi oleh Certbot.

## 📊 Step 7: Monitoring & Maintenance

### 7.1 Health Checks

```bash
# Manual health check
ssh lodge-family@your-vps-ip
/usr/local/bin/lodge-family-health-check

# Check service status
sudo systemctl status lodge-family-backend
sudo systemctl status lodge-family-frontend
```

### 7.2 View Logs

```bash
# Application logs
tail -f /var/log/lodge-family/backend.log
tail -f /var/log/lodge-family/frontend.log

# System logs
journalctl -u lodge-family-backend -f
journalctl -u lodge-family-frontend -f
```

### 7.3 Manual Deployment Commands

```bash
# Manual deployment
ssh lodge-family@your-vps-ip
./scripts/manual-deploy.sh deploy /path/to/source

# Rollback
./scripts/manual-deploy.sh rollback

# Status check
./scripts/manual-deploy.sh status
```

## 🔄 Deployment Workflow

### Automatic Deployment Process

1. **Trigger**: Push ke branch `main`
2. **Build**: GitHub Actions build backend & frontend
3. **Test**: Run tests (jika ada)
4. **Package**: Create deployment package
5. **Deploy**: Upload ke VPS via SSH
6. **Install**: Install dependencies & run migrations
7. **Switch**: Update symlinks & restart services
8. **Verify**: Health checks & rollback jika gagal
9. **Cleanup**: Remove old deployments

### Rollback Process

Jika deployment gagal:
1. **Automatic**: GitHub Actions otomatis rollback
2. **Manual**: Jalankan rollback script
3. **Restore**: Kembali ke deployment sebelumnya
4. **Verify**: Pastikan aplikasi berjalan normal

## 🛠️ Troubleshooting

### Common Issues

#### 1. SSH Connection Failed
```bash
# Test SSH
ssh -vvv lodge-family@your-vps-ip

# Check SSH key permissions
chmod 600 ~/.ssh/lodge-family-deploy
```

#### 2. Service Won't Start
```bash
# Check logs
journalctl -u lodge-family-backend -n 50
journalctl -u lodge-family-frontend -n 50

# Check environment
cat /var/www/lodge-family-current/.env
```

#### 3. Database Issues
```bash
# Check database file
ls -la /var/lib/lodge-family/

# Run migrations manually
cd /var/www/lodge-family-current
npx prisma migrate deploy
```

#### 4. Nginx Issues
```bash
# Test nginx config
sudo nginx -t

# Check nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Emergency Procedures

#### Quick Rollback
```bash
ssh lodge-family@your-vps-ip
./scripts/manual-deploy.sh rollback
```

#### Service Restart
```bash
sudo systemctl restart lodge-family-backend
sudo systemctl restart lodge-family-frontend
sudo systemctl reload nginx
```

#### Database Backup
```bash
# Create backup
cp /var/lib/lodge-family/production.db /var/backups/lodge-family/backup-$(date +%Y%m%d-%H%M%S).db
```

## 📋 Maintenance Checklist

### Daily
- [ ] Check health status
- [ ] Monitor error logs
- [ ] Verify SSL certificate

### Weekly
- [ ] Review deployment logs
- [ ] Check disk space
- [ ] Update system packages

### Monthly
- [ ] Database backup
- [ ] Security updates
- [ ] Performance review
- [ ] Clean old deployments

## 🔧 Advanced Configuration

### Custom Domain Setup
```bash
# Update nginx config
sudo nano /etc/nginx/sites-available/lodge-family

# Update environment
nano ~/.env.production
```

### Database Migration
```bash
# For PostgreSQL migration
sudo apt install postgresql postgresql-contrib
# Update DATABASE_URL in .env.production
```

### Load Balancer Setup
```bash
# For multiple VPS instances
# Configure nginx upstream
# Update deployment script
```

## 📞 Support & Resources

### Documentation
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

### Monitoring Tools
- GitHub Actions logs
- VPS system logs
- Application logs
- Health check scripts

### Backup Strategy
- Automated database backups
- Deployment rollback capability
- Configuration file backups
- SSL certificate backups

---

## 🎉 Deployment Complete!

Setelah mengikuti panduan ini, Anda akan memiliki:

✅ **Automated CI/CD Pipeline**
✅ **Zero-downtime Deployment**
✅ **Automatic Rollback**
✅ **SSL/HTTPS Security**
✅ **Health Monitoring**
✅ **Backup & Recovery**

**Next Steps:**
1. Test deployment dengan push ke main branch
2. Setup monitoring alerts
3. Configure backup schedule
4. Document custom configurations

**Happy Deploying! 🚀**