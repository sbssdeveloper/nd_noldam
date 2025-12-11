import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedMeetings() {

  const meetings = [
    // User 1's created meetings (will show in "개설" tab) - FUTURE MEETINGS
    {
      userId: 1,
      activities: ['1', '2'], // Sports and Music
      categories: ['4', '6'], // Sports & Activity, Music & Performance
      minNum: 5,
      maxNum: 20,
      fee: 25.00,
      hasFee: true,
      feeBreakdown: {
        contentProduction: true,
        hostSpot: false,
        noShowFee: true,
        royalties: false,
        materialCost: true,
        refreshmentFee: true,
        other: false,
        otherReason: ''
      },
      roadNameAddress: '123 스포츠 단지',
      detailedAddress: '로스앤젤레스, CA',
      meetingTime: new Date('2025-10-15T18:00:00Z'), // FUTURE DATE
      meetingName: '🏃‍♂️ 주말 스포츠 & 음악 모임',
      meetingBackground: '/images/sample_images/meeting_1.jpg',
      description: '스포츠 활동과 음악 세션이 결합된 흥미진진한 모임에 참여하세요. 모든 실력 수준 환영!',
      meetingConsentPersonal: true,
      meetingConsentGuidelines: true,
      adminApproval: true, // Approved for seed data
      status: 'approved', // Approved for seed data
    },
    {
      userId: 1,
      activities: ['3', '4'], // Art & Craft, Technology
      categories: ['2', '8'], // Arts & Culture, Pottery & Making
      minNum: 8,
      maxNum: 15,
      fee: 35.00,
      hasFee: true,
      feeBreakdown: {
        contentProduction: true,
        hostSpot: true,
        noShowFee: false,
        royalties: true,
        materialCost: true,
        refreshmentFee: false,
        other: false,
        otherReason: ''
      },
      roadNameAddress: '456 예술 스튜디오',
      detailedAddress: '뉴욕, NY',
      meetingTime: new Date('2025-10-20T19:00:00Z'), // FUTURE DATE
      meetingName: '🎨 디지털 아트 & 코딩 워크샵',
      meetingBackground: '/images/sample_images/meeting_3.jpg',
      description: '디지털 아트 기법과 기본 코딩을 배워보세요. 초보자와 중급자에게 완벽합니다.',
      meetingConsentPersonal: true,
      meetingConsentGuidelines: true,
      adminApproval: true, // Approved for seed data
      status: 'approved', // Approved for seed data
    },
    {
      userId: 1,
      activities: ['1', '7'], // Sports, Fitness
      categories: ['4', '1'], // Sports & Activity, Lifestyle
      minNum: 10,
      maxNum: 25,
      fee: 20.00,
      hasFee: true,
      feeBreakdown: {
        contentProduction: false,
        hostSpot: true,
        noShowFee: true,
        royalties: false,
        materialCost: true,
        refreshmentFee: false,
        other: true,
        otherReason: '장비 대여비'
      },
      roadNameAddress: '789 피트니스 센터',
      detailedAddress: '오스틴, TX',
      meetingTime: new Date('2025-10-18T07:00:00Z'), // FUTURE DATE
      meetingName: '💪 아침 피트니스 부트캠프',
      meetingBackground: '/images/sample_images/meeting_4.jpg',
      description: '고강도 아침 운동 세션. 에너지로 하루를 시작하는 좋은 방법!',
      meetingConsentPersonal: true,
      meetingConsentGuidelines: true,
      adminApproval: true, // Approved for seed data
      status: 'approved', // Approved for seed data
    },

    // User 2's created meetings (User 1 will participate in some) - FUTURE MEETINGS
    {
      userId: 2,
      activities: ['2', '5'], // Music, Food & Cooking
      categories: ['6', '5'], // Music & Performance, Cooking & Tasting
      minNum: 6,
      maxNum: 12,
      fee: 40.00,
      hasFee: true,
      feeBreakdown: {
        contentProduction: true,
        hostSpot: true,
        noShowFee: false,
        royalties: true,
        materialCost: true,
        refreshmentFee: true,
        other: false,
        otherReason: ''
      },
      roadNameAddress: '321 문화 센터',
      detailedAddress: '마이애미, FL',
      meetingTime: new Date('2025-10-22T17:00:00Z'), // FUTURE DATE
      meetingName: '🎵 라이브 음악과 함께하는 요리',
      meetingBackground: '/images/sample_images/meeting_5.jpg',
      description: '라이브 음악을 즐기며 맛있는 요리를 만들어보세요. 독특한 요리와 문화적 경험입니다.',
      meetingConsentPersonal: true,
      meetingConsentGuidelines: true,
      adminApproval: true, // Approved for seed data
      status: 'approved', // Approved for seed data
    },
    {
      userId: 2,
      activities: ['9', '10'], // Business, Entertainment
      categories: ['9', '10'], // Career & Growth, Social & Talk
      minNum: 15,
      maxNum: 30,
      fee: 50.00,
      hasFee: true,
      feeBreakdown: {
        contentProduction: true,
        hostSpot: true,
        noShowFee: false,
        royalties: true,
        materialCost: false,
        refreshmentFee: true,
        other: true,
        otherReason: '회의실 대여비'
      },
      roadNameAddress: '654 비즈니스 센터',
      detailedAddress: '시카고, IL',
      meetingTime: new Date('2025-10-25T18:30:00Z'), // FUTURE DATE
      meetingName: '🤝 네트워킹 & 엔터테인먼트 믹서',
      meetingBackground: '/images/sample_images/meeting_6.jpg',
      description: '엔터테인먼트가 있는 전문 네트워킹 이벤트. 비즈니스 연결과 재미를 위한 좋은 기회입니다.',
      meetingConsentPersonal: true,
      meetingConsentGuidelines: true,
      adminApproval: true, // Approved for seed data
      status: 'approved', // Approved for seed data
    },

    // User 3's created meetings (User 1 will participate in some) - FUTURE MEETINGS
    {
      userId: 3,
      activities: ['6', '8'], // Education, Travel
      categories: ['7', '3'], // Book & Literature, Outdoor & Picnic
      minNum: 12,
      maxNum: 20,
      fee: 0.00,
      hasFee: false,
      feeBreakdown: null,
      roadNameAddress: '789 교육 센터',
      detailedAddress: '시애틀, WA',
      meetingTime: new Date('2025-10-28T14:00:00Z'), // FUTURE DATE
      meetingName: '📚 언어 교환 & 여행 계획',
      meetingBackground: '/images/sample_images/meeting_7.jpg',
      description: '다양한 언어를 배우고 여행 계획을 세워보세요. 문화 교류의 좋은 기회입니다.',
      meetingConsentPersonal: true,
      meetingConsentGuidelines: true,
      adminApproval: true, // Approved for seed data
      status: 'approved', // Approved for seed data
    },
    {
      userId: 3,
      activities: ['1', '3'], // Sports, Art & Craft
      categories: ['4', '6'], // Sports & Activity, Music & Performance
      minNum: 8,
      maxNum: 16,
      fee: 22.00,
      hasFee: true,
      feeBreakdown: {
        contentProduction: false,
        hostSpot: false,
        noShowFee: false,
        royalties: false,
        materialCost: true,
        refreshmentFee: false,
        other: true,
        otherReason: '재료비'
      },
      roadNameAddress: '321 공원',
      detailedAddress: '포틀랜드, OR',
      meetingTime: new Date('2025-11-02T10:00:00Z'), // FUTURE DATE
      meetingName: '🏃‍♀️ 야외 스포츠 & 아트',
      meetingBackground: '/images/sample_images/meeting_8.jpg',
      description: '자연 속에서 스포츠와 아트를 즐기는 특별한 모임입니다.',
      meetingConsentPersonal: true,
      meetingConsentGuidelines: true,
      adminApproval: true, // Approved for seed data
      status: 'approved', // Approved for seed data
    },

    // User 4's created meetings (User 1 will participate in some) - FUTURE MEETINGS
    {
      userId: 4,
      activities: ['5', '7'], // Food & Cooking, Fitness
      categories: ['5', '8'], // Cooking & Tasting, Pottery & Making
      minNum: 6,
      maxNum: 14,
      fee: 45.00,
      hasFee: true,
      feeBreakdown: {
        contentProduction: true,
        hostSpot: false,
        noShowFee: false,
        royalties: false,
        materialCost: true,
        refreshmentFee: true,
        other: true,
        otherReason: '운동장비 대여비'
      },
      roadNameAddress: '654 요리 스튜디오',
      detailedAddress: '덴버, CO',
      meetingTime: new Date('2025-11-05T16:00:00Z'), // FUTURE DATE
      meetingName: '🍳 헬시 쿠킹 & 피트니스',
      meetingBackground: '/images/sample_images/meeting_9.jpg',
      description: '건강한 요리법을 배우고 피트니스까지 함께하는 종합 웰빙 모임입니다.',
      meetingConsentPersonal: true,
      meetingConsentGuidelines: true,
      adminApproval: true, // Approved for seed data
      status: 'approved', // Approved for seed data
    },

    // User 5's created meetings (User 1 will participate in some) - FUTURE MEETINGS
    {
      userId: 5,
      activities: ['2', '9'], // Music, Business
      categories: ['6', '9'], // Music & Performance, Career & Growth
      minNum: 10,
      maxNum: 25,
      fee: 35.00,
      hasFee: true,
      feeBreakdown: {
        contentProduction: true,
        hostSpot: true,
        noShowFee: false,
        royalties: true,
        materialCost: false,
        refreshmentFee: true,
        other: true,
        otherReason: '음악장비 대여비'
      },
      roadNameAddress: '987 음악 홀',
      detailedAddress: '보스턴, MA',
      meetingTime: new Date('2025-11-08T19:30:00Z'), // FUTURE DATE
      meetingName: '🎼 음악 비즈니스 네트워킹',
      meetingBackground: '/images/sample_images/meeting_10.jpg',
      description: '음악 산업에서의 비즈니스 기회와 네트워킹을 위한 모임입니다.',
      meetingConsentPersonal: true,
      meetingConsentGuidelines: true,
      adminApproval: true, // Approved for seed data
      status: 'approved', // Approved for seed data
    },

    // Additional friend meetings for suggestions (User 1 hasn't joined these)
    {
      userId: 2, // User 2's additional meeting
      activities: ['1', '2'], // Sports, Music
      categories: ['4', '6'], // Sports & Activity, Music & Performance
      minNum: 8,
      maxNum: 16,
      fee: 28.00,
      hasFee: true,
      feeBreakdown: {
        contentProduction: false,
        hostSpot: false,
        noShowFee: false,
        royalties: false,
        materialCost: true,
        refreshmentFee: true,
        other: true,
        otherReason: '장비 대여비'
      },
      roadNameAddress: '555 스포츠 센터',
      detailedAddress: '마이애미, FL',
      meetingTime: new Date('2025-11-10T16:00:00Z'), // FUTURE DATE
      meetingName: '🏃‍♂️ 친구들과 함께하는 스포츠 & 음악',
      meetingBackground: '/images/sample_images/meeting_8.jpg',
      description: '친구들과 함께 즐기는 스포츠와 음악의 조화. 새로운 사람들과의 만남도 기대해보세요!',
      meetingConsentPersonal: true,
      meetingConsentGuidelines: true,
      adminApproval: true, // Approved for seed data
      status: 'approved', // Approved for seed data
    },
    {
      userId: 3, // User 3's additional meeting
      activities: ['5', '6'], // Food & Cooking, Education
      categories: ['5', '7'], // Cooking & Tasting, Book & Literature
      minNum: 6,
      maxNum: 12,
      fee: 32.00,
      hasFee: true,
      feeBreakdown: {
        contentProduction: true,
        hostSpot: false,
        noShowFee: false,
        royalties: false,
        materialCost: true,
        refreshmentFee: false,
        other: true,
        otherReason: '교재비'
      },
      roadNameAddress: '777 요리 아카데미',
      detailedAddress: '시애틀, WA',
      meetingTime: new Date('2025-11-15T14:00:00Z'), // FUTURE DATE
      meetingName: '🍳 요리 클래스 & 언어 교환',
      meetingBackground: '/images/sample_images/meeting_6.jpg',
      description: '요리를 배우면서 다양한 언어도 함께 교환하는 특별한 모임입니다.',
      meetingConsentPersonal: true,
      meetingConsentGuidelines: true,
      adminApproval: true, // Approved for seed data
      status: 'approved', // Approved for seed data
    },
    {
      userId: 2, // User 2's another meeting
      activities: ['9', '10'], // Business, Entertainment
      categories: ['9', '10'], // Career & Growth, Social & Talk
      minNum: 12,
      maxNum: 24,
      fee: 45.00,
      hasFee: true,
      feeBreakdown: {
        contentProduction: true,
        hostSpot: true,
        noShowFee: false,
        royalties: false,
        materialCost: false,
        refreshmentFee: true,
        other: true,
        otherReason: '회의실 대여비'
      },
      roadNameAddress: '888 비즈니스 파크',
      detailedAddress: '시카고, IL',
      meetingTime: new Date('2025-11-20T18:00:00Z'), // FUTURE DATE
      meetingName: '💼 창업가 네트워킹 & 피치 데이',
      meetingBackground: '/images/sample_images/meeting_7.jpg',
      description: '창업가들과의 네트워킹과 아이디어 피치를 위한 모임입니다.',
      meetingConsentPersonal: true,
      meetingConsentGuidelines: true,
      adminApproval: true, // Approved for seed data
      status: 'approved', // Approved for seed data
    },

    // Past meetings that User 1 attended (for "참여한 모임" tab)
    {
      userId: 2, // User 2's past meeting
      activities: ['2', '5'], // Music, Food & Cooking
      categories: ['6', '5'], // Music & Performance, Cooking & Tasting
      minNum: 6,
      maxNum: 12,
      fee: 40.00,
      hasFee: true,
      feeBreakdown: {
        contentProduction: true,
        hostSpot: true,
        noShowFee: false,
        royalties: true,
        materialCost: true,
        refreshmentFee: true,
        other: false,
        otherReason: ''
      },
      roadNameAddress: '321 문화 센터',
      detailedAddress: '마이애미, FL',
      meetingTime: new Date('2025-08-15T17:00:00Z'), // PAST DATE
      meetingName: '🎵 과거 음악 요리 모임',
      meetingBackground: '/images/sample_images/meeting_1.jpg',
      description: '이미 끝난 음악과 요리 모임입니다.',
      meetingConsentPersonal: true,
      meetingConsentGuidelines: true,
      adminApproval: true, // Approved for seed data
      status: 'approved', // Approved for seed data
    },
    {
      userId: 3, // User 3's past meeting
      activities: ['6', '8'], // Education, Travel
      categories: ['7', '3'], // Book & Literature, Outdoor & Picnic
      minNum: 12,
      maxNum: 20,
      fee: 30.00,
      hasFee: true,
      feeBreakdown: {
        contentProduction: true,
        hostSpot: false,
        noShowFee: false,
        royalties: false,
        materialCost: false,
        refreshmentFee: true,
        other: true,
        otherReason: '교재비'
      },
      roadNameAddress: '789 교육 센터',
      detailedAddress: '시애틀, WA',
      meetingTime: new Date('2025-09-10T14:00:00Z'), // PAST DATE
      meetingName: '📚 과거 언어 교환 모임',
      meetingBackground: '/images/sample_images/meeting_2.jpg',
      description: '이미 끝난 언어 교환 모임입니다.',
      meetingConsentPersonal: true,
      meetingConsentGuidelines: true,
      adminApproval: true, // Approved for seed data
      status: 'approved', // Approved for seed data
    },
    {
      userId: 4, // User 4's past meeting
      activities: ['5', '7'], // Food & Cooking, Fitness
      categories: ['5', '8'], // Cooking & Tasting, Pottery & Making
      minNum: 6,
      maxNum: 14,
      fee: 45.00,
      hasFee: true,
      feeBreakdown: {
        contentProduction: true,
        hostSpot: false,
        noShowFee: false,
        royalties: false,
        materialCost: true,
        refreshmentFee: true,
        other: true,
        otherReason: '운동장비 대여비'
      },
      roadNameAddress: '654 요리 스튜디오',
      detailedAddress: '덴버, CO',
      meetingTime: new Date('2025-09-20T16:00:00Z'), // PAST DATE
      meetingName: '🍳 과거 헬시 쿠킹 모임',
      meetingBackground: '/images/sample_images/meeting_3.jpg',
      description: '이미 끝난 헬시 쿠킹 모임입니다.',
      meetingConsentPersonal: true,
      meetingConsentGuidelines: true,
      adminApproval: true, // Approved for seed data
      status: 'approved', // Approved for seed data
    },
  ];

  for (const meeting of meetings) {
    try {
      await prisma.meeting.create({
        data: meeting,
      });
    } catch (error) {
      console.error('Error creating meeting:', error);
      console.error('Meeting data:', JSON.stringify(meeting, null, 2));
    }
  }

}
