import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedMeetingLikes() {
  console.log('Seeding MeetingLikes...');

  const meetingLikes = [
    // User 1 likes
    { userId: 1, meetingId: 1 },
    { userId: 1, meetingId: 2 },
    { userId: 1, meetingId: 3 },
    { userId: 1, meetingId: 4 },
    { userId: 1, meetingId: 5 },
    
    // User 2 likes
    { userId: 2, meetingId: 1 },
    { userId: 2, meetingId: 3 },
    { userId: 2, meetingId: 5 },
    
    // User 3 likes
    { userId: 3, meetingId: 2 },
    { userId: 3, meetingId: 4 },
    { userId: 3, meetingId: 5 },
    
    // User 4 likes
    { userId: 4, meetingId: 1 },
    { userId: 4, meetingId: 2 },
    
    // User 5 likes
    { userId: 5, meetingId: 3 },
    { userId: 5, meetingId: 4 },
    { userId: 5, meetingId: 5 },
  ];

  for (const like of meetingLikes) {
    await prisma.meetingLikes.create({
      data: like,
    });
  }

  console.log('MeetingLikes seeded successfully!');
}

// Run the seeder if this file is executed directly
if (require.main === module) {
  seedMeetingLikes()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
