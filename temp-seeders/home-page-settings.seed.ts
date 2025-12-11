import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedHomePageSettings() {
  console.log('Seeding HomePageSettings...');

  const homePageSettings = [
    {
      title: '우리 커뮤니티에 오신 것을 환영합니다',
      content: '활기찬 커뮤니티에 참여하여 놀라운 활동을 발견하고, 새로운 사람들을 만나며, 지속적인 추억을 만들어보세요. 모험, 학습, 또는 단순한 재미를 찾고 계시든, 모든 분을 위한 것이 있습니다.',
      image: '/images/sample_images/home_slider_1.jpg',
      redirectUrl: '/meeting/item-detail/1',
      target: '_self',
      status: 'active',
      userId: 1, // Global setting
    },
    {
      title: '추천 활동',
      content: '가장 인기 있는 활동과 카테고리를 탐색해보세요. 야외 모험부터 창의적인 워크샵까지, 다음으로 좋아할 활동을 찾아보세요.',
      image: '/images/sample_images/home_slider_2.jpg',
      redirectUrl: '/meeting/item-detail/2',
      target: '_self',
      status: 'active',
      userId: 2, // Global setting
    },
    {
      title: '모임 참여하기',
      content: '같은 생각을 가진 사람들과 연결할 준비가 되셨나요? 다가오는 모임과 이벤트를 둘러보세요. 원하는 것을 찾지 못하셨나요? 직접 모임을 만들어보세요!',
      image: '/images/sample_images/home_slider_3.jpg',
      redirectUrl: '/meeting/item-detail/3',
      target: '_self',
      status: 'active',
      userId: 3, // Global setting
    },
    {
      title: '커뮤니티 가이드라인',
      content: '모든 사람을 위한 안전하고 환영하는 환경을 보장하기 위한 커뮤니티 가치와 가이드라인에 대해 알아보세요.',
      image: '/images/sample_images/home_slider_4.jpg',
      redirectUrl: '/meeting/item-detail/4',
      target: '_self',
      status: 'active',
      userId: 4, // Global setting
    },
    {
      title: '특별 이벤트 - 한정 시간',
      content: '특별한 한정 시간 이벤트를 놓치지 마세요! 놓치고 싶지 않은 독점적인 경험에 참여하세요.',
      image: '/images/sample_images/home_slider_5.jpg',
      redirectUrl: '/meeting/item-detail/5',
      target: '_blank',
      status: 'active',
      userId: 5, // Global setting
    },
  ];

  for (const setting of homePageSettings) {
    // Check if record already exists based on userId and title
    const existing = await prisma.homePageSettings.findFirst({
      where: {
        userId: setting.userId,
        title: setting.title,
      },
    });

    if (existing) {
      // Update existing record
      await prisma.homePageSettings.update({
        where: { id: existing.id },
        data: setting,
      });
      console.log(`Updated HomePageSetting: ${setting.title}`);
    } else {
      // Create new record
      await prisma.homePageSettings.create({
        data: setting,
      });
      console.log(`Created HomePageSetting: ${setting.title}`);
    }
  }

  console.log('HomePageSettings seeded successfully!');
}
