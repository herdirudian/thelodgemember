const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestMember() {
  try {
    console.log('Creating test member...');
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: 'test-member-id' }
    });
    
    let user;
    if (existingUser) {
      console.log('Test user already exists');
      user = existingUser;
    } else {
      // Create test user
      user = await prisma.user.create({
        data: {
          id: 'test-member-id',
          email: 'testmember@example.com',
          password: 'simple-password-for-testing',
          role: 'MEMBER',
          fullName: 'Test Member'
        }
      });
      console.log('Test user created:', user.id);
    }
    
    // Check if member profile already exists
    const existingMember = await prisma.member.findUnique({
      where: { userId: 'test-member-id' }
    });
    
    if (existingMember) {
      console.log('Test member profile already exists');
      return;
    }
    
    // Create test member profile
    const member = await prisma.member.create({
      data: {
        userId: 'test-member-id',
        fullName: 'Test Member',
        phone: '081234567890',
        membershipNumber: 'TM001',
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