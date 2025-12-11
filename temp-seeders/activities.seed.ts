import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedActivities() {
  console.log('Seeding Activities...');

  const activities = [
    {
      name: '스포츠',
      description: '다양한 스포츠 활동과 게임',
      image: '/images/activity-running.png',
    },
    {
      name: '음악',
      description: '음악 관련 활동과 이벤트',
      image: '/images/activity-yoga.png',
    },
    {
      name: '예술 & 공예',
      description: '창의적인 예술과 공예 활동',
      image: '/images/activity-family.png',
    },
    {
      name: '기술',
      description: '기술 모임과 코딩 활동',
      image: '/images/activity-baby.png',
    },
    {
      name: '음식 & 요리',
      description: '요리 활동과 음식 이벤트',
      image: '/images/activity-running.png',
    },
    {
      name: '여행',
      description: '여행과 탐험 활동',
      image: '/images/activity-yoga.png',
    },
    {
      name: '피트니스',
      description: '피트니스와 웰니스 활동',
      image: '/images/activity-family.png',
    },
    {
      name: '교육',
      description: '교육 워크샵과 세미나',
      image: '/images/activity-baby.png',
    },
    {
      name: '비즈니스',
      description: '비즈니스 네트워킹과 기업가정신',
      image: '/images/activity-running.png',
    },
    {
      name: '엔터테인먼트',
      description: '엔터테인먼트와 여가 활동',
      image: '/images/activity-yoga.png',
    },
  ];

  for (const activity of activities) {
    await prisma.activity.create({
      data: activity,
    });
  }

  console.log('Activities seeded successfully!');
}
