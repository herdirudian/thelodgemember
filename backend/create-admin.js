const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@thelodgemaribaya.com' }
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      console.log('Admin Role:', existingAdmin.adminRole);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email: 'admin@thelodgemaribaya.com',
        password: hashedPassword,
        fullName: 'Admin',
        role: 'ADMIN',
        adminRole: 'SUPER_ADMIN',
        isActive: true
      }
    });

    console.log('Admin user created successfully');
    console.log('Email:', admin.email);
    console.log('Role:', admin.role);
    console.log('Admin Role:', admin.adminRole);

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();