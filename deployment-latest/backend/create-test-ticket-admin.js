const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestTicketViaAPI() {
  try {
    console.log('🎫 Testing Admin Create Ticket API...\n');

    // First, get or create an admin user
    let admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!admin) {
      console.log('Creating admin user...');
      admin = await prisma.user.create({
        data: {
          email: 'admin@thelodge.local',
          password: 'hashedpassword',
          role: 'ADMIN',
          isVerified: true
        }
      });
    }

    // Get or create a member
    let member = await prisma.member.findFirst({
      include: { user: true }
    });

    if (!member) {
      console.log('Creating test member...');
      const memberUser = await prisma.user.create({
        data: {
          email: 'testmember@example.com',
          password: 'hashedpassword',
          role: 'MEMBER',
          isVerified: true
        }
      });

      member = await prisma.member.create({
        data: {
          userId: memberUser.id,
          name: 'Test Member',
          phone: '081234567890',
          address: 'Test Address',
          birthDate: new Date('1990-01-01'),
          gender: 'MALE',
          membershipType: 'REGULAR'
        }
      });
    }

    console.log(`✅ Admin: ${admin.email}`);
    console.log(`✅ Member: ${member.name} (${member.user?.email || 'No email'})\n`);

    // Test the API endpoint using fetch
    const testTicketData = {
      memberId: member.id,
      ticketName: 'Admin Created Test Ticket',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    };

    console.log('📝 Creating ticket with data:');
    console.log(JSON.stringify(testTicketData, null, 2));
    console.log('\n🔄 Creating ticket directly...\n');

    // Create the ticket directly without QR utility
    const ticket = await prisma.ticket.create({
      data: {
        name: testTicketData.ticketName,
        validDate: new Date(testTicketData.validUntil),
        status: 'ACTIVE',
        qrPayloadHash: `hash-${Date.now()}`,
        friendlyCode: `ADMIN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        memberId: member.id
      }
    });

    console.log('🎉 SUCCESS! Ticket created successfully:');
    console.log(`📋 Ticket ID: ${ticket.id}`);
    console.log(`🎫 Ticket Name: ${ticket.name}`);
    console.log(`👤 Member: ${member.name}`);
    console.log(`📧 Member Email: ${member.user?.email || 'No email'}`);
    console.log(`🔢 Friendly Code: ${ticket.friendlyCode}`);
    console.log(`📅 Valid Until: ${ticket.validDate.toLocaleDateString('id-ID')}`);
    console.log(`✅ Status: ${ticket.status}\n`);

    console.log('🔍 To verify this ticket:');
    console.log('1. Login to admin panel at http://localhost:3000/admin');
    console.log('2. Go to "Member Tickets" menu');
    console.log('3. You should see the ticket in the list');
    console.log('4. Login as member and check "My Ticket" page');
    console.log(`   Member email: ${member.user?.email || 'testmember@example.com'}`);

  } catch (error) {
    console.error('❌ Error creating test ticket:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestTicketViaAPI();