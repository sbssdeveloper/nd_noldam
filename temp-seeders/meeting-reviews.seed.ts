import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedMeetingReviews() {
  console.log('Seeding Meeting Reviews...');

  try {
    // Get all meetings from the database
    const meetings = await prisma.meeting.findMany({
      select: {
        id: true,
        meetingName: true,
        userId: true, // Meeting creator
        categories: true,
        activities: true
      }
    });

    // Get all users from the database
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nickname: true
      }
    });

    console.log(`Found ${meetings.length} meetings and ${users.length} users`);

    if (meetings.length === 0) {
      console.log('No meetings found. Please run meetings seeder first.');
      return;
    }

    if (users.length === 0) {
      console.log('No users found. Please run users seeder first.');
      return;
    }

    // Korean review templates for different categories and ratings
    const reviewTemplates = {
      sports: {
        5: [
          { title: "정말 즐거운 시간이었어요!", content: "운동도 하고 새로운 사람들도 만날 수 있어서 너무 좋았습니다. 다음에도 꼭 참여하고 싶어요!" },
          { title: "완벽한 모임이었습니다", content: "분위기도 좋고 참가자들도 모두 친절해서 정말 즐거웠어요. 강력 추천합니다!" },
          { title: "운동하면서 친구도 만들었어요", content: "처음 참여했는데 너무 재미있었습니다. 이제 정기적으로 참여할 예정이에요!" }
        ],
        4: [
          { title: "좋은 경험이었어요", content: "전반적으로 만족스러웠습니다. 시간이 조금 더 길었으면 좋겠어요." },
          { title: "재미있었습니다", content: "운동도 하고 사람들도 만날 수 있어서 좋았어요. 다음에도 참여할게요!" }
        ],
        3: [
          { title: "괜찮았어요", content: "평범한 모임이었습니다. 특별한 점은 없었지만 나쁘지 않았어요." }
        ],
        2: [
          { title: "아쉬웠어요", content: "기대했던 것보다는 조금 아쉬웠습니다. 시간 관리가 좀 더 필요할 것 같아요." }
        ],
        1: [
          { title: "개선이 필요해요", content: "시간이 지연되고 분위기도 별로였습니다. 다음에는 더 잘 준비해주세요." }
        ]
      },
      music: {
        5: [
          { title: "음악이 정말 좋았어요!", content: "다양한 장르의 음악을 들을 수 있어서 너무 즐거웠습니다. 다음에도 꼭 참여하고 싶어요!" },
          { title: "완벽한 음악 모임", content: "음질도 좋고 분위기도 최고였어요. 음악을 사랑하는 사람들에게 강력 추천합니다!" },
          { title: "새로운 음악을 발견했어요", content: "평소에 듣지 않던 장르의 음악을 접할 수 있어서 좋았습니다. 음악적 지식도 늘었어요!" }
        ],
        4: [
          { title: "좋은 음악 경험이었어요", content: "전반적으로 만족스러웠습니다. 좀 더 다양한 음악이 있었으면 좋겠어요." },
          { title: "재미있는 시간이었습니다", content: "음악도 좋고 사람들도 만날 수 있어서 즐거웠어요!" }
        ],
        3: [
          { title: "괜찮았어요", content: "평범한 음악 모임이었습니다. 특별한 점은 없었지만 나쁘지 않았어요." }
        ],
        2: [
          { title: "아쉬웠어요", content: "음질이 기대했던 것보다는 조금 아쉬웠습니다. 시설 개선이 필요할 것 같아요." }
        ],
        1: [
          { title: "개선이 필요해요", content: "음질이 별로였고 분위기도 좋지 않았습니다. 더 나은 준비가 필요해요." }
        ]
      },
      culture: {
        5: [
          { title: "문화적 경험이 풍부했어요!", content: "다양한 문화를 접할 수 있어서 정말 좋았습니다. 지식도 늘고 즐거운 시간이었어요!" },
          { title: "완벽한 문화 모임", content: "전시도 좋고 설명도 자세해서 이해하기 쉬웠어요. 문화를 사랑하는 사람들에게 추천합니다!" },
          { title: "새로운 관점을 얻었어요", content: "평소에 몰랐던 문화적 배경을 알 수 있어서 유익했습니다. 다음에도 참여하고 싶어요!" }
        ],
        4: [
          { title: "좋은 문화 경험이었어요", content: "전반적으로 만족스러웠습니다. 좀 더 자세한 설명이 있었으면 좋겠어요." },
          { title: "유익한 시간이었습니다", content: "문화에 대해 배울 수 있어서 좋았어요. 사람들도 만날 수 있어서 즐거웠습니다!" }
        ],
        3: [
          { title: "괜찮았어요", content: "평범한 문화 모임이었습니다. 특별한 점은 없었지만 나쁘지 않았어요." }
        ],
        2: [
          { title: "아쉬웠어요", content: "기대했던 것보다는 조금 아쉬웠습니다. 더 자세한 설명이 필요할 것 같아요." }
        ],
        1: [
          { title: "개선이 필요해요", content: "설명이 부족하고 분위기도 별로였습니다. 더 나은 준비가 필요해요." }
        ]
      },
      cooking: {
        5: [
          { title: "요리가 정말 맛있었어요!", content: "다양한 요리를 배울 수 있어서 너무 좋았습니다. 집에서도 만들어볼 예정이에요!" },
          { title: "완벽한 쿠킹 클래스", content: "재료도 신선하고 설명도 자세해서 이해하기 쉬웠어요. 요리를 사랑하는 사람들에게 강력 추천합니다!" },
          { title: "새로운 레시피를 배웠어요", content: "평소에 몰랐던 요리법을 알 수 있어서 유익했습니다. 다음에도 참여하고 싶어요!" }
        ],
        4: [
          { title: "좋은 요리 경험이었어요", content: "전반적으로 만족스러웠습니다. 좀 더 다양한 요리가 있었으면 좋겠어요." },
          { title: "재미있는 쿠킹 시간", content: "요리도 배우고 사람들도 만날 수 있어서 즐거웠어요!" }
        ],
        3: [
          { title: "괜찮았어요", content: "평범한 요리 모임이었습니다. 특별한 점은 없었지만 나쁘지 않았어요." }
        ],
        2: [
          { title: "아쉬웠어요", content: "재료가 기대했던 것보다는 조금 아쉬웠습니다. 더 신선한 재료가 필요할 것 같아요." }
        ],
        1: [
          { title: "개선이 필요해요", content: "재료가 별로였고 위생도 좋지 않았습니다. 더 나은 준비가 필요해요." }
        ]
      },
      default: {
        5: [
          { title: "정말 즐거운 시간이었어요!", content: "모임이 너무 재미있었습니다. 새로운 사람들도 만날 수 있어서 좋았어요!" },
          { title: "완벽한 모임이었습니다", content: "분위기도 좋고 참가자들도 모두 친절해서 정말 즐거웠어요. 강력 추천합니다!" },
          { title: "새로운 경험이었어요", content: "처음 참여했는데 너무 재미있었습니다. 이제 정기적으로 참여할 예정이에요!" }
        ],
        4: [
          { title: "좋은 경험이었어요", content: "전반적으로 만족스러웠습니다. 시간이 조금 더 길었으면 좋겠어요." },
          { title: "재미있었습니다", content: "모임도 재미있고 사람들도 만날 수 있어서 좋았어요!" }
        ],
        3: [
          { title: "괜찮았어요", content: "평범한 모임이었습니다. 특별한 점은 없었지만 나쁘지 않았어요." }
        ],
        2: [
          { title: "아쉬웠어요", content: "기대했던 것보다는 조금 아쉬웠습니다. 시간 관리가 좀 더 필요할 것 같아요." }
        ],
        1: [
          { title: "개선이 필요해요", content: "시간이 지연되고 분위기도 별로였습니다. 다음에는 더 잘 준비해주세요." }
        ]
      }
    };

    // Function to determine category type from meeting data
    const getCategoryType = (categories: string[], activities: string[]): string => {
      const categoryStr = categories.join(' ').toLowerCase();
      const activityStr = activities.join(' ').toLowerCase();
      
      if (categoryStr.includes('스포츠') || activityStr.includes('sports') || activityStr.includes('fitness')) {
        return 'sports';
      } else if (categoryStr.includes('음악') || activityStr.includes('music')) {
        return 'music';
      } else if (categoryStr.includes('문화') || categoryStr.includes('예술') || activityStr.includes('art') || activityStr.includes('culture')) {
        return 'culture';
      } else if (categoryStr.includes('쿠킹') || categoryStr.includes('맛') || activityStr.includes('cooking') || activityStr.includes('food')) {
        return 'cooking';
      }
      return 'default';
    };

    // Function to get random review
    const getRandomReview = (categoryType: string, rating: number) => {
      const templates = reviewTemplates[categoryType as keyof typeof reviewTemplates] || reviewTemplates.default;
      const ratingTemplates = templates[rating as keyof typeof templates];
      if (!ratingTemplates || ratingTemplates.length === 0) {
        return reviewTemplates.default[rating as keyof typeof reviewTemplates.default][0];
      }
      return ratingTemplates[Math.floor(Math.random() * ratingTemplates.length)];
    };

    let totalReviewsCreated = 0;

    // Create reviews for each meeting
    for (const meeting of meetings) {
      console.log(`Creating reviews for meeting: ${meeting.meetingName} (ID: ${meeting.id})`);
      
      // Get available users (exclude meeting creator)
      const availableUsers = users.filter(user => user.id !== meeting.userId);
      
      if (availableUsers.length < 3) {
        console.log(`Not enough users to create reviews for meeting ${meeting.id}. Skipping.`);
        continue;
      }

      // Shuffle users and take up to 3 (or available users)
      const shuffledUsers = availableUsers.sort(() => Math.random() - 0.5).slice(0, Math.min(3, availableUsers.length));
      
      const categoryType = getCategoryType(meeting.categories, meeting.activities);
      
      // Create reviews with varied ratings (up to 3 reviews)
      const ratings = [5, 4, 3]; // Positive reviews with variety
      
      for (let i = 0; i < shuffledUsers.length; i++) {
        const user = shuffledUsers[i];
        const rating = ratings[i];
        const review = getRandomReview(categoryType, rating);
        
        try {
          await prisma.meetingReview.create({
            data: {
              userId: user.id,
              meetingId: meeting.id,
              rating: rating,
              title: review.title,
              content: review.content,
              createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
            }
          });
          
          totalReviewsCreated++;
          console.log(`  ✓ Created review by ${user.nickname} (${rating} stars)`);
          
        } catch (error) {
          console.error(`  ✗ Error creating review for user ${user.id} and meeting ${meeting.id}:`, error);
        }
      }
    }

    console.log(`\n✅ Meeting Reviews Seeding Complete!`);
    console.log(`📊 Total reviews created: ${totalReviewsCreated}`);
    console.log(`📈 Average reviews per meeting: ${(totalReviewsCreated / meetings.length).toFixed(1)}`);

  } catch (error) {
    console.error('Error seeding meeting reviews:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder if this file is executed directly
if (require.main === module) {
  seedMeetingReviews()
    .then(() => {
      console.log('Meeting reviews seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Meeting reviews seeding failed:', error);
      process.exit(1);
    });
}
