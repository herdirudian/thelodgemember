# Panduan Backup dan Restore Project The Lodge Family

## 📁 Lokasi File Backup

### File Backup yang Tersedia:
1. **Database Backup**: `backup_thelodgefamily_20251016_205922.sql` (333 KB)
2. **Project Backup Folder**: `backup_project_20251016_210003/`
3. **Complete Backup ZIP**: `backup_thelodgefamily_complete_20251016_210037.zip`

## 🗄️ Isi Backup

### Database Backup
- **File**: `backup_thelodgefamily_20251016_205922.sql`
- **Ukuran**: 333,272 bytes
- **Berisi**: Semua tabel dan data dari database `thelodgefamily`
- **Format**: MySQL dump file

### Project Backup
- **Frontend**: Semua file Next.js aplikasi
- **Backend**: Semua file Node.js/Express server
- **Konfigurasi**: Package.json, tsconfig, eslint config
- **Dokumentasi**: README files dan dokumentasi project
- **Excludes**: node_modules, .git, file backup lainnya

## 🔄 Cara Restore

### 1. Restore Database
```bash
# Masuk ke MySQL
mysql -u root

# Buat database baru (jika belum ada)
CREATE DATABASE thelodgefamily;

# Keluar dari MySQL
exit

# Restore dari backup
mysql -u root thelodgefamily < backup_thelodgefamily_20251016_205922.sql
```

### 2. Restore Project Files
```bash
# Extract ZIP backup
Expand-Archive -Path "backup_thelodgefamily_complete_20251016_210037.zip" -DestinationPath "restored_project"

# Atau copy dari folder backup
Copy-Item -Path "backup_project_20251016_210003\*" -Destination "new_project_location" -Recurse

# Install dependencies
cd restored_project/backend
npm install

cd ../frontend
npm install
```

### 3. Setup Environment
```bash
# Backend - copy .env.example ke .env dan sesuaikan
cd backend
copy .env.example .env

# Edit .env file dengan konfigurasi database yang sesuai
```

### 4. Jalankan Project
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev

# Terminal 3 - MySQL (jika diperlukan)
C:\xampp\mysql\bin\mysqld.exe --defaults-file=C:\xampp\mysql\bin\my.ini --standalone --console
```

## ⚠️ Catatan Penting

1. **Database Password**: Backup dibuat dengan user `root` tanpa password (default XAMPP)
2. **Node Modules**: Tidak disertakan dalam backup, harus di-install ulang dengan `npm install`
3. **Environment Variables**: File `.env` tidak disertakan untuk keamanan, harus dibuat ulang
4. **Port Configuration**: 
   - Frontend: http://localhost:3003
   - Backend: http://localhost:5000
   - MySQL: localhost:3306

## 📋 Checklist Restore

- [ ] Database berhasil di-restore
- [ ] Backend dependencies ter-install
- [ ] Frontend dependencies ter-install
- [ ] File .env dikonfigurasi dengan benar
- [ ] Backend server berjalan di port 5000
- [ ] Frontend server berjalan di port 3003
- [ ] Koneksi database berhasil
- [ ] Login admin berfungsi
- [ ] Semua fitur aplikasi berjalan normal

## 🆘 Troubleshooting

### Database Connection Error
- Pastikan MySQL server berjalan
- Periksa konfigurasi database di file .env
- Pastikan user dan password database benar

### Port Already in Use
- Ganti port di konfigurasi jika port default sudah digunakan
- Atau stop service yang menggunakan port tersebut

### Missing Dependencies
- Jalankan `npm install` di folder backend dan frontend
- Periksa versi Node.js (minimal v18)

---
**Backup Created**: 16 Oktober 2025, 21:00 WIB  
**Project Version**: Latest dengan perbaikan NaN errors