import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedCategories() {
  console.log('Seeding Categories...');

  const categories = [
    {
      name: '라이프 · 휴식 (Lifestyle)',
      description: '일상 리듬을 재충전하는 영화·넷플 콘텐츠 감상, 브런치 모임, 가드닝 등 라이프스타일 기반 활동',
      image: '/images/catogery_images/lifestyle.png',
    },
    {
      name: '문화 · 예술 (Art&Culture)',
      description: ' 전시·공연 관람, 북토크, 감성 사진 산책 등 감각을 깨우는 문화 / 아트 경험',
      image: '/images/catogery_images/Art&Culture.png',
    },
    {
      name: '피크닉 · 아웃도어 (Outdoor&Picnic)',
      description: '근교 트레킹, 캠핑, 도시 건축 투어처럼 ‘함께 떠나는’ 탐험형 모임',
      image: '/images/catogery_images/Outdoor&Picnic.png',
    },
    {
      name: '스포츠 · 액티비티 (Activity&Sports)',
      description: ' 러닝크루, 요가·필라테스, 보드·서핑 등 몸으로 즐기는 활동',
      image: '/images/catogery_images/Activity&Sports.png',
    },
    {
      name: '맛 · 쿠킹 (Cooking&Tasting)',
      description: '테이블 위 배움: 쿠킹 클래스, 와인·티·위스키 시음, 동네 맛집 탐방',
      image: '/images/catogery_images/Cooking&Tasting.png',
    },
    {
      name: '음악 · 퍼포먼스 (Music&Performance)',
      description: '재즈바 탐방, 악기 원데이, OST 토크·공연 감상 같은 사운드 경험',
      image: '/images/catogery_images/music.png',
    },
    {
      name: '책 · 인문 · 글 (Book&litererature)',
      description: '독서·글쓰기 모임, 철학·인문 스터디로 깊이 있는 대화와 기록',
      image: '/images/catogery_images/Book.png',
    },
    {
      name: '공예 · 메이킹 (Potery&Making)',
      description: '향초·도예·드로잉 등 손으로 창작하며 배우는 DIY·크래프트',
      image: '/images/catogery_images/Potery.png',
    },
    {
      name: '커리어 · 성장 (Motivation&Growth)',
      description: '사이드 프로젝트, 직무 스터디, 퍼스널 브랜딩 등 실전형 자기계발',
      image: '/images/catogery_images/Motivation.png',
    },
    {
      name: '소셜 · 토크 (Social&Talk)',
      description: '사랑·관계·MBTI·일상 수다 등 편하게 만나 교류하는 친목형 모임',
      image: '/images/catogery_images/Social.png',
    },
  ];

  for (const category of categories) {
    await prisma.category.create({
      data: category,
    });
  }

  console.log('Categories seeded successfully!');
}
