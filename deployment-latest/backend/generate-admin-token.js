require('dotenv').config();
const jwt = require('jsonwebtoken');

// Generate token for existing admin user
const adminPayload = {
  uid: 'a2d1140d-5ddf-44fc-9a44-6a99ac74f9d9',
  role: 'ADMIN',
  adminRole: 'SUPER_ADMIN'
};

const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
const adminToken = jwt.sign(adminPayload, jwtSecret, { expiresIn: '7d' });

console.log('Admin Token:');
console.log(adminToken);
console.log('\nPayload:', adminPayload);