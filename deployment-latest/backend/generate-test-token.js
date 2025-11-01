const jwt = require('jsonwebtoken');

// Use the same secret as in config
const jwtSecret = process.env.JWT_SECRET || 'change_me_please';

// Create a test member token
const memberPayload = {
  uid: 'test-member-id',
  role: 'MEMBER'
};

const memberToken = jwt.sign(memberPayload, jwtSecret, { expiresIn: '7d' });

console.log('Test Member Token:');
console.log(memberToken);
console.log('\nPayload:', memberPayload);

// Create a test admin token
const adminPayload = {
  uid: 'test-admin-id',
  role: 'ADMIN',
  adminRole: 'SUPER_ADMIN'
};

const adminToken = jwt.sign(adminPayload, jwtSecret, { expiresIn: '7d' });

console.log('\nTest Admin Token:');
console.log(adminToken);
console.log('\nPayload:', adminPayload);