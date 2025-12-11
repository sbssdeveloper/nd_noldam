import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedPayments() {
  console.log('Seeding Payments...');

  const payments = [
    {
      type: 'meeting_fee',
      refNo: 'PAY-001-2024',
      status: 'completed',
      date: new Date('2024-01-15T10:30:00Z'),
      amount: 25.00,
    },
    {
      type: 'meeting_fee',
      refNo: 'PAY-002-2024',
      status: 'completed',
      date: new Date('2024-01-20T14:45:00Z'),
      amount: 35.00,
    },
    {
      type: 'meeting_fee',
      refNo: 'PAY-003-2024',
      status: 'pending',
      date: new Date('2024-01-25T09:15:00Z'),
      amount: 20.00,
    },
    {
      type: 'meeting_fee',
      refNo: 'PAY-004-2024',
      status: 'completed',
      date: new Date('2024-01-28T16:20:00Z'),
      amount: 40.00,
    },
    {
      type: 'meeting_fee',
      refNo: 'PAY-005-2024',
      status: 'failed',
      date: new Date('2024-02-01T11:30:00Z'),
      amount: 50.00,
    },
    {
      type: 'premium_membership',
      refNo: 'PAY-006-2024',
      status: 'completed',
      date: new Date('2024-02-05T08:00:00Z'),
      amount: 99.99,
    },
    {
      type: 'meeting_fee',
      refNo: 'PAY-007-2024',
      status: 'completed',
      date: new Date('2024-02-08T13:45:00Z'),
      amount: 30.00,
    },
    {
      type: 'meeting_fee',
      refNo: 'PAY-008-2024',
      status: 'pending',
      date: new Date('2024-02-10T15:20:00Z'),
      amount: 45.00,
    },
  ];

  for (const payment of payments) {
    await prisma.payment.create({
      data: payment,
    });
  }

  console.log('Payments seeded successfully!');
}
