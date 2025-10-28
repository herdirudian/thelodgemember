# 📱 WhatsApp Verification Feature Deployment Guide

## 🎯 Overview
Panduan deployment untuk fitur verifikasi WhatsApp yang baru diimplementasikan, termasuk:
- Notifikasi verifikasi di dashboard member
- UI verifikasi yang ditingkatkan di halaman edit profil
- Status verifikasi yang lebih jelas
- Pengalaman pengguna yang lebih baik

## 🚀 Quick Deployment

### Option 1: Menggunakan PowerShell Script (Recommended untuk Windows)

```powershell
# Jalankan dari direktori project
.\scripts\Deploy-WhatsAppVerification.ps1 -VPSHost "your-vps-ip" -VPSUser "root"

# Dengan SSH key
.\scripts\Deploy-WhatsAppVerification.ps1 -VPSHost "your-vps-ip" -VPSUser "root" -SSHKeyPath "C:\path\to\your\key.pem"

# Skip backup (tidak disarankan untuk production)
.\scripts\Deploy-WhatsAppVerification.ps1 -VPSHost "your-vps-ip" -VPSUser "root" -SkipBackup
```

### Option 2: Menggunakan Bash Script (Linux/WSL/Git Bash)

```bash
# Upload script ke VPS
scp scripts/deploy-whatsapp-verification.sh root@your-vps-ip:/tmp/

# SSH ke VPS dan jalankan
ssh root@your-vps-ip
chmod +x /tmp/deploy-whatsapp-verification.sh
/tmp/deploy-whatsapp-verification.sh
```

### Option 3: Manual Deployment

```bash
# 1. SSH ke VPS
ssh root@your-vps-ip

# 2. Navigate ke direktori aplikasi
cd /var/www/thelodgefamily/current

# 3. Backup (opsional tapi disarankan)
mkdir -p ../shared/backups
tar -czf ../shared/backups/frontend_backup_$(date +%Y%m%d_%H%M%S).tar.gz frontend/

# 4. Pull latest changes
git stash
git pull origin main

# 5. Install dependencies
cd frontend && npm install
cd ../backend && npm install

# 6. Build frontend
cd ../frontend && npm run build

# 7. Update database schema
cd ../backend
npx prisma db push
npx prisma generate

# 8. Restart services
pm2 reload ecosystem.config.js --env production

# 9. Verify deployment
curl http://localhost:5000/api/health
curl http://localhost:3000
```

## 📋 Pre-Deployment Checklist

- [ ] VPS sudah running dan accessible via SSH
- [ ] Database backup sudah dibuat
- [ ] PM2 processes sudah running
- [ ] WhatsApp API credentials sudah dikonfigurasi di .env
- [ ] Domain sudah pointing ke VPS dengan benar

## 🔧 Files yang Akan Diupdate

### Frontend Changes:
```
frontend/src/app/(dashboard)/dashboard/page.tsx
├── ✅ Notifikasi verifikasi WhatsApp untuk member belum terverifikasi
├── ✅ Tombol "Verifikasi Sekarang" yang mengarah ke edit profil
└── ✅ Styling yang menarik dengan gradient dan responsive design

frontend/src/app/(dashboard)/profile/edit/page.tsx
├── ✅ UI verifikasi WhatsApp yang selalu tersedia untuk member belum terverifikasi
├── ✅ Tombol "Kirim Kode" yang selalu muncul jika belum terverifikasi
├── ✅ Pesan informatif untuk mendorong verifikasi
├── ✅ Status verifikasi visual yang jelas
└── ✅ Input kode verifikasi dengan validasi
```

### Backend (Sudah ada, tidak perlu update):
```
backend/src/routes/auth.ts
├── ✅ Endpoint /api/send-whatsapp-verification
├── ✅ Endpoint /api/verify-whatsapp-code
└── ✅ Update status isPhoneVerified setelah verifikasi berhasil
```

## 🧪 Post-Deployment Testing

### 1. Test Dashboard Notification
```bash
# Akses dashboard sebagai member yang belum terverifikasi
curl -H "Authorization: Bearer <token>" http://your-domain.com/dashboard
```

### 2. Test Profile Edit Page
```bash
# Akses halaman edit profil
curl -H "Authorization: Bearer <token>" http://your-domain.com/profile/edit
```

### 3. Test WhatsApp Verification Flow
```bash
# Test send verification
curl -X POST -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"phone": "+6281234567890"}' \
     http://your-domain.com/api/send-whatsapp-verification

# Test verify code
curl -X POST -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"phone": "+6281234567890", "verificationCode": "123456"}' \
     http://your-domain.com/api/verify-whatsapp-code
```

## 🔍 Monitoring & Troubleshooting

### Check Application Status
```bash
# PM2 status
pm2 status

# Application logs
pm2 logs thelodgefamily-backend
pm2 logs thelodgefamily-frontend

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Common Issues & Solutions

#### 1. Frontend Build Fails
```bash
# Clear npm cache and reinstall
cd /var/www/thelodgefamily/current/frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
npm run build
```

#### 2. Database Schema Issues
```bash
# Reset Prisma and regenerate
cd /var/www/thelodgefamily/current/backend
npx prisma db push --force-reset
npx prisma generate
```

#### 3. PM2 Process Issues
```bash
# Restart all processes
pm2 restart all

# Or restart specific process
pm2 restart thelodgefamily-backend
pm2 restart thelodgefamily-frontend
```

## 🆘 Rollback Instructions

Jika deployment gagal, gunakan salah satu metode berikut:

### Quick Rollback
```bash
cd /var/www/thelodgefamily
./scripts/rollback.sh
```

### Manual Rollback
```bash
# Restore from backup
cd /var/www/thelodgefamily
tar -xzf shared/backups/frontend_backup_TIMESTAMP.tar.gz -C current/

# Restart services
pm2 reload ecosystem.config.js --env production
```

## 📊 Success Indicators

Deployment berhasil jika:
- ✅ Backend health check returns 200
- ✅ Frontend loads without errors
- ✅ Dashboard shows verification notification for unverified members
- ✅ Profile edit page shows "Kirim Kode" button
- ✅ WhatsApp verification endpoints respond correctly
- ✅ No errors in PM2 logs

## 📞 Support

Jika mengalami masalah:
1. Check logs: `pm2 logs`
2. Verify configuration: `cat /var/www/thelodgefamily/shared/.env`
3. Test endpoints manually dengan curl
4. Rollback jika diperlukan

## 🎉 Features Deployed

Setelah deployment berhasil, fitur-fitur berikut akan tersedia:

### 📱 Dashboard Notification
- Notifikasi muncul untuk member yang belum verifikasi WhatsApp
- Design menarik dengan gradient orange/amber
- Tombol "Verifikasi Sekarang" mengarah ke edit profil
- Tombol "Nanti Saja" untuk menyembunyikan sementara

### 🔧 Enhanced Profile Edit
- Tombol "Kirim Kode" selalu tersedia untuk member belum terverifikasi
- Pesan informatif mendorong verifikasi
- UI input kode verifikasi yang user-friendly
- Status verifikasi visual yang jelas
- Tombol "Kirim ulang kode" jika diperlukan

### ✅ Improved UX
- Alur verifikasi yang lebih intuitif
- Feedback visual yang jelas
- Responsive design untuk semua device
- Error handling yang lebih baik