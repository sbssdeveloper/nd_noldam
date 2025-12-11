import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedUsers() {
  console.log('Seeding Users...');

  // First, get all categories to map names to IDs
  const categories = await prisma.category.findMany();
  const categoryMap = new Map(categories.map(cat => [cat.name.toLowerCase(), cat.id]));

  // Users will get badges only when they earn community ratings and meet conditions

  // Helper function to map interest names to category IDs
  const mapInterestsToCategories = (interests: string[]): number[] => {
    return interests
      .map(interest => {
        // Map common interest names to Korean category names
        const interestMap: { [key: string]: string } = {
          'sports': '스포츠 · 액티비티 (Activity&Sports)',
          'fitness': '스포츠 · 액티비티 (Activity&Sports)',
          'health': '스포츠 · 액티비티 (Activity&Sports)',
          'music': '음악 · 퍼포먼스 (Music&Performance)',
          'art': '문화 · 예술 (Art&Culture)',
          'culture': '문화 · 예술 (Art&Culture)',
          'technology': '커리어 · 성장 (Motivation&Growth)',
          'tech': '커리어 · 성장 (Motivation&Growth)',
          'cooking': '맛 · 쿠킹 (Cooking&Tasting)',
          'food': '맛 · 쿠킹 (Cooking&Tasting)',
          'travel': '피크닉 · 아웃도어 (Outdoor&Picnic)',
          'adventure': '피크닉 · 아웃도어 (Outdoor&Picnic)',
          'business': '커리어 · 성장 (Motivation&Growth)',
          'networking': '소셜 · 토크 (Social&Talk)',
          'entrepreneurship': '커리어 · 성장 (Motivation&Growth)',
          'education': '책 · 인문 · 글 (Book&litererature)',
          'learning': '책 · 인문 · 글 (Book&litererature)',
          'entertainment': '라이프 · 휴식 (Lifestyle)',
          'volunteer': '소셜 · 토크 (Social&Talk)',
          'community': '소셜 · 토크 (Social&Talk)'
        };
        
        const categoryName = interestMap[interest.toLowerCase()] || interest;
        return categoryMap.get(categoryName.toLowerCase());
      })
      .filter((id): id is number => id !== undefined);
  };

  const users = [
    {
      phoneNumber: '1234567890',
      nickname: 'john_doe',
      statusMessage: 'Looking forward to new adventures!',
      province: 'California',
      city: 'Los Angeles',
      categories: mapInterestsToCategories(['sports', 'music', 'travel']),
      status: 'active',
      lastLogin: new Date(),
    },
    {
      phoneNumber: '1234567891',
      nickname: 'jane_smith',
      statusMessage: 'Tech enthusiast and coffee lover',
      province: 'New York',
      city: 'New York City',
      categories: mapInterestsToCategories(['technology', 'art', 'cooking']),
      status: 'active',
      lastLogin: new Date(),
    },
    {
      phoneNumber: '1234567892',
      nickname: 'mike_wilson',
      statusMessage: 'Fitness and outdoor activities',
      province: 'Texas',
      city: 'Austin',
      categories: mapInterestsToCategories(['fitness', 'sports', 'health']),
      status: 'active',
      lastLogin: new Date(),
    },
    {
      phoneNumber: '1234567893',
      nickname: 'sarah_jones',
      statusMessage: 'Art and culture enthusiast',
      province: 'Florida',
      city: 'Miami',
      categories: mapInterestsToCategories(['art', 'music', 'culture']),
      status: 'active',
      lastLogin: new Date(),
    },
    {
      phoneNumber: '1234567894',
      nickname: 'alex_brown',
      statusMessage: 'Business networking and entrepreneurship',
      province: 'Illinois',
      city: 'Chicago',
      categories: mapInterestsToCategories(['business', 'networking', 'entrepreneurship']),
      status: 'active',
      lastLogin: new Date(),
    },
  ];

  for (const user of users) {
    await prisma.user.create({
      data: user, // Don't assign badge yet - wait for community rating
    });
  }

  console.log('Users seeded successfully!');
  console.log('ℹ️ Active community badges will be assigned when users earn community ratings');
}
