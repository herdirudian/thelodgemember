import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generate membership number format TLG + 5 digit angka
 * Contoh: TLG00001, TLG00002, dst.
 */
export async function generateMembershipNumber(): Promise<string> {
  // Cari member terakhir berdasarkan membershipNumber
  const lastMember = await prisma.member.findFirst({
    where: {
      membershipNumber: {
        not: null
      }
    },
    orderBy: {
      membershipNumber: 'desc'
    }
  });

  let nextNumber = 1;
  
  if (lastMember?.membershipNumber) {
    // Extract angka dari format TLG00001
    const numberPart = lastMember.membershipNumber.replace('TLG', '');
    const currentNumber = parseInt(numberPart, 10);
    nextNumber = currentNumber + 1;
  }

  // Format dengan padding 5 digit
  const paddedNumber = nextNumber.toString().padStart(5, '0');
  return `TLG${paddedNumber}`;
}