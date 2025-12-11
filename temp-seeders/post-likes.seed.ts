import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedPostLikes() {
  console.log('Seeding Post Likes...');

  const postLikes = [
    // Post 1 - 운동 루틴 (User 1's post) - Many likes
    { userId: 2, postId: 1 },
    { userId: 3, postId: 1 },
    { userId: 4, postId: 1 },
    { userId: 5, postId: 1 },
    
    // Post 2 - 새로운 프로젝트 시작 (User 1's post) - Many likes
    { userId: 2, postId: 2 },
    { userId: 3, postId: 2 },
    { userId: 4, postId: 2 },
    { userId: 5, postId: 2 },
    
    // Post 3 - 맛있는 저녁 식사 (User 1's post) - Many likes
    { userId: 2, postId: 3 },
    { userId: 3, postId: 3 },
    { userId: 4, postId: 3 },
    { userId: 5, postId: 3 },
    
    // Post 4 - 친구들과의 모임 (User 1's post) - Many likes
    { userId: 2, postId: 4 },
    { userId: 3, postId: 4 },
    { userId: 4, postId: 4 },
    { userId: 5, postId: 4 },
    
    // Post 5 - 독서의 즐거움 (User 1's post) - Many likes
    { userId: 2, postId: 5 },
    { userId: 3, postId: 5 },
    { userId: 4, postId: 5 },
    { userId: 5, postId: 5 },
    
    // Post 6 - 브런치 (User 2's post) - User 1 likes it
    { userId: 1, postId: 6 },
    { userId: 3, postId: 6 },
    { userId: 4, postId: 6 },
    { userId: 5, postId: 6 },
    
    // Post 7 - 도서관 공부 (User 3's post) - User 1 likes it
    { userId: 1, postId: 7 },
    { userId: 2, postId: 7 },
    { userId: 4, postId: 7 },
    { userId: 5, postId: 7 },
    
    // Post 8 - 친구들과의 모임 (User 4's post) - User 1 likes it
    { userId: 1, postId: 8 },
    { userId: 2, postId: 8 },
    { userId: 3, postId: 8 },
    { userId: 5, postId: 8 },
    
    // Post 9 - 일몰 감상 (User 5's post) - User 1 likes it
    { userId: 1, postId: 9 },
    { userId: 2, postId: 9 },
    { userId: 3, postId: 9 },
    { userId: 4, postId: 9 },
    
    // Post 10 - 요가 (User 2's post) - User 1 likes it
    { userId: 1, postId: 10 },
    { userId: 3, postId: 10 },
    { userId: 4, postId: 10 },
    { userId: 5, postId: 10 },

    // User 1's additional posts (13, 15) - these are User 1's posts
    { userId: 2, postId: 13 }, // 새로운 책 (User 1's post)
    { userId: 3, postId: 13 },
    { userId: 4, postId: 13 },
    { userId: 5, postId: 13 },

    { userId: 2, postId: 15 }, // 감사한 하루 (User 1's post)
    { userId: 3, postId: 15 },
    { userId: 4, postId: 15 },
    { userId: 5, postId: 15 },

    // User 1 likes other people's posts (for more realistic interactions)
    { userId: 1, postId: 11 }, // Post 11 by User 4
    { userId: 1, postId: 12 }, // Post 12 by User 5
    { userId: 1, postId: 14 }, // Post 14 by User 2
  ];

  for (const like of postLikes) {
    await prisma.postLikes.create({
      data: like,
    });
  }

  console.log('Post Likes seeded successfully!');
}
