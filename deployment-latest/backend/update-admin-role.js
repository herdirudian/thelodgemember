const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateAdminRole() {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: 'a2d1140d-5ddf-44fc-9a44-6a99ac74f9d9' },
      data: { adminRole: 'SUPER_ADMIN' }
    });

    console.log('Admin user updated successfully:');
    console.log('Email:', updatedUser.email);
    console.log('ID:', updatedUser.id);
    console.log('Role:', updatedUser.role);
    console.log('Admin Role:', updatedUser.adminRole);

    return updatedUser;
  } catch (error) {
    console.error('Error updating admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminRole();