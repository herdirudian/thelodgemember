const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBooking() {
  try {
    // Find the latest PAID tourism ticket booking
    const booking = await prisma.tourismTicketBooking.findFirst({
      where: { 
        status: 'PAID'
      },
      orderBy: { createdAt: 'desc' },
      include: {
        ticket: true
      }
    });

    if (booking) {
      console.log('Found PAID tourism ticket booking:');
      console.log('ID:', booking.id);
      console.log('External ID:', booking.externalId);
      console.log('Friendly Code:', booking.friendlyCode);
      console.log('QR Payload Hash:', booking.qrPayloadHash);
      console.log('Status:', booking.status);
      console.log('Tourism Ticket:', booking.ticket.name);
      console.log('Created At:', booking.createdAt);
    } else {
      console.log('No PAID tourism ticket booking found');
    }

  } catch (error) {
    console.error('Error checking booking:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBooking();