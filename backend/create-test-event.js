const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

async function createTestEvent() {
  const prisma = new PrismaClient();
  
  try {
    const event = await prisma.event.create({
      data: {
        id: uuidv4(),
        title: 'Test Event for Join Testing',
        description: 'Event ini dibuat untuk testing fungsi join event di Exclusive Member page.',
        eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        location: 'Test Location',
        quota: 50,
        imageUrl: '/images/default-event.jpg',
        terms: 'Terms and conditions for test event'
      }
    });
    
    console.log('✅ Test event created successfully!');
    console.log('Event ID:', event.id);
    console.log('Title:', event.title);
    console.log('Date:', event.eventDate);
    
  } catch (error) {
    console.error('❌ Error creating test event:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestEvent();