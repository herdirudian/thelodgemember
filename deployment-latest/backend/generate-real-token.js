const jwt = require('jsonwebtoken');

const JWT_SECRET = 'change_me_please';

// Generate token for real member
const memberPayload = {
  uid: '020b2a05-e9a3-4e72-8839-078a895a5c58', // Herdi Rudian's userId
  role: 'MEMBER'
};

const memberToken = jwt.sign(memberPayload, JWT_SECRET, { expiresIn: '7d' });

console.log('Real Member Token (Herdi Rudian):');
console.log(memberToken);
console.log('\nPayload:', memberPayload);