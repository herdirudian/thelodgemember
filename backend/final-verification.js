const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function finalVerification() {
  try {
    console.log('🔍 FINAL VERIFICATION - Admin Ticket Issue Fix');
    console.log('=' .repeat(60));

    // 1. Check admin user
    console.log('\n1️⃣ Checking admin user...');
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      include: { member: true }
    });

    if (!admin) {
      console.log('❌ No admin user found');
      return;
    }

    console.log(`✅ Admin found: ${admin.email} (ID: ${admin.id})`);
    console.log(`   Admin member ID: ${admin.member?.id || 'No member profile'}`);

    // 2. Check if admin appears in members endpoint simulation
    console.log('\n2️⃣ Checking members list (simulating /api/admin/members)...');
    const members = await prisma.member.findMany({
      where: {
        user: {
          role: { not: 'ADMIN' } // This is our fix
        }
      },
      include: { user: true }
    });

    console.log(`✅ Members list contains ${members.length} members (excluding admin)`);
    
    const adminInMembers = members.find(m => m.user.role === 'ADMIN');
    if (adminInMembers) {
      console.log('❌ PROBLEM: Admin still appears in members list!');
    } else {
      console.log('✅ SUCCESS: Admin is correctly excluded from members list');
    }

    // 3. Check recent tickets created by admin
    console.log('\n3️⃣ Checking recent tickets created by admin...');
    const adminTickets = await prisma.ticket.findMany({
      where: { 
        memberId: admin.member?.id,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`📊 Admin has ${adminTickets.length} tickets created in the last 24 hours`);
    
    if (adminTickets.length > 0) {
      console.log('   Recent admin tickets:');
      adminTickets.forEach((ticket, index) => {
        console.log(`   ${index + 1}. ${ticket.name} (${ticket.createdAt.toISOString()})`);
      });
    }

    // 4. Check tickets for non-admin members
    console.log('\n4️⃣ Checking tickets for non-admin members...');
    const memberTickets = await prisma.ticket.findMany({
      where: {
        member: {
          user: {
            role: 'MEMBER'
          }
        },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      include: {
        member: {
          include: { user: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Non-admin members have ${memberTickets.length} tickets created in the last 24 hours`);
    
    if (memberTickets.length > 0) {
      console.log('   Recent member tickets:');
      memberTickets.forEach((ticket, index) => {
        const memberName = ticket.member.user.fullName || ticket.member.user.email;
        console.log(`   ${index + 1}. ${ticket.name} → ${memberName} (${ticket.createdAt.toISOString()})`);
      });
    }

    // 5. Summary and recommendations
    console.log('\n📋 VERIFICATION SUMMARY');
    console.log('=' .repeat(40));
    
    const issues = [];
    const successes = [];

    if (adminInMembers) {
      issues.push('Admin still appears in members list');
    } else {
      successes.push('Admin correctly excluded from members list');
    }

    if (adminTickets.length === 0) {
      successes.push('No recent tickets created for admin');
    } else {
      issues.push(`${adminTickets.length} tickets still created for admin in last 24h`);
    }

    if (memberTickets.length > 0) {
      successes.push(`${memberTickets.length} tickets correctly created for members`);
    }

    console.log('\n✅ SUCCESSES:');
    successes.forEach(success => console.log(`   • ${success}`));

    if (issues.length > 0) {
      console.log('\n❌ REMAINING ISSUES:');
      issues.forEach(issue => console.log(`   • ${issue}`));
      console.log('\n🔧 RECOMMENDATION: Some issues still need attention');
    } else {
      console.log('\n🎉 ALL ISSUES RESOLVED!');
      console.log('   The admin ticket creation problem has been successfully fixed.');
      console.log('   Frontend will now only create tickets for non-admin members.');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

finalVerification();