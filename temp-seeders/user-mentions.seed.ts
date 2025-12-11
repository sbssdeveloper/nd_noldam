import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedUserMentions() {
  console.log('Seeding User Mentions...');

  const mentions = [
    // User 1 (@john_doe) mentioned in other people's posts - like @john_doe
    {
      postId: 9, // Post by User 2 mentioning @john_doe
      mentionedUserId: 1,
    },
    {
      postId: 10, // Post by User 3 mentioning @john_doe
      mentionedUserId: 1,
    },
    {
      postId: 11, // Post by User 4 mentioning @john_doe
      mentionedUserId: 1,
    },
    {
      postId: 12, // Post by User 5 mentioning @john_doe
      mentionedUserId: 1,
    },
    {
      postId: 13, // Post by User 2 mentioning @john_doe
      mentionedUserId: 1,
    },
    {
      postId: 14, // Post by User 2 mentioning @john_doe
      mentionedUserId: 1,
    },
    {
      postId: 15, // Post by User 2 mentioning @john_doe
      mentionedUserId: 1,
    },

    // User 1's posts mentioning other users (from post content)
    {
      postId: 2, // User 1's post mentioning @sarah_jones
      mentionedUserId: 4,
    },
    {
      postId: 4, // User 1's post mentioning @jane_smith and @mike_wilson
      mentionedUserId: 2,
    },
    {
      postId: 4, // User 1's post mentioning @jane_smith and @mike_wilson
      mentionedUserId: 3,
    },
  ];

  for (const mention of mentions) {
    await prisma.userMention.create({
      data: mention,
    });
  }

  console.log('User Mentions seeded successfully!');
}
