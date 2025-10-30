const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listEvents() {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('=== DAFTAR SEMUA EVENT ===');
    events.forEach((event, index) => {
      console.log(`${index + 1}. ID: ${event.id}`);
      console.log(`   Title: ${event.title}`);
      console.log(`   Description: ${event.description}`);
      console.log(`   Event Date: ${event.eventDate}`);
      console.log(`   Created: ${event.createdAt}`);
      console.log('---');
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

listEvents();