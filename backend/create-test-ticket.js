const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestTicket() {
  try {
    console.log('🎫 Creating test ticket for member...\n');

    // Find a test member or create one
    let member = await prisma.member.findFirst({
      include: { user: true }
    });

    if (!member) {
      console.log('No member found. Creating test member...');
      
      // Create test user first
      const testUser = await prisma.user.create({
        data: {
          email: 'testmember@example.com',
          password: 'hashedpassword123', // In real app, this should be hashed
          isVerified: true
        }
      });

      // Create test member
      member = await prisma.member.create({
        data: {
          userId: testUser.id,
          fullName: 'Test Member',
          phoneNumber: '081234567890',
          dateOfBirth: new Date('1990-01-01'),
          address: 'Test Address',
          pointsBalance: 100,
          membershipType: 'REGULAR'
        },
        include: { user: true }
      });

      console.log('✅ Test member created:', member.fullName);
    } else {
      console.log('✅ Using existing member:', member.fullName);
    }

    // Create the ticket with simple data
    const ticket = await prisma.ticket.create({
      data: {
        name: 'Test Admin Ticket',
        validDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: 'ACTIVE',
        qrPayloadHash: 'test-hash-' + Date.now(),
        friendlyCode: 'TEST-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        memberId: member.id
      }
    });

    console.log('✅ Test ticket created successfully!');
    console.log('📋 Ticket Details:');
    console.log('   - ID:', ticket.id);
    console.log('   - Name:', ticket.name);
    console.log('   - Member:', member.fullName);
    console.log('   - Email:', member.user.email);
    console.log('   - Valid Until:', ticket.validDate);
    console.log('   - Status:', ticket.status);
    console.log('   - Friendly Code:', ticket.friendlyCode);

    console.log('\n🔍 Now you can:');
    console.log('1. Login as:', member.user.email);
    console.log('2. Go to "My Ticket" page');
    console.log('3. Verify the ticket appears in the list');

    return { ticket, member };

  } catch (error) {
    console.error('❌ Error creating test ticket:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestTicket();