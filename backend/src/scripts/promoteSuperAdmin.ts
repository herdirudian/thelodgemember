import { PrismaClient, Role, AdminRole } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const emailArg = process.argv[2] || 'admin@thelodge.local';
  const email = String(emailArg).trim();
  if (!email) {
    console.error('Email is required. Usage: ts-node src/scripts/promoteSuperAdmin.ts <email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`User with email ${email} not found.`);
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      role: Role.ADMIN,
      adminRole: AdminRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log(`Updated user ${email} to SUPER_ADMIN and active. User ID: ${updated.id}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });