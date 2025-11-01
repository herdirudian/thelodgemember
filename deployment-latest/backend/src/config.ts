import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5001'),
  appUrl: process.env.APP_URL || 'https://family.thelodgegroup.id',
  // Updated to use production domain as default
  frontendUrl: process.env.FRONTEND_URL || 'https://family.thelodgegroup.id',
  jwtSecret: process.env.JWT_SECRET || 'change_me_please',
  qrHmacSecret: process.env.QR_HMAC_SECRET || 'secure_qr_secret',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
};