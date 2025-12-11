import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedPostSections() {
  console.log('Seeding Post Sections...');

  const postSections = [
    {
      postId: 1,
      sectionNo: 1,
      sectionType: 'title',
      content: '놀라운 주말 스포츠 모임 경험!',
    },
    {
      postId: 1,
      sectionNo: 2,
      sectionType: 'content',
      content: '주말 스포츠 모임에서 정말 놀라운 시간을 보냈습니다. 스포츠와 음악의 조합이 완벽했어요. 많은 멋진 사람들을 만났고 새로운 기술을 배웠습니다. 재미있고 활동적인 주말 활동을 찾는 모든 분께 강력 추천합니다!',
    },
    {
      postId: 1,
      sectionNo: 3,
      sectionType: 'image',
      content: '/images/post1.jpg',
    },
    {
      postId: 2,
      sectionNo: 1,
      sectionType: 'title',
      content: '디지털 아트 워크샵 - 창의적인 여정',
    },
    {
      postId: 2,
      sectionNo: 2,
      sectionType: 'content',
      content: '디지털 아트와 코딩 워크샵이 정말 환상적이었습니다! 강사님이 지식이 풍부하고 인내심이 있으셨어요. 디지털 아트 기법과 기본 코딩에 대해 정말 많이 배웠습니다. 제공된 재료들도 훌륭한 품질이었습니다.',
    },
    {
      postId: 2,
      sectionNo: 3,
      sectionType: 'image',
      content: '/images/post2.jpg',
    },
    {
      postId: 3,
      sectionNo: 1,
      sectionType: 'title',
      content: '아침 피트니스 부트캠프 - 활력 넘치는 시작!',
    },
    {
      postId: 3,
      sectionNo: 2,
      sectionType: 'content',
      content: '하루를 시작하는 정말 좋은 방법이었어요! 아침 피트니스 부트캠프는 강렬했지만 정말 보람있었습니다. 트레이너님이 동기부여가 되셨고 그룹의 에너지가 놀라웠어요. 에너지 넘치고 하루를 정복할 준비가 된 기분으로 떠났습니다.',
    },
    {
      postId: 3,
      sectionNo: 3,
      sectionType: 'image',
      content: '/images/post3.jpg',
    },
    {
      postId: 4,
      sectionNo: 1,
      sectionType: 'title',
      content: '라이브 음악과 함께하는 요리 - 독특한 경험',
    },
    {
      postId: 4,
      sectionNo: 2,
      sectionType: 'content',
      content: '정말 독특하고 즐거운 경험이었습니다! 라이브 음악을 들으며 맛있는 요리를 만드는 것이 놀라운 분위기를 연출했어요. 셰프님이 재능이 있으시고 음악가들도 환상적이었습니다. 요리와 문화적 경험의 완벽한 조합이었습니다.',
    },
    {
      postId: 4,
      sectionNo: 3,
      sectionType: 'image',
      content: '/images/post4.jpg',
    },
    {
      postId: 5,
      sectionNo: 1,
      sectionType: 'title',
      content: '네트워킹 믹서 - 훌륭한 비즈니스 연결',
    },
    {
      postId: 5,
      sectionNo: 2,
      sectionType: 'content',
      content: '네트워킹과 엔터테인먼트 믹서는 제 비즈니스 성장에 정말 필요한 것이었습니다. 여러 잠재 고객과 파트너를 만났어요. 엔터테인먼트가 훌륭했고 분위기를 부드럽게 만드는 데 도움이 되었습니다. 네트워킹에 완벽한 장소였습니다.',
    },
    {
      postId: 5,
      sectionNo: 3,
      sectionType: 'image',
      content: '/images/post5.jpg',
    },
  ];

  for (const section of postSections) {
    await prisma.postSection.create({
      data: section,
    });
  }

  console.log('Posts (Post Sections) seeded successfully!');
}
