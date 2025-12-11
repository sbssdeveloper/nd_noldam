import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedBadges() {
  console.log('🏆 Seeding Badge Definitions with Real Images...');

  const badgeDefinitions = [
    // Consecutive Participation Badges (연속 참여)
    {
      name: '2회 연속 참여',
      description: '다시 보니 반가워요!',
      imageUrl: '/images/consecutive-2.png',
      badgeType: 'regular',
      condition_meetings: 2,
      condition_likes: null,
      condition_posts: null,
      condition_followers: null,
      isActive: true,
    },
    {
      name: '3회 연속 참여',
      description: '연속으로 그룹에 참여했어요. 이대로 계속해주세요!',
      imageUrl: '/images/consecutive-3.png',
      badgeType: 'regular',
      condition_meetings: 3,
      condition_likes: null,
      condition_posts: null,
      condition_followers: null,
      isActive: true,
    },
    {
      name: '4회 연속 참여',
      description: '이젠 익숙해진 것 같네요?',
      imageUrl: '/images/consecutive-4.png',
      badgeType: 'regular',
      condition_meetings: 4,
      condition_likes: null,
      condition_posts: null,
      condition_followers: null,
      isActive: true,
    },
    {
      name: '5+회 연속 참여',
      description: '5회 이상 연속으로 참여했어요. 이대로 배우고, 성장하세요!',
      imageUrl: '/images/consecutive-5.png',
      badgeType: 'regular',
      condition_meetings: 5,
      condition_likes: null,
      condition_posts: null,
      condition_followers: null,
      isActive: true,
    },

    // Diverse Participation Badges (다양한 모임 참여)
    {
      name: '서로 다른 모임에 2번 참여',
      description: '다양한 모임에 참여해봤나요?',
      imageUrl: '/images/diverse-2.png',
      badgeType: 'regular',
      condition_meetings: 2,
      condition_likes: null,
      condition_posts: null,
      condition_followers: null,
      isActive: true,
    },
    {
      name: '서로 다른 모임에 3번 참여',
      description: '경험이 더 넓어지고 있어요!',
      imageUrl: '/images/diverse-3.png',
      badgeType: 'regular',
      condition_meetings: 3,
      condition_likes: null,
      condition_posts: null,
      condition_followers: null,
      isActive: true,
    },
    {
      name: '서로 다른 모임에 4번 참여',
      description: '더 많은 경험을 하셨고, 이대로 더 해 나가주세요!',
      imageUrl: '/images/diverse-4.png',
      badgeType: 'regular',
      condition_meetings: 4,
      condition_likes: null,
      condition_posts: null,
      condition_followers: null,
      isActive: true,
    },

    // Community Rating Badges (등급)
    {
      name: '씨앗 등급으로 승급했어요',
      description: '등급 혜택은 이메일로 보내드릴게요. 함께 할 수 있어 감사해요!',
      imageUrl: '/images/rank-seed.png',
      badgeType: 'community_rating',
      condition_meetings: null,
      condition_likes: null,
      condition_posts: null,
      condition_followers: 0,
      isActive: true,
    },
    {
      name: '모꼬지 등급으로 승급했어요',
      description: '등급 혜택은 이메일로 보내드릴게요. 달하는 호스트님이 대단합니다!',
      imageUrl: '/images/rank-mokkoji.png',
      badgeType: 'community_rating',
      condition_meetings: null,
      condition_likes: null,
      condition_posts: null,
      condition_followers: 100,
      isActive: true,
    },
    {
      name: '이음이 등급으로 승급했어요',
      description: '등급 혜택은 이메일로 보내드릴게요. 계속 함께 할 수 있어 감사해요!',
      imageUrl: '/images/rank-name.png',
      badgeType: 'community_rating',
      condition_meetings: null,
      condition_likes: null,
      condition_posts: null,
      condition_followers: 500,
      isActive: true,
    },
    {
      name: '담장이 등급으로 승급했어요',
      description: '등급 혜택은 이메일로 보내드릴게요. 마지막 등급에 도달하신 걸 축하드려요!',
      imageUrl: '/images/rank-damjangi.png',
      badgeType: 'community_rating',
      condition_meetings: null,
      condition_likes: null,
      condition_posts: null,
      condition_followers: 1000,
      isActive: true,
    },

    // First Activity Badges (첫 활동)
    {
      name: '러닝 마스터',
      description: '러닝 모임에 5번 참여했습니다!',
      imageUrl: '/images/activity-running.png',
      badgeType: 'regular',
      condition_meetings: 5,
      condition_likes: null,
      condition_posts: null,
      condition_followers: null,
      isActive: true,
    },
    {
      name: '요가 전문가',
      description: '요가 모임에 10번 참여했습니다!',
      imageUrl: '/images/activity-yoga.png',
      badgeType: 'regular',
      condition_meetings: 10,
      condition_likes: null,
      condition_posts: null,
      condition_followers: null,
      isActive: true,
    },
    {
      name: '베이킹 셰프',
      description: '베이킹 모임에 8번 참여했습니다!',
      imageUrl: '/images/activity-baby.png',
      badgeType: 'regular',
      condition_meetings: 8,
      condition_likes: null,
      condition_posts: null,
      condition_followers: null,
      isActive: true,
    },
    {
      name: '가족 활동가',
      description: '가족 모임에 6번 참여했습니다!',
      imageUrl: '/images/activity-family.png',
      badgeType: 'regular',
      condition_meetings: 6,
      condition_likes: null,
      condition_posts: null,
      condition_followers: null,
      isActive: true,
    },

    // Additional Regular Badges
    {
      name: '모임 신규자',
      description: '첫 모임에 참여했습니다!',
      imageUrl: '/images/consecutive-2.png',
      badgeType: 'regular',
      condition_meetings: 1,
      condition_likes: null,
      condition_posts: null,
      condition_followers: null,
      isActive: true,
    },
    {
      name: '글쓰기 초보',
      description: '첫 게시물을 작성했습니다!',
      imageUrl: '/images/consecutive-3.png',
      badgeType: 'regular',
      condition_meetings: null,
      condition_likes: null,
      condition_posts: 1,
      condition_followers: null,
      isActive: true,
    },
    {
      name: '인기 작가',
      description: '좋아요 30개를 받았습니다!',
      imageUrl: '/images/consecutive-4.png',
      badgeType: 'regular',
      condition_meetings: null,
      condition_likes: 30,
      condition_posts: null,
      condition_followers: null,
      isActive: true,
    },
    {
      name: '모임 애호가',
      description: '모임에 15번 참여했습니다!',
      imageUrl: '/images/diverse-2.png',
      badgeType: 'regular',
      condition_meetings: 15,
      condition_likes: null,
      condition_posts: null,
      condition_followers: null,
      isActive: true,
    },
    {
      name: '모임 전문가',
      description: '모임에 25번 참여했습니다!',
      imageUrl: '/images/diverse-3.png',
      badgeType: 'regular',
      condition_meetings: 25,
      condition_likes: null,
      condition_posts: null,
      condition_followers: null,
      isActive: true,
    },
    {
      name: '콘텐츠 크리에이터',
      description: '게시물을 20개 작성했습니다!',
      imageUrl: '/images/diverse-4.png',
      badgeType: 'regular',
      condition_meetings: null,
      condition_likes: null,
      condition_posts: 20,
      condition_followers: null,
      isActive: true,
    },
    {
      name: '인플루언서',
      description: '좋아요 100개를 받았습니다!',
      imageUrl: '/images/consecutive-5.png',
      badgeType: 'regular',
      condition_meetings: null,
      condition_likes: 100,
      condition_posts: null,
      condition_followers: null,
      isActive: true,
    },
    {
      name: '바이럴 스타',
      description: '좋아요 200개를 받았습니다!',
      imageUrl: '/images/activity-running.png',
      badgeType: 'regular',
      condition_meetings: null,
      condition_likes: 200,
      condition_posts: null,
      condition_followers: null,
      isActive: true,
    },
    {
      name: '슈퍼스타',
      description: '좋아요 500개를 받았습니다!',
      imageUrl: '/images/activity-yoga.png',
      badgeType: 'regular',
      condition_meetings: null,
      condition_likes: 500,
      condition_posts: null,
      condition_followers: null,
      isActive: true,
    },
    {
      name: '올라운더',
      description: '모든 분야에서 뛰어납니다!',
      imageUrl: '/images/activity-baby.png',
      badgeType: 'regular',
      condition_meetings: 30,
      condition_likes: 150,
      condition_posts: 25,
      condition_followers: null,
      isActive: true,
    },
    {
      name: '커뮤니티 리더',
      description: '커뮤니티의 리더가 되었습니다!',
      imageUrl: '/images/activity-family.png',
      badgeType: 'regular',
      condition_meetings: 40,
      condition_likes: 300,
      condition_posts: 30,
      condition_followers: 100,
      isActive: true,
    }
  ];

  try {
    console.log(`Creating ${badgeDefinitions.length} badges...`);
    for (const badge of badgeDefinitions) {
      console.log(`Creating badge: ${badge.name}`);
      await prisma.badge.create({
        data: badge
      });
    }
    console.log('✅ Badge Definitions seeded successfully with real images!');
  } catch (error) {
    console.error('❌ Error seeding badge definitions:', error);
    console.error('Full error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedBadges();
}
