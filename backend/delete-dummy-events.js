const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteDummyEvents() {
  try {
    // ID event dummy yang akan dihapus
    const dummyEventIds = [
      'f982fc7c-54d8-4e72-9a18-962837340028', // Exclusive Gathering
      'a1242bd2-6487-463a-b734-05fcdf051fe1', // Test Event for Join Testing
      '387b1700-afe6-4874-8dc6-449a1023d6e7', // Member Workshop
      '81cfa9f1-2417-4977-b985-e52701a4b37f'  // Fresh Event untuk Browser Testing
    ];

    console.log('=== MENGHAPUS EVENT DUMMY ===');
    
    for (const eventId of dummyEventIds) {
      // Cek apakah event ada
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          registrations: true,
          promos: true
        }
      });

      if (!event) {
        console.log(`❌ Event dengan ID ${eventId} tidak ditemukan`);
        continue;
      }

      console.log(`🔍 Menghapus event: "${event.title}"`);
      
      // Hapus registrasi event terlebih dahulu (jika ada)
      if (event.registrations.length > 0) {
        console.log(`   - Menghapus ${event.registrations.length} registrasi event`);
        await prisma.eventRegistration.deleteMany({
          where: { eventId: eventId }
        });
      }

      // Update promo yang terkait dengan event ini (set eventId ke null)
      if (event.promos.length > 0) {
        console.log(`   - Memutus hubungan dengan ${event.promos.length} promo`);
        await prisma.promo.updateMany({
          where: { eventId: eventId },
          data: { eventId: null }
        });
      }

      // Hapus event
      await prisma.event.delete({
        where: { id: eventId }
      });

      console.log(`✅ Event "${event.title}" berhasil dihapus`);
    }

    console.log('\n🎉 Semua event dummy berhasil dihapus!');
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

deleteDummyEvents();