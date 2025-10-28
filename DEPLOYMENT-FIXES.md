# 🚀 Deployment Fixes - Localhost ke VPS

## 📋 Masalah yang Ditemukan

### 1. **Environment Variables Tidak Sesuai**
- ❌ Frontend masih menggunakan `http://localhost:5001` 
- ❌ Backend menggunakan URL yang salah
- ✅ **Diperbaiki**: Semua URL diubah ke `https://family.thelodgegroup.id`

### 2. **Nginx Configuration Error**
- ❌ Nginx menggunakan port 3003, PM2 menggunakan port 3000
- ✅ **Diperbaiki**: Nginx diubah ke port 3000

### 3. **PM2 Configuration Tidak Lengkap**
- ❌ Environment variables tidak dikonfigurasi dengan benar
- ✅ **Diperbaiki**: Ditambahkan semua env vars yang diperlukan

## 🔧 File yang Diperbaiki

### Backend Environment (`.env.vps`)
```env
# Database
DATABASE_URL="mysql://root:password@localhost:3306/thelodgefamily"

# Application URLs
APP_URL="https://family.thelodgegroup.id"
FRONTEND_URL="https://family.thelodgegroup.id"

# Security
JWT_SECRET="your-jwt-secret"
QR_HMAC_SECRET="your-qr-secret"

# Email & Payment Gateway
# ... (konfigurasi lengkap)
```

### Frontend Environment (`.env.production`)
```env
NEXT_PUBLIC_API_URL=https://family.thelodgegroup.id
NEXT_PUBLIC_XENDIT_PUBLIC_KEY=xnd_development_...
NODE_ENV=production
```

### Nginx Configuration
```nginx
# API routes ke port 5001 (backend)
location /api/ {
    proxy_pass http://localhost:5001;
}

# Frontend routes ke port 3000 (bukan 3003)
location / {
    proxy_pass http://localhost:3000;
}
```

### PM2 Configuration (`ecosystem.config.js`)
```javascript
{
  name: 'thelodgefamily-backend',
  script: 'npm',
  args: 'start',
  cwd: './backend',
  env_production: {
    NODE_ENV: 'production',
    PORT: 5001,
    DATABASE_URL: 'mysql://root:password@localhost:3306/thelodgefamily',
    APP_URL: 'https://family.thelodgegroup.id',
    FRONTEND_URL: 'https://family.thelodgegroup.id'
  }
}
```

## 🚀 Cara Deploy

### Option 1: Menggunakan Script Otomatis

#### Di Windows (Persiapan):
```powershell
.\scripts\Deploy-ProductionFix.ps1
```

#### Di VPS (Deployment):
```bash
chmod +x scripts/deploy-production-fix.sh
./scripts/deploy-production-fix.sh
```

### Option 2: Manual Steps

#### 1. Stop PM2 Processes
```bash
pm2 stop all
pm2 delete all
```

#### 2. Copy Environment Files
```bash
cp backend/.env.vps backend/.env
cp frontend/.env.production frontend/.env.local
```

#### 3. Install Dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

#### 4. Build Frontend
```bash
cd frontend
npm run build
```

#### 5. Database Setup
```bash
cd backend
npx prisma generate
npx prisma db push
```

#### 6. Start PM2
```bash
pm2 start ecosystem.config.js --env production
```

#### 7. Reload Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 🔍 Troubleshooting

### Check PM2 Status
```bash
pm2 status
pm2 logs
pm2 logs thelodgefamily-backend
pm2 logs thelodgefamily-frontend
```

### Check Nginx Status
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### Check Database Connection
```bash
cd backend
npx prisma studio
```

### Common Issues & Solutions

#### 1. ChunkLoadError
- **Penyebab**: Frontend build tidak sesuai dengan environment
- **Solusi**: Rebuild frontend dengan environment yang benar

#### 2. API Connection Failed
- **Penyebab**: CORS atau URL tidak sesuai
- **Solusi**: Periksa NEXT_PUBLIC_API_URL dan CORS settings

#### 3. Database Connection Error
- **Penyebab**: DATABASE_URL tidak sesuai
- **Solusi**: Periksa kredensial database di .env

#### 4. SSL Certificate Issues
- **Penyebab**: Certificate expired atau tidak valid
- **Solusi**: Renew certificate dengan certbot

## 📊 Monitoring

### Health Check URLs
- Frontend: `https://family.thelodgegroup.id`
- Backend API: `https://family.thelodgegroup.id/api/health`
- Database: Check via Prisma Studio

### Performance Monitoring
```bash
# CPU & Memory usage
pm2 monit

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Application logs
pm2 logs --lines 50
```

## 🎯 Best Practices

1. **Always test in staging first**
2. **Use environment-specific configs**
3. **Monitor logs after deployment**
4. **Keep backups of working configurations**
5. **Use PM2 ecosystem file for consistency**
6. **Test SSL certificates regularly**
7. **Monitor database performance**

## 📞 Support

Jika masih ada masalah setelah mengikuti panduan ini:

1. Check PM2 logs: `pm2 logs`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify environment variables
4. Test database connection
5. Check SSL certificate status

---

**Last Updated**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Version**: 1.0.0