import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedOTPs() {
  console.log('Seeding OTPs...');

  const otps = [
    {
      phoneNumber: '+1234567890',
      code: '123456',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      isUsed: false,
    },
    {
      phoneNumber: '+1234567891',
      code: '654321',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      isUsed: true,
    },
    {
      phoneNumber: '+1234567892',
      code: '789012',
      expiresAt: new Date(Date.now() - 5 * 60 * 1000), // Expired 5 minutes ago
      isUsed: false,
    },
    {
      phoneNumber: '+1234567893',
      code: '345678',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      isUsed: false,
    },
    {
      phoneNumber: '+1234567894',
      code: '901234',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      isUsed: true,
    },
    {
      phoneNumber: '+1234567895',
      code: '567890',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      isUsed: false,
    },
    {
      phoneNumber: '+1234567896',
      code: '234567',
      expiresAt: new Date(Date.now() - 2 * 60 * 1000), // Expired 2 minutes ago
      isUsed: false,
    },
    {
      phoneNumber: '+1234567897',
      code: '890123',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      isUsed: false,
    },
  ];

  for (const otp of otps) {
    await prisma.oTP.create({
      data: otp,
    });
  }

  console.log('OTPs seeded successfully!');
}
