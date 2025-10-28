# 🔧 Manual VPS Authentication Fix Guide

## 📋 Masalah yang Ditemukan

Di production (`https://family.thelodgegroup.id/admin`), CRUD admin tidak berfungsi karena:

1. **JWT_SECRET Mismatch**: VPS menggunakan default value yang lemah
2. **Admin Email Mismatch**: Environment menggunakan `admin@thelodge.local` tapi login dengan `admin@thelodgegroup.id`
3. **Token Authentication Failure**: Middleware tidak mengenali token yang valid

## 🎯 Solusi

### Step 1: Koneksi ke VPS
```bash
ssh root@103.127.99.103
```

### Step 2: Backup Environment File
```bash
cd /var/www/lodge-family/backend
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
```

### Step 3: Update Environment File
```bash
cat > .env << 'EOF'
DATABASE_URL="mysql://root:BI5mill4h%40%40%40@localhost:3306/lodge_family_db"
PORT=5001
APP_URL=https://family.thelodgegroup.id
FRONTEND_URL=https://family.thelodgegroup.id
JWT_SECRET=lodge_family_jwt_secret_2025_production_key
QR_HMAC_SECRET=secure_qr_secret
ADMIN_EMAIL=admin@thelodgegroup.id
ADMIN_PASSWORD=admin123
ADMIN_FULL_NAME=Administrator
ADMIN_PHONE=0000000000
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@thelodgegroup.id
SMTP_PASS=No2025!@
FROM_EMAIL=no-reply@thelodgegroup.id
FROM_NAME=The Lodge Family

# Cloudinary Configuration (optional - if not set, will use local file storage)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Watzap WhatsApp API Configuration
WATZAP_API_KEY=3QEKEK0NLNNSBYSB
WATZAP_NUMBER_KEY=En9f2o0tEMTg8QLH

# Xendit Payment Gateway Configuration
XENDIT_SECRET_KEY=xnd_development_ZmDaRXsyswaNKu1JOxiNKxy79NZ4YGMi7tvvL66Z2I6zWqAecypFh2EadYmzGfc
XENDIT_WEBHOOK_TOKEN=3tmtpsz2eGYaYdRyYp5SzR7V2aHHaoTtwNFmFQZQpxDMNPw1
XENDIT_PUBLIC_KEY=xnd_public_development_ZmDaRXsyswaNKu1JOxiNKxy79NZ4YGMi7tvvL66Z2I6zWqAecypFh2EadYmzGfc
EOF
```

### Step 4: Restart Backend Service
```bash
pm2 restart backend
```

### Step 5: Verify Service Status
```bash
pm2 status
pm2 logs backend --lines 10
```

## 🧪 Testing Setelah Deployment

### Test 1: Login Endpoint
```bash
curl -X POST https://family.thelodgegroup.id/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@thelodgegroup.id","password":"admin123"}' \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Result:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "role": "ADMIN",
  "adminRole": "SUPER_ADMIN",
  "isActive": true,
  "member": null
}
```

### Test 2: Auth Me Endpoint
```bash
# Gunakan token dari login di atas
TOKEN="your_token_here"

curl -X GET https://family.thelodgegroup.id/api/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Result:**
```json
{
  "user": {
    "id": "...",
    "email": "admin@thelodgegroup.id",
    "role": "ADMIN",
    "adminRole": "SUPER_ADMIN",
    "isActive": true
  },
  "member": {...}
}
```

### Test 3: Admin CRUD Endpoint
```bash
curl -X GET https://family.thelodgegroup.id/api/admin/members \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Result:**
```json
{
  "members": [...],
  "total": 4,
  "page": 1,
  "limit": 10
}
```

## 🎯 Verifikasi Admin Interface

1. Buka browser dan akses: `https://family.thelodgegroup.id/admin`
2. Login dengan kredensial:
   - **Email**: `admin@thelodgegroup.id`
   - **Password**: `admin123`
3. Verifikasi bahwa dashboard admin dapat diakses
4. Test CRUD operations (Create, Read, Update, Delete) pada members

## 🔍 Troubleshooting

### Jika Login Masih Gagal:
```bash
# Check PM2 logs
pm2 logs backend --lines 20

# Check environment variables
cd /var/www/lodge-family/backend
cat .env | grep -E "(JWT_SECRET|ADMIN_EMAIL)"

# Restart dengan force reload
pm2 reload backend --force
```

### Jika Token Tidak Valid:
```bash
# Verify JWT_SECRET is updated
grep JWT_SECRET /var/www/lodge-family/backend/.env

# Check if backend is using new environment
pm2 restart backend
sleep 5
pm2 logs backend --lines 5
```

## ✅ Success Indicators

Setelah fix berhasil, Anda akan melihat:

1. ✅ Login endpoint mengembalikan token valid
2. ✅ `/api/auth/me` mengembalikan data user (bukan null)
3. ✅ Admin endpoints dapat diakses dengan status 200
4. ✅ Admin interface di browser berfungsi normal
5. ✅ CRUD operations bekerja tanpa error 401/403

## 📞 Support

Jika masih ada masalah setelah mengikuti langkah-langkah di atas, periksa:
- PM2 logs untuk error messages
- Database connection
- Nginx configuration
- SSL certificate status

---
**Created**: $(Get-Date)
**Purpose**: Fix production admin CRUD authentication issues
**Status**: Ready for deployment