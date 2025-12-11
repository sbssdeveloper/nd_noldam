import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedFollowers() {
  console.log('Seeding Followers...');

  const followers = [
    {
      userId: 1,
      following: 2,
      startedOn: new Date('2024-01-15T10:00:00Z'),
    },
    {
      userId: 1,
      following: 3,
      startedOn: new Date('2024-01-20T14:30:00Z'),
    },
    {
      userId: 2,
      following: 1,
      startedOn: new Date('2024-01-18T09:15:00Z'),
    },
    {
      userId: 2,
      following: 4,
      startedOn: new Date('2024-01-25T16:45:00Z'),
    },
    {
      userId: 3,
      following: 1,
      startedOn: new Date('2024-01-22T11:20:00Z'),
    },
    {
      userId: 3,
      following: 5,
      startedOn: new Date('2024-01-28T13:10:00Z'),
    },
    {
      userId: 4,
      following: 2,
      startedOn: new Date('2024-01-30T15:30:00Z'),
    },
    {
      userId: 4,
      following: 5,
      startedOn: new Date('2024-02-02T12:00:00Z'),
    },
    {
      userId: 5,
      following: 1,
      startedOn: new Date('2024-02-05T08:45:00Z'),
    },
    {
      userId: 5,
      following: 3,
      startedOn: new Date('2024-02-08T17:20:00Z'),
    },
  ];

  for (const follower of followers) {
    await prisma.follower.create({
      data: follower,
    });
  }

  console.log('Followers seeded successfully!');
}
