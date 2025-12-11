import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedMeetingParticipants() {
  console.log('Seeding Meeting Participants...');

  const participants = [
    // User 1's created meetings (meetings 1, 2, 3) - will show in "개설" tab
    // These are meetings created by User 1, so User 1 doesn't need to join them
    
    // User 1 participates in meetings created by others - will show in "참여" tab
    // These are FUTURE meetings that User 1 has joined (scheduled meetings)
    {
      meetingId: 4, // User 2's meeting: "🎵 라이브 음악과 함께하는 요리"
      userId: 1,
      joinedOn: new Date('2025-10-10T10:00:00Z'), // FUTURE JOIN DATE
      paymentStatus: 'completed',
      paymentId: null,
    },
    {
      meetingId: 5, // User 2's meeting: "🤝 네트워킹 & 엔터테인먼트 믹서"
      userId: 1,
      joinedOn: new Date('2025-10-12T14:30:00Z'), // FUTURE JOIN DATE
      paymentStatus: 'completed',
      paymentId: null,
    },
    {
      meetingId: 6, // User 3's meeting: "📚 언어 교환 & 여행 계획"
      userId: 1,
      joinedOn: new Date('2025-10-15T09:15:00Z'), // FUTURE JOIN DATE
      paymentStatus: 'completed',
      paymentId: null,
    },
    {
      meetingId: 7, // User 3's meeting: "🏃‍♀️ 야외 스포츠 & 아트"
      userId: 1,
      joinedOn: new Date('2025-10-18T11:20:00Z'), // FUTURE JOIN DATE
      paymentStatus: 'completed',
      paymentId: null,
    },
    {
      meetingId: 8, // User 4's meeting: "🍳 헬시 쿠킹 & 피트니스"
      userId: 1,
      joinedOn: new Date('2025-10-20T16:45:00Z'), // FUTURE JOIN DATE
      paymentStatus: 'completed',
      paymentId: null,
    },
    {
      meetingId: 9, // User 5's meeting: "🎼 음악 비즈니스 네트워킹"
      userId: 1,
      joinedOn: new Date('2025-10-22T18:30:00Z'), // FUTURE JOIN DATE
      paymentStatus: 'completed',
      paymentId: null,
    },

    // Past meeting participants for User 1 (for "참여한 모임" tab)
    {
      meetingId: 13, // Past meeting: "🎵 과거 음악 요리 모임"
      userId: 1,
      joinedOn: new Date('2025-08-10T10:00:00Z'), // PAST JOIN DATE
      paymentStatus: 'completed',
      paymentId: null,
    },
    {
      meetingId: 14, // Past meeting: "📚 과거 언어 교환 모임"
      userId: 1,
      joinedOn: new Date('2025-09-05T09:15:00Z'), // PAST JOIN DATE
      paymentStatus: 'completed',
      paymentId: null,
    },
    {
      meetingId: 15, // Past meeting: "🍳 과거 헬시 쿠킹 모임"
      userId: 1,
      joinedOn: new Date('2025-09-15T16:45:00Z'), // PAST JOIN DATE
      paymentStatus: 'completed',
      paymentId: null,
    },

    // Other users participate in User 1's meetings
    {
      meetingId: 1, // User 1's meeting: "🏃‍♂️ 주말 스포츠 & 음악 모임"
      userId: 2,
      joinedOn: new Date('2024-02-10T10:00:00Z'),
      paymentStatus: 'completed',
      paymentId: null,
    },
    {
      meetingId: 1,
      userId: 3,
      joinedOn: new Date('2024-02-12T14:30:00Z'),
      paymentStatus: 'completed',
      paymentId: null,
    },
    {
      meetingId: 1,
      userId: 4,
      joinedOn: new Date('2024-02-14T09:15:00Z'),
      paymentStatus: 'completed',
      paymentId: null,
    },
    {
      meetingId: 1,
      userId: 5,
      joinedOn: new Date('2024-02-16T16:45:00Z'),
      paymentStatus: 'completed',
      paymentId: null,
    },
    {
      meetingId: 2, // User 1's meeting: "🎨 디지털 아트 & 코딩 워크샵"
      userId: 2,
      joinedOn: new Date('2024-02-18T11:20:00Z'),
      paymentStatus: 'completed',
      paymentId: null,
    },
    {
      meetingId: 2,
      userId: 3,
      joinedOn: new Date('2024-02-19T13:10:00Z'),
      paymentStatus: 'completed',
      paymentId: null,
    },
    {
      meetingId: 2,
      userId: 5,
      joinedOn: new Date('2024-02-21T15:30:00Z'),
      paymentStatus: 'completed',
      paymentId: null,
    },
    {
      meetingId: 3, // User 1's meeting: "💪 아침 피트니스 부트캠프"
      userId: 2,
      joinedOn: new Date('2024-02-15T12:00:00Z'),
      paymentStatus: 'completed',
      paymentId: null,
    },
    {
      meetingId: 3,
      userId: 4,
      joinedOn: new Date('2024-02-17T08:45:00Z'),
      paymentStatus: 'completed',
      paymentId: null,
    },
    {
      meetingId: 3,
      userId: 5,
      joinedOn: new Date('2024-02-19T17:20:00Z'),
      paymentStatus: 'completed',
      paymentId: null,
    },

    // Other users participate in other meetings (not User 1's)
    {
      meetingId: 4, // User 2's meeting
      userId: 3,
      joinedOn: new Date('2024-02-21T10:15:00Z'),
      paymentStatus: 'completed',
      paymentId: null,
    },
    {
      meetingId: 4,
      userId: 4,
      joinedOn: new Date('2024-02-22T14:30:00Z'),
      paymentStatus: 'completed',
      paymentId: null,
    },
    {
      meetingId: 5, // User 2's meeting
      userId: 3,
      joinedOn: new Date('2024-02-24T16:45:00Z'),
      paymentStatus: 'completed',
      paymentId: null,
    },
    {
      meetingId: 5,
      userId: 4,
      joinedOn: new Date('2024-02-25T10:15:00Z'),
      paymentStatus: 'completed',
      paymentId: null,
    },
    {
      meetingId: 5,
      userId: 5,
      joinedOn: new Date('2024-02-26T14:30:00Z'),
      paymentStatus: 'completed',
      paymentId: null,
    },
  ];

  for (const participant of participants) {
    await prisma.meetingParticipant.create({
      data: participant,
    });
  }

  console.log('Meeting Participants seeded successfully!');
}
