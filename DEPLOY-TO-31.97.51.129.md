# 🚀 Panduan Deployment ke VPS 31.97.51.129

## ✅ Status Persiapan
- ✅ SSH connection berhasil ditest ke `root@31.97.51.129`
- ✅ Deployment package siap: `deployment-packages\vps-fix-deployment-20251028_160850`
- ✅ Konfigurasi telah diperbaiki (port mismatch, API URLs)

## 📋 Langkah Deployment

### Langkah 1: Upload Files ke VPS

Buka Command Prompt atau PowerShell baru dan jalankan:

```cmd
cd C:\xampp\htdocs\newthelodgefamily
scp -r deployment-packages\vps-fix-deployment-20251028_160850\* root@31.97.51.129:/var/www/thelodgefamily/current/
```

**Catatan**: Anda akan diminta memasukkan password VPS.

### Langkah 2: SSH ke VPS dan Jalankan Deployment

```cmd
ssh root@31.97.51.129
```

Setelah berhasil login ke VPS, jalankan perintah berikut:

```bash
# Masuk ke direktori aplikasi
cd /var/www/thelodgefamily/current

# Berikan permission execute pada script
chmod +x fix-vps-blank-page.sh

# Jalankan script deployment
./fix-vps-blank-page.sh
```

### Langkah 3: Verifikasi Deployment

Setelah script selesai, test website:

```bash
# Test website
curl -I https://family.thelodgegroup.id

# Test API
curl https://family.thelodgegroup.id/api/health

# Check PM2 status
pm2 status

# Check Nginx status
systemctl status nginx
```

## 🔧 Jika Ada Masalah

### Jika script gagal, jalankan manual:

```bash
# 1. Stop PM2
pm2 stop all
pm2 delete all

# 2. Setup environment
cp backend/.env.vps backend/.env
cp frontend/.env.production frontend/.env.local

# 3. Install backend dependencies
cd backend
npm install
npx prisma generate
npx prisma migrate deploy

# 4. Install frontend dependencies dan build
cd ../frontend
npm install
npm run build

# 5. Set permissions
cd ..
chown -R www-data:www-data .
chmod -R 755 .

# 6. Start PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 7. Update Nginx
cp nginx-family-domain-fixed.conf /etc/nginx/sites-available/family.thelodgegroup.id
nginx -t
systemctl reload nginx
```

### Check Logs jika ada error:

```bash
# PM2 logs
pm2 logs

# Nginx logs
tail -f /var/log/nginx/error.log
```

## 🎯 Hasil yang Diharapkan

Setelah deployment berhasil:
- ✅ Website `https://family.thelodgegroup.id` tidak lagi kosong
- ✅ Frontend berjalan di port 3003
- ✅ Backend berjalan di port 5001
- ✅ API endpoint tersedia di `/api/*`

## 📞 Troubleshooting

Jika masih ada masalah, periksa:

1. **Database connection**: Pastikan MySQL berjalan di VPS
2. **SSL Certificate**: Pastikan Let's Encrypt certificate aktif
3. **Firewall**: Pastikan port 80, 443, 3003, 5001 terbuka
4. **DNS**: Pastikan domain mengarah ke IP 31.97.51.129

---

**💡 Tips**: Simpan output dari setiap command untuk troubleshooting jika diperlukan.