const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateBookingStatus() {
  try {
    // Get the latest tourism ticket booking
    const latestBooking = await prisma.tourismTicketBooking.findFirst({
      orderBy: { createdAt: 'desc' },
      where: { status: 'PENDING' }
    });

    if (!latestBooking) {
      console.log('No pending booking found');
      return;
    }

    console.log('Found booking:', latestBooking.id);
    console.log('Friendly code:', latestBooking.friendlyCode);

    // Update status to PAID
    const updated = await prisma.tourismTicketBooking.update({
      where: { id: latestBooking.id },
      data: { status: 'PAID' }
    });

    console.log('Updated booking status to PAID');
    console.log('Booking ID:', updated.id);
    console.log('Friendly Code:', updated.friendlyCode);
    console.log('QR Payload Hash:', updated.qrPayloadHash);

  } catch (error) {
    console.error('Error updating booking status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateBookingStatus();