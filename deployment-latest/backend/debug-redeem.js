const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugRedeem() {
  try {
    const code = '59d1-a1b3-7fb9';
    
    console.log('Searching for tourism ticket booking with code:', code);
    
    const tourismBooking = await prisma.tourismTicketBooking.findFirst({ 
      where: { 
        OR: [
          { friendlyCode: code },
          { id: code }
        ]
      },
      include: { 
        member: true,
        ticket: true
      }
    });

    if (tourismBooking) {
      console.log('Found tourism booking:');
      console.log('ID:', tourismBooking.id);
      console.log('Friendly Code:', tourismBooking.friendlyCode);
      console.log('Status:', tourismBooking.status);
      console.log('Redeemed At:', tourismBooking.redeemedAt);
      console.log('Ticket Name:', tourismBooking.ticket?.name);
      console.log('Member Name:', tourismBooking.member?.fullName);
      console.log('Customer Name:', tourismBooking.customerName);
    } else {
      console.log('No tourism booking found with code:', code);
    }

    // Also check all tourism bookings
    console.log('\nAll tourism bookings:');
    const allBookings = await prisma.tourismTicketBooking.findMany({
      include: {
        ticket: true,
        member: true
      }
    });
    
    allBookings.forEach(booking => {
      console.log(`ID: ${booking.id}, Code: ${booking.friendlyCode}, Status: ${booking.status}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugRedeem();