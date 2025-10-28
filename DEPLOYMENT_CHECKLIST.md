# ✅ Deployment Checklist - The Lodge Family

## 🔍 Pre-Deployment Checklist

### 📋 Development Phase
- [ ] **Code Review**
  - [ ] Code mengikuti standar yang sudah ada
  - [ ] Tidak ada hardcoded values (gunakan environment variables)
  - [ ] TypeScript types sudah benar
  - [ ] Tidak ada console.log yang tidak perlu

- [ ] **Environment Variables**
  - [ ] Update .env.example dengan variable baru
  - [ ] Pastikan .env.vps sudah update
  - [ ] Tidak ada sensitive data di code

- [ ] **Database Changes**
  - [ ] Prisma schema sudah update
  - [ ] Migration files sudah dibuat
  - [ ] Backup database lokal sudah dibuat

### 🧪 Testing Phase
- [ ] **Local Testing**
  - [ ] Backend build berhasil (`npm run build`)
  - [ ] Frontend build berhasil (`npm run build`)
  - [ ] Tidak ada TypeScript errors
  - [ ] Tidak ada linting errors

- [ ] **Functional Testing**
  - [ ] Login/logout berfungsi normal
  - [ ] API endpoints merespons dengan benar
  - [ ] Database operations berjalan lancar
  - [ ] UI tidak broken di desktop
  - [ ] UI tidak broken di mobile
  - [ ] Form validation berfungsi

- [ ] **Integration Testing**
  - [ ] Frontend-backend communication normal
  - [ ] Database connection stable
  - [ ] External API (jika ada) berfungsi

## 🚀 Deployment Phase

### 📦 Pre-Deployment
- [ ] **Backup Production**
  - [ ] Database backup dibuat
  - [ ] Application files backup dibuat
  - [ ] Backup disimpan dengan timestamp

- [ ] **Version Control**
  - [ ] Code sudah di-commit
  - [ ] Branch sudah di-merge ke main
  - [ ] Tag version sudah dibuat

### 🔧 Backend Deployment
- [ ] **File Upload**
  - [ ] Backend files uploaded ke VPS
  - [ ] .env.vps sudah update di server
  - [ ] File permissions sudah benar

- [ ] **Dependencies & Build**
  - [ ] `npm install` berhasil
  - [ ] Database migration berhasil (jika ada)
  - [ ] PM2 restart berhasil

- [ ] **Health Check**
  - [ ] PM2 status menunjukkan "online"
  - [ ] Logs tidak menunjukkan error
  - [ ] API endpoint `/api` merespons 200

### 🎨 Frontend Deployment
- [ ] **Build & Upload**
  - [ ] Frontend build di local berhasil
  - [ ] .next folder uploaded ke VPS
  - [ ] package.json updated di server

- [ ] **Service Restart**
  - [ ] `npm install` berhasil (jika ada dependency baru)
  - [ ] PM2 restart berhasil
  - [ ] PM2 status menunjukkan "online"

- [ ] **Health Check**
  - [ ] Frontend logs tidak ada error
  - [ ] Port 3003 accessible
  - [ ] Website loading normal

### 🌐 Infrastructure Check
- [ ] **Nginx Configuration**
  - [ ] Nginx config syntax valid (`nginx -t`)
  - [ ] Nginx reload berhasil
  - [ ] Proxy pass ke port yang benar

- [ ] **SSL Certificate**
  - [ ] SSL certificate masih valid
  - [ ] HTTPS redirect berfungsi
  - [ ] No SSL warnings

## ✅ Post-Deployment Verification

### 🔍 Immediate Checks (5 menit pertama)
- [ ] **Website Accessibility**
  - [ ] https://family.thelodgegroup.id accessible
  - [ ] Login page loading
  - [ ] No 502/500 errors

- [ ] **API Functionality**
  - [ ] `/api` endpoint merespons
  - [ ] Login API berfungsi
  - [ ] Database queries berjalan

- [ ] **Process Status**
  - [ ] PM2 processes running stable
  - [ ] No restart loops
  - [ ] Memory usage normal

### 🕐 Extended Monitoring (30 menit)
- [ ] **Performance Check**
  - [ ] Page load time acceptable
  - [ ] API response time normal
  - [ ] No memory leaks

- [ ] **Error Monitoring**
  - [ ] No errors in PM2 logs
  - [ ] No errors in Nginx logs
  - [ ] No database connection issues

- [ ] **User Experience**
  - [ ] All major features working
  - [ ] Forms submitting correctly
  - [ ] Navigation working properly

## 🚨 Rollback Checklist (Jika Ada Masalah)

### ⚡ Quick Rollback
- [ ] **Stop Current Processes**
  - [ ] Stop PM2 processes
  - [ ] Note down error messages

- [ ] **Restore Backup**
  - [ ] Restore database from backup
  - [ ] Restore application files
  - [ ] Restart services

- [ ] **Verify Rollback**
  - [ ] Website accessible again
  - [ ] All functions working
  - [ ] No data loss

### 📝 Post-Rollback Actions
- [ ] **Document Issues**
  - [ ] Record what went wrong
  - [ ] Save error logs
  - [ ] Plan fix strategy

- [ ] **Notify Stakeholders**
  - [ ] Inform about rollback
  - [ ] Provide timeline for fix
  - [ ] Update status

## 📊 Success Criteria

### ✅ Deployment Berhasil Jika:
- [ ] Website accessible via HTTPS
- [ ] Login functionality working
- [ ] API endpoints responding
- [ ] No 500/502 errors
- [ ] PM2 processes stable
- [ ] New features functioning as expected
- [ ] No performance degradation

### 📈 Performance Benchmarks
- [ ] Page load time < 3 seconds
- [ ] API response time < 1 second
- [ ] Memory usage < 80%
- [ ] CPU usage normal
- [ ] No database connection timeouts

## 🔧 Emergency Commands

### Quick Status Check
```bash
# Check all services
pm2 status && systemctl status nginx

# Check website
curl -I https://family.thelodgegroup.id

# Check API
curl https://family.thelodgegroup.id/api
```

### Emergency Restart
```bash
# Restart all services
pm2 restart all
systemctl reload nginx

# Check logs
pm2 logs --lines 20
```

### Emergency Rollback
```bash
# Restore from backup
mysql -u root -p thelodgefamily < /var/backups/backup_LATEST.sql
tar -xzf /var/backups/app_backup_LATEST.tar.gz -C /var/www/
pm2 restart all
```

---

**💡 Pro Tips:**
- Selalu ikuti checklist ini step by step
- Jangan skip testing phase
- Backup adalah kunci keamanan deployment
- Monitor logs selama 30 menit setelah deployment
- Dokumentasikan setiap masalah yang ditemukan