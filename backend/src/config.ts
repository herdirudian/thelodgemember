import dotenv from 'dotenv';
dotenv.config();

export const config = {
  appUrl: process.env.APP_URL || 'http://localhost:5000',
  // Ubah default FRONTEND_URL ke port 3003 (sesuai dev server Next.js)
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3003',
  jwtSecret: process.env.JWT_SECRET || 'change_me_please',
  qrHmacSecret: process.env.QR_HMAC_SECRET || 'secure_qr_secret',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
};