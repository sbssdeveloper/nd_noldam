import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedUserBadges() {
  console.log('Seeding User Badges...');

  // Get all badges to map names to IDs
  const badges = await prisma.badge.findMany();
  const badgeMap = new Map(badges.map(badge => [badge.name, badge.id]));

  const userBadges = [
    // User 1 badges (most active user) - Earned some basic badges
    { userId: 1, badgeId: badgeMap.get('첫 모임 참여') },
    { userId: 1, badgeId: badgeMap.get('첫 게시물') },
    { userId: 1, badgeId: badgeMap.get('인기 게시물') },
    { userId: 1, badgeId: badgeMap.get('씨앗 등급으로 승급했어요') },

    // User 2 badges (moderately active) - Earned fewer badges
    { userId: 2, badgeId: badgeMap.get('첫 모임 참여') },
    { userId: 2, badgeId: badgeMap.get('씨앗 등급으로 승급했어요') },

    // User 3 badges (new user) - Only basic badges
    { userId: 3, badgeId: badgeMap.get('씨앗 등급으로 승급했어요') },

    // User 4 badges (community focused) - More community badges
    { userId: 4, badgeId: badgeMap.get('첫 모임 참여') },
    { userId: 4, badgeId: badgeMap.get('모임 애호가') },
    { userId: 4, badgeId: badgeMap.get('첫 게시물') },
    { userId: 4, badgeId: badgeMap.get('콘텐츠 크리에이터') },
    { userId: 4, badgeId: badgeMap.get('인기 게시물') },
    { userId: 4, badgeId: badgeMap.get('씨앗 등급으로 승급했어요') },
    { userId: 4, badgeId: badgeMap.get('모꼬지 등급으로 승급했어요') },

    // User 5 badges (influencer) - Most badges earned
    { userId: 5, badgeId: badgeMap.get('첫 모임 참여') },
    { userId: 5, badgeId: badgeMap.get('모임 애호가') },
    { userId: 5, badgeId: badgeMap.get('모임 마스터') },
    { userId: 5, badgeId: badgeMap.get('첫 게시물') },
    { userId: 5, badgeId: badgeMap.get('콘텐츠 크리에이터') },
    { userId: 5, badgeId: badgeMap.get('인플루언서') },
    { userId: 5, badgeId: badgeMap.get('인기 게시물') },
    { userId: 5, badgeId: badgeMap.get('바이럴 콘텐츠') },
    { userId: 5, badgeId: badgeMap.get('인기 스타') },
    { userId: 5, badgeId: badgeMap.get('씨앗 등급으로 승급했어요') },
    { userId: 5, badgeId: badgeMap.get('모꼬지 등급으로 승급했어요') },
    { userId: 5, badgeId: badgeMap.get('이음이 등급으로 승급했어요') },
    { userId: 5, badgeId: badgeMap.get('담장이 등급으로 승급했어요') },
    { userId: 5, badgeId: badgeMap.get('올라운더') },
    { userId: 5, badgeId: badgeMap.get('커뮤니티 리더') }
  ].filter(userBadge => userBadge.badgeId); // Filter out undefined badge IDs

  for (const userBadge of userBadges) {
    await prisma.userBadge.create({
      data: userBadge,
    });
  }

  console.log('User Badges seeded successfully!');
}
