#!/bin/bash

echo "Creating test user on VPS..."

# Navigate to backend directory
cd /var/www/thelodgefamily/current/backend

# Check if create-test-member.js exists
if [ ! -f "create-test-member.js" ]; then
    echo "create-test-member.js not found, creating it..."
    
    cat > create-test-member.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestMember() {
  try {
    console.log('Creating test member...');
    
    // Check if test user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: 'test-member-id' }
    });
    
    if (existingUser) {
      console.log('Test user already exists');
      return;
    }
    
    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        id: 'test-member-id',
        email: 'testmember@example.com',
        password: hashedPassword,
        role: 'MEMBER',
        isActive: true
      }
    });
    
    console.log('Test user created:', user.id);
    
    // Create test member profile
    const member = await prisma.member.create({
      data: {
        userId: user.id,
        fullName: 'Test Member',
        phone: '081234567890',
        membershipNumber: 'TM001',
        isLifetime: true,
        pointsBalance: 0,
        qrPayloadHash: 'test-hash'
      }
    });
    
    console.log('Test member profile created:', member.userId);
    
  } catch (error) {
    console.error('Error creating test member:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestMember();
EOF
fi

# Run the script to create test user
echo "Running create-test-member.js..."
node create-test-member.js

echo "Test user creation completed!"