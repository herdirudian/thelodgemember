# Instruksi Deployment VPS untuk Memperbaiki Halaman Kosong

## Status Saat Ini
✅ **Deployment package telah dibuat**: `deployment-packages\vps-fix-deployment-20251028_160850`

✅ **Masalah yang telah diperbaiki**:
- Port mismatch antara Nginx (3003) dan PM2 (3000) → sekarang keduanya menggunakan port 3003
- URL API frontend → diperbarui ke `https://family.thelodgegroup.id/api`
- Konfigurasi environment produksi telah disesuaikan

## Langkah Deployment ke VPS

### Opsi 1: Deployment Otomatis (Direkomendasikan)
Jika Anda memiliki akses SSH ke VPS, jalankan:

```powershell
.\Deploy-VPS-Fix.ps1
```

**Catatan**: Anda perlu mengupdate variabel berikut di script:
- `$VPSHost = "your-vps-ip"` → ganti dengan IP VPS Anda
- `$VPSUser = "root"` → sesuaikan dengan username SSH Anda

### Opsi 2: Deployment Manual

1. **Upload package ke VPS**:
   ```bash
   scp -r deployment-packages/vps-fix-deployment-20251028_160850/* root@your-vps-ip:/var/www/thelodgefamily/current/
   ```

2. **SSH ke VPS dan jalankan script**:
   ```bash
   ssh root@your-vps-ip
   cd /var/www/thelodgefamily/current
   chmod +x fix-vps-blank-page.sh
   ./fix-vps-blank-page.sh
   ```

### Opsi 3: Langkah Manual Lengkap

Jika script otomatis tidak berfungsi, ikuti langkah manual ini di VPS:

```bash
# 1. Masuk ke direktori aplikasi
cd /var/www/thelodgefamily/current

# 2. Stop proses PM2 yang sedang berjalan
pm2 stop all
pm2 delete all

# 3. Setup environment files
cp backend/.env.vps backend/.env
cp frontend/.env.production frontend/.env.local

# 4. Install dependencies backend
cd backend
npm install
npx prisma generate
npx prisma migrate deploy

# 5. Install dependencies dan build frontend
cd ../frontend
npm install
npm run build

# 6. Set permissions
cd ..
chown -R www-data:www-data .
chmod -R 755 .

# 7. Start PM2 dengan konfigurasi baru
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 8. Update dan restart Nginx
cp nginx-family-domain-fixed.conf /etc/nginx/sites-available/family.thelodgegroup.id
nginx -t
systemctl reload nginx

# 9. Check status
pm2 status
systemctl status nginx
```

## Verifikasi Deployment

Setelah deployment, periksa:

1. **Status PM2**: `pm2 status`
   - Backend harus berjalan di port 5001
   - Frontend harus berjalan di port 3003

2. **Status Nginx**: `systemctl status nginx`

3. **Test website**: Buka `https://family.thelodgegroup.id`

4. **Test API**: `curl https://family.thelodgegroup.id/api/health`

## Troubleshooting

Jika masih ada masalah:

1. **Check PM2 logs**:
   ```bash
   pm2 logs
   pm2 logs thelodge-backend
   pm2 logs thelodge-frontend
   ```

2. **Check Nginx logs**:
   ```bash
   tail -f /var/log/nginx/error.log
   tail -f /var/log/nginx/access.log
   ```

3. **Check database connection**:
   ```bash
   cd /var/www/thelodgefamily/current/backend
   npx prisma db push
   ```

## File yang Telah Diperbarui

- `ecosystem.config.js` → Frontend port diubah ke 3003
- `frontend/.env.production` → API URL diperbarui ke `/api`
- `fix-vps-blank-page.sh` → Script deployment otomatis
- `nginx-family-domain-fixed.conf` → Konfigurasi Nginx yang benar

---

**Catatan**: Pastikan VPS memiliki Node.js, npm, PM2, dan Nginx yang sudah terinstall sebelum menjalankan deployment.