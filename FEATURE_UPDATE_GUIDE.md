# 🚀 Panduan Update Fitur - The Lodge Family

## 📋 Langkah-Langkah Update Fitur yang Aman

### 1. 🔧 Persiapan Development

#### A. Setup Environment Lokal
```bash
# Pastikan semua dependency up-to-date
cd backend && npm install
cd ../frontend && npm install

# Jalankan development server
npm run dev  # di kedua folder (backend & frontend)
```

#### B. Backup Database (WAJIB!)
```bash
# Backup database sebelum perubahan apapun
mysqldump -u root -p thelodgefamily > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. 🛠️ Development Process

#### A. Buat Branch Baru
```bash
git checkout -b feature/nama-fitur-baru
```

#### B. Development Guidelines
- ✅ **Selalu test di local terlebih dahulu**
- ✅ **Ikuti struktur folder yang sudah ada**
- ✅ **Gunakan TypeScript dengan proper typing**
- ✅ **Update .env.example jika ada environment variable baru**

### 3. 🧪 Testing Sebelum Deploy

#### A. Testing Lokal (WAJIB!)
```bash
# Backend Testing
cd backend
npm run build    # Pastikan build berhasil
npm run test     # Jika ada test suite

# Frontend Testing  
cd frontend
npm run build    # Pastikan build berhasil
npm run lint     # Check linting errors
```

#### B. Manual Testing Checklist
- [ ] Login/logout berfungsi
- [ ] API endpoints merespons dengan benar
- [ ] UI/UX tidak broken
- [ ] Mobile responsive
- [ ] Database operations berjalan normal

### 4. 📦 Pre-Deployment Preparation

#### A. Update Version & Documentation
```bash
# Update package.json version
npm version patch  # atau minor/major

# Update CHANGELOG.md atau README.md jika perlu
```

#### B. Environment Variables Check
```bash
# Pastikan .env.vps sudah update dengan variable baru
# Bandingkan dengan .env.example
```

### 5. 🚀 Deployment ke VPS

#### A. Backup Production (WAJIB!)
```bash
# SSH ke VPS
ssh root@103.127.99.7

# Backup database production
mysqldump -u root -p thelodgefamily > /var/backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Backup aplikasi
tar -czf /var/backups/app_backup_$(date +%Y%m%d_%H%M%S).tar.gz /var/www/thelodgefamily/
```

#### B. Deploy Backend
```bash
# Upload backend changes
scp -r backend/ root@103.127.99.7:/var/www/thelodgefamily/

# SSH ke VPS
ssh root@103.127.99.7

cd /var/www/thelodgefamily/backend

# Install dependencies jika ada yang baru
npm install

# Restart backend dengan PM2
pm2 restart thelodgefamily-backend

# Check logs
pm2 logs thelodgefamily-backend --lines 10
```

#### C. Deploy Frontend
```bash
# Build frontend di local
cd frontend
npm run build

# Upload ke VPS
scp -r .next/ root@103.127.99.7:/var/www/thelodgefamily/frontend/
scp package.json root@103.127.99.7:/var/www/thelodgefamily/frontend/

# SSH ke VPS dan restart
ssh root@103.127.99.7
cd /var/www/thelodgefamily/frontend
npm install  # jika ada dependency baru
pm2 restart thelodgefamily-frontend

# Check logs
pm2 logs thelodgefamily-frontend --lines 10
```

### 6. ✅ Post-Deployment Verification

#### A. Health Check
```bash
# Test API
curl https://family.thelodgegroup.id/api

# Test Frontend
curl -I https://family.thelodgegroup.id

# Check PM2 status
pm2 status
```

#### B. Functional Testing
- [ ] Login page accessible
- [ ] API endpoints working
- [ ] New features functioning
- [ ] No broken links or 500 errors

### 7. 🔄 Rollback Plan (Jika Ada Error)

#### A. Quick Rollback
```bash
# Restore database
mysql -u root -p thelodgefamily < /var/backups/backup_YYYYMMDD_HHMMSS.sql

# Restore aplikasi
cd /var/www/
rm -rf thelodgefamily/
tar -xzf /var/backups/app_backup_YYYYMMDD_HHMMSS.tar.gz

# Restart services
pm2 restart all
systemctl reload nginx
```

### 8. 📊 Monitoring & Maintenance

#### A. Regular Checks
```bash
# Check PM2 processes
pm2 status

# Check disk space
df -h

# Check logs for errors
pm2 logs --lines 50
```

#### B. Automated Monitoring
```bash
# Setup cron job untuk backup otomatis
0 2 * * * mysqldump -u root -p thelodgefamily > /var/backups/daily_backup_$(date +\%Y\%m\%d).sql
```

## 🚨 PENTING - Hal yang WAJIB Diingat

### ❌ JANGAN PERNAH:
- Deploy langsung ke production tanpa testing lokal
- Skip backup database
- Update dependency major version tanpa testing
- Edit file langsung di production server
- Restart services tanpa check logs

### ✅ SELALU:
- Test di local environment dulu
- Backup database sebelum deploy
- Check logs setelah restart services
- Verify website accessibility setelah deploy
- Simpan backup file untuk rollback

## 📞 Emergency Contacts & Commands

### Quick Fix Commands
```bash
# Restart semua services
pm2 restart all && systemctl reload nginx

# Check what's running
pm2 status && systemctl status nginx

# View recent logs
pm2 logs --lines 20
```

### Troubleshooting Common Issues
1. **502 Bad Gateway** → Check PM2 processes dan port
2. **500 Internal Error** → Check backend logs
3. **Database Connection Error** → Check .env dan database status
4. **SSL Issues** → Check certbot dan nginx config

---

**💡 Tips:** Selalu dokumentasikan perubahan yang dibuat dan simpan backup sebelum melakukan update apapun!