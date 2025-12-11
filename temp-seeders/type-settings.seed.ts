import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedTypeSettings() {
  console.log('Seeding TypeSettings...');

  // Get current date for deactivation examples
  const now = new Date();
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  const typeSettings = [
    {
      type: 'type_A',
      title: '최근에 많은 유저들이 찾아본 모임들이에요',
      description: '인기 있는 모임들을 확인해보세요',
      image: '/images/sample_images/type_1.jpg',
      scope: 'public', // Public scope - shows to all users
      categories: [], // Empty for public scope
      meetings: [1, 2, 3], // Array of meeting IDs
      deactivationDate: futureDate, // Active for 30 days
    },
    {
      type: 'type_B',
      title: '피자에 진심인 사람들을 위한 모임들입니다',
      description: '피자를 사랑하는 사람들이 모이는 공간',
      image: '/images/sample_images/type_2.jpg',
      scope: 'categories', // Categories scope - only for specific categories
      categories: [4, 5, 6], // Array of category IDs as integers
      meetings: [4, 5], // Array of meeting IDs
      deactivationDate: futureDate, // Active for 30 days
    },
    {
      type: 'type_B',
      title: '여름의 노래',
      description: '긴 여름 날의 밤을 지금 즐겨보세요',
      image: '/images/sample_images/type_3.jpg',
      scope: 'public', // Public scope - shows to all users
      categories: [], // Empty for public scope
      meetings: [1, 3], // Array of meeting IDs
      deactivationDate: futureDate, // Active for 30 days
    },
    {
      type: 'type_B',
      title: '디렉터가 추천하는 모임',
      description: '디렉터가 직접 참여하고 추천하는 모임을 모아보았습니다',
      image: '/images/sample_images/type_4.jpg',
      scope: 'public', // Public scope - shows to all users
      categories: [], // Empty for public scope
      meetings: [2, 4, 5], // Array of meeting IDs
      deactivationDate: futureDate, // Active for 30 days
    },
    {
      type: 'type_B',
      title: '운동하는 여성들',
      description: '함께하는 피트니스 라이프',
      image: '/images/sample_images/type_5.jpg',
      scope: 'categories', // Categories scope
      categories: [1, 2], // Sports & Fitness, Arts & Culture categories
      meetings: [3, 6], // Array of meeting IDs
      deactivationDate: futureDate, // Active for 30 days
    },
    {
      type: 'type_B',
      title: '만료된 이벤트 (테스트용)',
      description: '이 이벤트는 만료되었습니다',
      image: '/images/sample_images/type_6.jpg',
      scope: 'public', // Public scope
      categories: [], // Empty for public scope
      meetings: [], // No meetings
      deactivationDate: pastDate, // Expired 7 days ago
    },
  ];

  for (const setting of typeSettings) {
    // Check if record already exists based on type and title
    const existing = await prisma.typeSettings.findFirst({
      where: {
        type: setting.type,
        title: setting.title,
      },
    });

    if (existing) {
      // Update existing record
      await prisma.typeSettings.update({
        where: { id: existing.id },
        data: setting,
      });
      console.log(`Updated TypeSetting: ${setting.title}`);
    } else {
      // Create new record
      await prisma.typeSettings.create({
        data: setting,
      });
      console.log(`Created TypeSetting: ${setting.title}`);
    }
  }

  console.log('TypeSettings seeded successfully!');
}
