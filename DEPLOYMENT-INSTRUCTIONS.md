# 🚀 DEPLOYMENT INSTRUCTIONS - The Lodge Family

## Deployment Package Ready!

Semua file deployment telah disiapkan dan siap untuk di-deploy ke VPS `family.thelodgegroup.id`. Berikut adalah instruksi lengkap untuk melakukan deployment.

## 📋 Yang Sudah Disiapkan

### ✅ Deployment Package Lengkap
- **Lokasi**: `C:\xampp\htdocs\newthelodgefamily\deployment-packages\thelodgefamily-final-deployment-20251027_210438\`
- **Isi**: Aplikasi backend & frontend, konfigurasi Nginx, skrip monitoring, dokumentasi lengkap

### ✅ Skrip Deployment Otomatis
- **PowerShell**: `C:\xampp\htdocs\newthelodgefamily\DEPLOY-TO-VPS.ps1`
- **Bash**: `C:\xampp\htdocs\newthelodgefamily\deploy-to-vps.sh`

### ✅ Konfigurasi Environment
- **Backend**: `.env.production` dengan pengaturan produksi
- **Frontend**: `.env.production` dengan URL yang benar
- **Nginx**: Konfigurasi domain `family.thelodgegroup.id`

### ✅ Dokumentasi Lengkap
- **Panduan Deployment**: `VPS-DEPLOYMENT-GUIDE.md`
- **Quick Start**: `QUICK-DEPLOY.md`
- **Troubleshooting**: `TROUBLESHOOTING-GUIDE.md`

## 🔧 Informasi yang Diperlukan

Sebelum menjalankan deployment, pastikan Anda memiliki:

### 1. Akses VPS
- **Hostname**: `family.thelodgegroup.id`
- **Username**: [Username SSH Anda]
- **SSH Key**: Sudah dikonfigurasi untuk akses tanpa password
- **Sudo Access**: User memiliki akses sudo

### 2. Kredensial Database
- **Database Password**: Password untuk user `lodge_user`
- **Root Password**: Password MySQL root

### 3. Kredensial Email (Opsional)
- **SMTP Host**: Server email untuk notifikasi
- **Email & Password**: Kredensial email

### 4. Kredensial Payment Gateway
- **Xendit Secret Key**: Kunci rahasia Xendit
- **Xendit Public Key**: Kunci publik Xendit

## 🚀 Cara Deployment

### Opsi 1: Deployment Otomatis (Recommended)

#### Windows PowerShell:
```powershell
# Buka PowerShell sebagai Administrator
cd C:\xampp\htdocs\newthelodgefamily

# Test koneksi terlebih dahulu
.\DEPLOY-TO-VPS.ps1 -VPSUser "your-username" -TestOnly

# Jika test berhasil, jalankan deployment
.\DEPLOY-TO-VPS.ps1 -VPSUser "your-username"
```

#### Linux/macOS/WSL:
```bash
# Buka terminal
cd /path/to/newthelodgefamily

# Buat script executable
chmod +x deploy-to-vps.sh

# Test koneksi terlebih dahulu
./deploy-to-vps.sh -u your-username -t

# Jika test berhasil, jalankan deployment
./deploy-to-vps.sh -u your-username
```

### Opsi 2: Deployment Manual

Ikuti panduan lengkap di `VPS-DEPLOYMENT-GUIDE.md` untuk deployment manual step-by-step.

## 📝 Langkah-Langkah Deployment

Skrip otomatis akan melakukan:

1. ✅ **Verifikasi Prerequisites**
   - Cek koneksi SSH ke VPS
   - Validasi deployment package
   - Cek tools yang diperlukan

2. ✅ **Backup Current Deployment**
   - Backup aplikasi yang ada (jika ada)
   - Simpan di `/backup/backup-YYYYMMDD_HHMMSS/`

3. ✅ **Upload Files**
   - Upload deployment package ke `/var/www/html/`
   - Sinkronisasi dengan rsync

4. ✅ **Setup Environment**
   - Install Node.js 18.x
   - Install Nginx, MySQL, PM2
   - Konfigurasi services

5. ✅ **Database Configuration**
   - Setup database `thelodgefamily`
   - Install dependencies backend
   - Jalankan Prisma migrations

6. ✅ **Frontend Build**
   - Install dependencies frontend
   - Build aplikasi Next.js

7. ✅ **Nginx & SSL Setup**
   - Konfigurasi Nginx untuk domain
   - Install SSL certificate dengan Let's Encrypt

8. ✅ **Application Deployment**
   - Deploy dengan PM2
   - Setup auto-restart
   - Konfigurasi monitoring

9. ✅ **Verification**
   - Test semua endpoints
   - Verifikasi SSL
   - Cek status services

## 🔐 Update Environment Variables

Setelah deployment, Anda perlu update environment variables:

### Backend (.env)
```bash
# Connect ke VPS
ssh your-username@family.thelodgegroup.id

# Edit backend environment
cd /var/www/html/backend
nano .env

# Update values:
DATABASE_URL="mysql://lodge_user:YOUR_DB_PASSWORD@localhost:3306/thelodgefamily"
JWT_SECRET="YOUR_SECURE_JWT_SECRET"
SMTP_USER="your-email@domain.com"
SMTP_PASS="your-email-password"
XENDIT_SECRET_KEY="your-xendit-secret"
XENDIT_PUBLIC_KEY="your-xendit-public"
```

### Frontend (.env.local)
```bash
# Edit frontend environment
cd /var/www/html/frontend
nano .env.local

# Update values:
NEXT_PUBLIC_XENDIT_PUBLIC_KEY="your-xendit-public-key"
```

### Restart Application
```bash
# Restart aplikasi setelah update environment
pm2 restart all
```

## 🎯 Verifikasi Deployment

Setelah deployment selesai, verifikasi:

### 1. Cek Status Services
```bash
pm2 status
sudo systemctl status nginx
sudo systemctl status mysql
```

### 2. Test Endpoints
- **Frontend**: https://family.thelodgegroup.id
- **API Health**: https://family.thelodgegroup.id/api/health
- **Admin Panel**: https://family.thelodgegroup.id/admin

### 3. Create Admin User
```bash
cd /var/www/html/backend
node create-admin.js
```

## 🆘 Troubleshooting

Jika ada masalah, cek:

### Log Files
```bash
# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
```

### Common Issues
- **Port 80/443 blocked**: Cek firewall VPS
- **Database connection**: Verifikasi kredensial database
- **SSL certificate**: Pastikan domain pointing ke VPS IP
- **Permission issues**: Jalankan `sudo chown -R www-data:www-data /var/www/html`

## 📞 Support

Jika memerlukan bantuan:
- **Documentation**: Lihat `TROUBLESHOOTING-GUIDE.md`
- **Logs**: Cek file log deployment di `deployment-YYYYMMDD_HHMMSS.log`
- **Manual Steps**: Ikuti `VPS-DEPLOYMENT-GUIDE.md`

---

## 🎉 Ready to Deploy!

**Deployment package sudah 100% siap!** 

Jalankan salah satu skrip deployment di atas dengan kredensial VPS Anda, dan aplikasi The Lodge Family akan online dalam 5-10 menit.

**Pastikan**:
1. ✅ SSH key sudah dikonfigurasi
2. ✅ Domain `family.thelodgegroup.id` pointing ke VPS IP
3. ✅ VPS memiliki akses internet
4. ✅ User memiliki sudo privileges

**Selamat deployment!** 🚀