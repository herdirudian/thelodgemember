# GitHub Secrets Setup Guide

Untuk menggunakan GitHub Actions deployment, Anda perlu mengkonfigurasi secrets di repository GitHub Anda.

## 🔐 Required GitHub Secrets

Buka repository GitHub Anda → Settings → Secrets and variables → Actions → New repository secret

### 1. VPS Connection Secrets

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `VPS_HOST` | IP address atau domain VPS | `31.97.51.129` atau `yourdomain.com` |
| `VPS_USER` | Username untuk login ke VPS | `lodge-family` |
| `VPS_SSH_KEY` | Private SSH key untuk akses VPS | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

### 2. Application Environment Variables

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `JWT_SECRET` | Secret key untuk JWT tokens | `your-super-secret-jwt-key-min-32-chars` |
| `XENDIT_SECRET_KEY` | Xendit payment gateway secret | `xnd_development_...` atau `xnd_production_...` |
| `WHATSAPP_API_KEY` | WhatsApp API key untuk notifikasi | `your-whatsapp-api-key` |
| `DATABASE_URL` | Database connection string | `file:/var/lib/lodge-family/production.db` |

## 🔑 SSH Key Setup

### 1. Generate SSH Key Pair

Di komputer lokal Anda, jalankan:

```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -C "github-actions@yourdomain.com" -f ~/.ssh/lodge-family-deploy

# Copy public key
cat ~/.ssh/lodge-family-deploy.pub
```

### 2. Add Public Key to VPS

Login ke VPS dan tambahkan public key:

```bash
# Login ke VPS
ssh root@your-vps-ip

# Switch to application user
su - lodge-family

# Add public key to authorized_keys
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "your-public-key-here" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 3. Add Private Key to GitHub Secrets

Copy private key dan tambahkan ke GitHub Secrets sebagai `VPS_SSH_KEY`:

```bash
cat ~/.ssh/lodge-family-deploy
```

## 🌍 Environment Variables Template

Berikut template untuk file `.env` di VPS (`/home/lodge-family/.env.production`):

```env
# Production Environment Variables
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL="file:/var/lib/lodge-family/production.db"

# JWT Secret (WAJIB DIGANTI!)
JWT_SECRET="your-super-secret-jwt-key-change-this-min-32-characters"

# Payment Gateway
XENDIT_SECRET_KEY="xnd_production_your_actual_xendit_key"

# WhatsApp Integration
WHATSAPP_API_KEY="your-whatsapp-api-key"
WHATSAPP_PHONE_NUMBER="your-whatsapp-business-number"

# Domain Configuration
DOMAIN="yourdomain.com"
FRONTEND_URL="https://yourdomain.com"
BACKEND_URL="https://yourdomain.com/api"

# CORS Settings
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# File Upload
MAX_FILE_SIZE="10MB"
UPLOAD_PATH="/var/www/lodge-family-current/uploads"

# Email Configuration (optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Logging
LOG_LEVEL="info"
LOG_FILE="/var/log/lodge-family/app.log"
```

## 🚀 Deployment Trigger

Setelah semua secrets dikonfigurasi, deployment akan otomatis berjalan ketika:

1. **Push ke branch main** - Otomatis deploy
2. **Manual trigger** - Dari GitHub Actions tab

### Manual Deployment

1. Buka repository GitHub
2. Klik tab "Actions"
3. Pilih "Deploy to VPS" workflow
4. Klik "Run workflow"
5. Pilih environment (production/staging)
6. Klik "Run workflow"

## 🔍 Monitoring Deployment

### GitHub Actions Logs

- Buka tab "Actions" di repository
- Klik pada workflow run yang sedang berjalan
- Monitor setiap step deployment

### VPS Logs

```bash
# Login ke VPS
ssh lodge-family@your-vps-ip

# Check service status
sudo systemctl status lodge-family-backend
sudo systemctl status lodge-family-frontend

# View logs
tail -f /var/log/lodge-family/backend.log
tail -f /var/log/lodge-family/frontend.log

# Run health check
/usr/local/bin/lodge-family-health-check
```

## 🛠️ Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   ```bash
   # Test SSH connection
   ssh -i ~/.ssh/lodge-family-deploy lodge-family@your-vps-ip
   ```

2. **Permission Denied**
   ```bash
   # Check file permissions on VPS
   ls -la /home/lodge-family/.ssh/
   chmod 600 /home/lodge-family/.ssh/authorized_keys
   ```

3. **Service Start Failed**
   ```bash
   # Check service logs
   journalctl -u lodge-family-backend -f
   journalctl -u lodge-family-frontend -f
   ```

4. **Database Migration Failed**
   ```bash
   # Manual migration
   cd /var/www/lodge-family-current
   npx prisma migrate deploy
   ```

## 📋 Deployment Checklist

- [ ] VPS setup completed (`setup-vps.sh`)
- [ ] SSH keys generated and configured
- [ ] GitHub secrets added
- [ ] Environment variables configured
- [ ] Domain DNS pointing to VPS
- [ ] SSL certificate installed
- [ ] First deployment tested
- [ ] Health checks passing
- [ ] Monitoring setup

## 🔄 Rollback Procedure

Jika deployment gagal, sistem akan otomatis rollback. Untuk manual rollback:

```bash
# Login ke VPS
ssh lodge-family@your-vps-ip

# Run rollback
./scripts/manual-deploy.sh rollback
```

## 📞 Support

Jika mengalami masalah:

1. Check GitHub Actions logs
2. Check VPS logs
3. Run health check script
4. Review this documentation
5. Contact system administrator