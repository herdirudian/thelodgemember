# 🚀 Panduan Perbaikan Tampilan VPS

## 🎯 Masalah yang Diperbaiki

Tampilan di VPS hosting (31.97.51.129) tidak sesuai dengan localhost karena:

1. **Environment Variables**: Konfigurasi API URL tidak tepat untuk production
2. **Frontend Build**: Build frontend menggunakan konfigurasi development
3. **API Rewrites**: Next.js rewrites tidak berfungsi optimal di production
4. **Service Configuration**: PM2 dan Nginx perlu restart dengan konfigurasi terbaru

## 🛠️ Solusi Otomatis

### Metode 1: Menggunakan PowerShell Script (Recommended)

1. **Buka PowerShell sebagai Administrator**
   ```powershell
   cd C:\xampp\htdocs\newthelodgefamily
   ```

2. **Jalankan script perbaikan**
   ```powershell
   .\Fix-VPS-Display.ps1
   ```

3. **Masukkan password VPS** ketika diminta

4. **Tunggu proses selesai** (sekitar 3-5 menit)

### Metode 2: Manual SSH

Jika PowerShell script tidak berfungsi, ikuti langkah manual:

1. **SSH ke VPS**
   ```bash
   ssh root@31.97.51.129
   ```

2. **Upload script perbaikan**
   ```bash
   # Di komputer lokal (Command Prompt baru)
   cd C:\xampp\htdocs\newthelodgefamily
   scp fix-vps-display.sh root@31.97.51.129:/var/www/thelodgefamily/current/
   ```

3. **Jalankan script di VPS**
   ```bash
   # Di VPS
   cd /var/www/thelodgefamily/current
   chmod +x fix-vps-display.sh
   ./fix-vps-display.sh
   ```

## 🔍 Verifikasi Perbaikan

Setelah script selesai, periksa:

### 1. Website Utama
- Buka: https://family.thelodgegroup.id
- Pastikan tampilan sesuai dengan localhost
- Periksa login dan navigasi berfungsi

### 2. API Endpoints
- Test: https://family.thelodgegroup.id/api/health
- Harus mengembalikan response JSON yang valid

### 3. Services Status
```bash
# SSH ke VPS
ssh root@31.97.51.129

# Periksa PM2
pm2 status

# Periksa logs
pm2 logs

# Periksa Nginx
systemctl status nginx
```

## 🔧 Detail Perbaikan yang Dilakukan

### 1. Environment Variables Frontend
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://family.thelodgegroup.id/api
NEXT_PUBLIC_XENDIT_PUBLIC_KEY=xnd_public_development_ZmDaRXsyswaNKu1JOxiNKxy79NZ4YGMi7tvvL66Z2I6zWqAecypFh2EadYmzGfc
```

### 2. Environment Variables Backend
```env
DATABASE_URL="mysql://root:BI5mill4h%40%40%40@localhost:3306/lodge_family_db"
PORT=5001
APP_URL=https://family.thelodgegroup.id
FRONTEND_URL=https://family.thelodgegroup.id
JWT_SECRET=lodge_family_jwt_secret_2025_production_key
QR_HMAC_SECRET=secure_qr_secret
```

### 3. Frontend Rebuild
- Hapus build lama (`.next` folder)
- Build ulang dengan `NODE_ENV=production`
- Pastikan static assets ter-generate dengan benar

### 4. Service Restart
- Stop semua PM2 processes
- Start ulang dengan `ecosystem.config.js --env production`
- Restart Nginx untuk konfigurasi terbaru

## 🚨 Troubleshooting

### Masalah: SSH Connection Failed
**Solusi:**
```bash
# Test koneksi SSH
ssh -v root@31.97.51.129

# Jika gagal, periksa:
# 1. Internet connection
# 2. VPS status
# 3. SSH key/password
```

### Masalah: Permission Denied
**Solusi:**
```bash
# Pastikan user memiliki akses root
sudo su -

# Atau gunakan sudo untuk setiap command
sudo chmod +x fix-vps-display.sh
sudo ./fix-vps-display.sh
```

### Masalah: Frontend Build Failed
**Solusi:**
```bash
# Manual build frontend
cd /var/www/thelodgefamily/current/frontend
rm -rf .next node_modules
npm install
NODE_ENV=production npm run build
```

### Masalah: API Not Responding
**Solusi:**
```bash
# Periksa backend logs
pm2 logs thelodge-backend

# Restart backend saja
pm2 restart thelodge-backend

# Periksa database connection
cd /var/www/thelodgefamily/current/backend
npx prisma db push
```

### Masalah: Nginx 502 Bad Gateway
**Solusi:**
```bash
# Periksa Nginx config
nginx -t

# Restart Nginx
systemctl restart nginx

# Periksa port conflicts
netstat -tulpn | grep :80
netstat -tulpn | grep :443
```

## 📊 Monitoring

### Real-time Monitoring
```bash
# Monitor PM2 processes
pm2 monit

# Monitor Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Monitor system resources
htop
```

### Health Checks
```bash
# Test endpoints
curl -I https://family.thelodgegroup.id
curl https://family.thelodgegroup.id/api/health

# Test internal services
curl -I http://localhost:3003
curl http://localhost:5001/api/health
```

## 🎯 Expected Results

Setelah perbaikan berhasil:

1. ✅ Website https://family.thelodgegroup.id tampil dengan benar
2. ✅ Login dan registrasi berfungsi normal
3. ✅ Dashboard dan semua fitur dapat diakses
4. ✅ API endpoints merespons dengan benar
5. ✅ Tidak ada error 404, 500, atau blank page
6. ✅ Tampilan sesuai dengan localhost development

## 📞 Support

Jika masih ada masalah setelah mengikuti panduan ini:

1. **Periksa logs** dengan `pm2 logs`
2. **Screenshot error** yang muncul
3. **Catat langkah** yang sudah dilakukan
4. **Test di browser berbeda** (Chrome, Firefox, Safari)
5. **Clear browser cache** dan cookies

---

**Dibuat:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**Target VPS:** 31.97.51.129  
**Domain:** https://family.thelodgegroup.id