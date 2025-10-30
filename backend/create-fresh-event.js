const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

async function createFreshEvent() {
  const prisma = new PrismaClient();
  
  try {
    const event = await prisma.event.create({
      data: {
        id: uuidv4(),
        title: 'Fresh Event untuk Browser Testing',
        description: 'Event baru untuk testing join event langsung dari browser Exclusive Member page.',
        eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        location: 'Browser Test Location',
        quota: 25,
        imageUrl: '/images/default-event.jpg',
        terms: 'Terms and conditions untuk browser testing'
      }
    });
    
    console.log('✅ Fresh event created successfully!');
    console.log('Event ID:', event.id);
    console.log('Title:', event.title);
    console.log('Date:', event.eventDate);
    console.log('\n🎯 Gunakan event ini untuk testing di browser!');
    
  } catch (error) {
    console.error('❌ Error creating fresh event:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createFreshEvent();