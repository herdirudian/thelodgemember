# 🔧 Panduan Konfigurasi Xendit API

## 📋 Langkah-langkah Setup Xendit

### 1. Buat Akun Xendit
1. Kunjungi [https://dashboard.xendit.co/register](https://dashboard.xendit.co/register)
2. Daftar dengan email bisnis Anda
3. Verifikasi email dan lengkapi profil bisnis
4. Upload dokumen yang diperlukan (KTP, NPWP, dll)

### 2. Dapatkan API Keys

#### Test Environment (untuk Development)
1. Login ke [Xendit Dashboard](https://dashboard.xendit.co/)
2. Pilih **Test Environment** di pojok kanan atas
3. Pergi ke **Settings** → **API Keys**
4. Copy **Secret Key** dan **Public Key**

#### Live Environment (untuk Production)
1. Pastikan akun sudah diverifikasi dan disetujui
2. Pilih **Live Environment** di pojok kanan atas
3. Pergi ke **Settings** → **API Keys**
4. Copy **Secret Key** dan **Public Key**

### 3. Konfigurasi Webhook

#### Setup Webhook URL
1. Di Xendit Dashboard, pergi ke **Settings** → **Webhooks**
2. Klik **Add Webhook**
3. Masukkan URL webhook Anda:
   - **Development**: `http://localhost:5000/api/webhook/xendit`
   - **Production**: `https://yourdomain.com/api/webhook/xendit`
4. Pilih events yang ingin diterima:
   - ✅ `invoice.paid`
   - ✅ `invoice.expired`
   - ✅ `invoice.failed`
5. Generate **Webhook Token** dan simpan

#### Untuk Development Lokal (menggunakan ngrok)
Jika testing di localhost, gunakan ngrok untuk expose webhook:
```bash
# Install ngrok
npm install -g ngrok

# Expose port 5000
ngrok http 5000

# Gunakan URL ngrok untuk webhook
# Contoh: https://abc123.ngrok.io/api/webhook/xendit
```

### 4. Update File Konfigurasi

#### Backend (.env)
```env
# Xendit Configuration
XENDIT_SECRET_KEY=xnd_development_YOUR_SECRET_KEY_HERE
XENDIT_WEBHOOK_TOKEN=YOUR_WEBHOOK_TOKEN_HERE
XENDIT_PUBLIC_KEY=xnd_public_development_YOUR_PUBLIC_KEY_HERE

# Frontend URL untuk redirect
FRONTEND_URL=http://localhost:3000
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_XENDIT_PUBLIC_KEY=xnd_public_development_YOUR_PUBLIC_KEY_HERE
```

### 5. Format API Keys yang Benar

#### Test Environment
- **Secret Key**: `xnd_development_[random_string]`
- **Public Key**: `xnd_public_development_[random_string]`

#### Live Environment
- **Secret Key**: `xnd_production_[random_string]`
- **Public Key**: `xnd_public_production_[random_string]`

### 6. Permissions yang Diperlukan

Pastikan API Key memiliki permissions untuk:
- ✅ **Invoice** - Create, Read, Update
- ✅ **Payment** - Read
- ✅ **Webhook** - Receive notifications

### 7. Testing API Keys

Jalankan script test untuk memverifikasi API keys:

```bash
cd backend
node -e "
const { Xendit } = require('xendit-node');
const xendit = new Xendit({
  secretKey: 'YOUR_SECRET_KEY_HERE'
});

xendit.Balance.get()
  .then(balance => console.log('✅ API Key valid:', balance))
  .catch(err => console.error('❌ API Key error:', err.message));
"
```

### 8. Troubleshooting

#### Error 403 Forbidden
- ✅ Periksa API key sudah benar
- ✅ Pastikan menggunakan environment yang tepat (test/live)
- ✅ Verifikasi permissions API key
- ✅ Pastikan akun Xendit sudah diverifikasi

#### Error 401 Unauthorized
- ✅ API key salah atau tidak valid
- ✅ Periksa format API key
- ✅ Regenerate API key jika perlu

#### Webhook tidak diterima
- ✅ Periksa URL webhook sudah benar
- ✅ Pastikan server dapat diakses dari internet
- ✅ Verifikasi webhook token
- ✅ Cek firewall dan security settings

### 9. Contoh Konfigurasi Lengkap

#### Development
```env
# Backend .env
XENDIT_SECRET_KEY=xnd_development_G0rvmGxo1SQkA9DNuEEu77VHEd32Opk0SqjmfQOVLMaxNHmEVxhcwzvoZ7zu
XENDIT_WEBHOOK_TOKEN=whsec_abc123def456ghi789
XENDIT_PUBLIC_KEY=xnd_public_development_G0rvmGxo1SQkA9DNuEEu77VHEd32Opk0SqjmfQOVLMaxNHmEVxhcwzvoZ7zu
FRONTEND_URL=http://localhost:3000
```

#### Production
```env
# Backend .env
XENDIT_SECRET_KEY=xnd_production_[your_live_secret_key]
XENDIT_WEBHOOK_TOKEN=whsec_[your_live_webhook_token]
XENDIT_PUBLIC_KEY=xnd_public_production_[your_live_public_key]
FRONTEND_URL=https://yourdomain.com
```

### 10. Fitur Development Mode

Sistem sudah dilengkapi dengan **Development Mode** yang akan:
- 🔄 Otomatis mendeteksi jika API key tidak valid
- 🎭 Mensimulasikan pembayaran untuk testing
- 📝 Memberikan log yang informatif
- ✅ Memungkinkan testing tanpa API key yang valid

### 11. Langkah Selanjutnya

1. **Dapatkan API keys dari Xendit Dashboard**
2. **Update file .env dengan keys yang benar**
3. **Setup webhook URL (gunakan ngrok untuk development)**
4. **Test payment flow**
5. **Verifikasi webhook berfungsi**

### 12. Support

Jika mengalami masalah:
- 📧 **Xendit Support**: [support@xendit.co](mailto:support@xendit.co)
- 📖 **Documentation**: [https://developers.xendit.co/](https://developers.xendit.co/)
- 💬 **Community**: [Xendit Developer Community](https://community.xendit.co/)

---

## ⚠️ Catatan Penting

1. **Jangan commit API keys ke repository**
2. **Gunakan environment variables**
3. **Test di environment development dulu**
4. **Backup konfigurasi sebelum deploy production**
5. **Monitor webhook logs untuk debugging**

## ✅ Checklist Setup

- [ ] Akun Xendit dibuat dan diverifikasi
- [ ] API keys didapatkan dari dashboard
- [ ] Webhook URL dikonfigurasi
- [ ] File .env diupdate dengan keys yang benar
- [ ] API keys ditest dan berfungsi
- [ ] Payment flow ditest end-to-end
- [ ] Webhook notifications diterima dengan benar

Setelah semua checklist selesai, sistem pembayaran siap digunakan! 🎉