const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      console.log('Admin ID:', existingAdmin.id);
      return existingAdmin;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = await prisma.user.create({
      data: {
        id: 'test-admin-id',
        email: 'admin@thelodgegroup.id',
        password: hashedPassword,
        role: 'ADMIN',
        adminRole: 'SUPER_ADMIN',
        isActive: true,
        fullName: 'Super Admin'
      }
    });

    console.log('Admin user created successfully:');
    console.log('Email:', adminUser.email);
    console.log('ID:', adminUser.id);
    console.log('Role:', adminUser.role);
    console.log('Admin Role:', adminUser.adminRole);

    return adminUser;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();