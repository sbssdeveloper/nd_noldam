import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedCommunityRatings() {
  console.log('Seeding Community Ratings...');

  const communityRatings = [
    {
      userId: 1,
      level: '모꼬지',
      points: 1250,
      followersCount: 15,
      postsCount: 8,
      meetingsCount: 12,
    },
    {
      userId: 2,
      level: '씨앗',
      points: 450,
      followersCount: 5,
      postsCount: 3,
      meetingsCount: 4,
    },
    {
      userId: 3,
      level: '씨앗',
      points: 200,
      followersCount: 2,
      postsCount: 1,
      meetingsCount: 1,
    },
    {
      userId: 4,
      level: '나무',
      points: 2100,
      followersCount: 65,
      postsCount: 12,
      meetingsCount: 15,
    },
    {
      userId: 5,
      level: '정원',
      points: 8500,
      followersCount: 650,
      postsCount: 85,
      meetingsCount: 75,
    },
  ];

  for (const rating of communityRatings) {
    await prisma.communityRating.upsert({
      where: { userId: rating.userId },
      update: rating,
      create: rating,
    });
  }

  console.log('Community Ratings seeded successfully!');

  // Assign active community badges based on follower count
  console.log('🎯 Assigning active community badges...');
  
  // Get all available community rating badges
  const communityBadges = await prisma.badge.findMany({
    where: {
      badgeType: 'community_rating',
      isActive: true
    },
    orderBy: {
      condition_followers: 'asc'
    }
  });

  // Get all users with community ratings but no active badge
  const usersToUpdate = await prisma.user.findMany({
    where: {
      communityRating: {
        isNot: null
      },
      activeCommunityBadgeId: null
    },
    include: {
      communityRating: true
    }
  });

  console.log(`🔍 Found ${usersToUpdate.length} users needing active badge assignment`);

  let assignedCount = 0;

  for (const user of usersToUpdate) {
    if (user.communityRating) {
      const followerCount = user.communityRating.followersCount || 0;
      
      // Only assign badges if user meets the minimum requirements
      // Find the highest badge the user qualifies for based on ACTUAL follower count
      const appropriateBadge = communityBadges
        .filter(badge => {
          // User must have AT LEAST the required followers for the badge
          return followerCount >= badge.condition_followers;
        })
        .sort((a, b) => b.condition_followers - a.condition_followers)[0];

      if (appropriateBadge) {
        await prisma.user.update({
          where: { id: user.id },
          data: { activeCommunityBadgeId: appropriateBadge.id }
        });
        
        console.log(`✅ ${user.nickname}: ${followerCount} followers → ${appropriateBadge.name} (requires ${appropriateBadge.condition_followers}+ followers)`);
        assignedCount++;
      } else {
        console.log(`⚠️ ${user.nickname}: ${followerCount} followers → No qualifying badge found (minimum required: ${communityBadges[0]?.condition_followers || 0} followers)`);
      }
    }
  }

  console.log(`🎉 Successfully assigned active badges to ${assignedCount} users!`);
}

// Run if called directly
if (require.main === module) {
  seedCommunityRatings();
}
