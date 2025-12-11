import { PrismaClient } from '@prisma/client';
import { NOTIFICATION_TYPES } from '../src/app/web/config/notifications';

const prisma = new PrismaClient();

export async function seedNotifications() {
  console.log('Seeding Notifications...');

  // Get some users for notifications
  const users = await prisma.user.findMany({
    take: 5,
    select: { id: true, nickname: true }
  });

  if (users.length === 0) {
    console.log('No users found. Please seed users first.');
    return;
  }

  const notifications = [
    // ==================== MEETING NOTIFICATIONS ====================
    {
      userId: users[0].id,
      notificationType: NOTIFICATION_TYPES.MEETING_CREATED,
      notificationDetails: '김철수님이 새로운 모임을 만들었습니다: 주말 스포츠 & 음악 모임',
      place: '서울',
      isRead: false,
      priority: 1,
      category: 'meeting',
      relatedId: 1,
      relatedType: 'meeting',
      actionUrl: '/feed'
    },
    {
      userId: users[1].id,
      notificationType: NOTIFICATION_TYPES.MEETING_JOINED,
      notificationDetails: '이영희님이 모임에 참여했습니다: 주말 스포츠 & 음악 모임',
      place: '서울',
      isRead: false,
      priority: 1,
      category: 'meeting',
      relatedId: 1,
      relatedType: 'meeting',
      actionUrl: '/feed'
    },
    {
      userId: users[0].id,
      notificationType: NOTIFICATION_TYPES.MEETING_LEFT,
      notificationDetails: '박민수님이 모임에서 나갔습니다: 주말 스포츠 & 음악 모임',
      place: '서울',
      isRead: true,
      priority: 2,
      category: 'meeting',
      relatedId: 1,
      relatedType: 'meeting',
      actionUrl: '/feed'
    },
    {
      userId: users[2].id,
      notificationType: NOTIFICATION_TYPES.MEETING_CANCELLED,
      notificationDetails: '모임이 취소되었습니다: 주말 스포츠 & 음악 모임',
      place: '서울',
      isRead: false,
      priority: 1,
      category: 'meeting',
      relatedId: 1,
      relatedType: 'meeting',
      actionUrl: '/feed'
    },
    {
      userId: users[0].id,
      notificationType: NOTIFICATION_TYPES.MEETING_REMINDER_24H,
      notificationDetails: '모임이 24시간 후에 시작됩니다: 주말 스포츠 & 음악 모임',
      place: '서울',
      isRead: false,
      priority: 1,
      category: 'reminder',
      relatedId: 1,
      relatedType: 'meeting',
      actionUrl: '/feed'
    },
    {
      userId: users[1].id,
      notificationType: NOTIFICATION_TYPES.MEETING_REMINDER_2H,
      notificationDetails: '모임이 2시간 후에 시작됩니다: 주말 스포츠 & 음악 모임',
      place: '서울',
      isRead: false,
      priority: 1,
      category: 'reminder',
      relatedId: 1,
      relatedType: 'meeting',
      actionUrl: '/feed'
    },
    {
      userId: users[2].id,
      notificationType: NOTIFICATION_TYPES.MEETING_REMINDER_30MIN,
      notificationDetails: '모임이 30분 후에 시작됩니다: 주말 스포츠 & 음악 모임',
      place: '서울',
      isRead: false,
      priority: 1,
      category: 'reminder',
      relatedId: 1,
      relatedType: 'meeting',
      actionUrl: '/feed'
    },
    {
      userId: users[0].id,
      notificationType: NOTIFICATION_TYPES.MEETING_STARTED,
      notificationDetails: '모임이 시작되었습니다: 주말 스포츠 & 음악 모임',
      place: '서울',
      isRead: true,
      priority: 1,
      category: 'meeting',
      relatedId: 1,
      relatedType: 'meeting',
      actionUrl: '/feed'
    },
    {
      userId: users[1].id,
      notificationType: NOTIFICATION_TYPES.MEETING_ENDED,
      notificationDetails: '모임이 종료되었습니다: 주말 스포츠 & 음악 모임',
      place: '서울',
      isRead: true,
      priority: 2,
      category: 'meeting',
      relatedId: 1,
      relatedType: 'meeting',
      actionUrl: '/feed'
    },

    // ==================== SOCIAL NOTIFICATIONS ====================
    {
      userId: users[0].id,
      notificationType: NOTIFICATION_TYPES.NEW_FOLLOWER,
      notificationDetails: '김영수님이 당신을 팔로우하기 시작했습니다',
      place: '서울',
      isRead: false,
      priority: 1,
      category: 'social',
      relatedId: users[3]?.id || 1,
      relatedType: 'user',
      actionUrl: `/profile`
    },
    {
      userId: users[1].id,
      notificationType: NOTIFICATION_TYPES.UNFOLLOWED,
      notificationDetails: '박지영님이 팔로우를 취소했습니다',
      place: '서울',
      isRead: true,
      priority: 3,
      category: 'social',
      relatedId: users[4]?.id || 2,
      relatedType: 'user',
      actionUrl: `/profile`
    },
    {
      userId: users[0].id,
      notificationType: NOTIFICATION_TYPES.POST_LIKED,
      notificationDetails: '이민호님이 당신의 게시물을 좋아합니다',
      place: '서울',
      isRead: false,
      priority: 3,
      category: 'social',
      relatedId: 1,
      relatedType: 'post',
      actionUrl: '/post/1'
    },
    {
      userId: users[1].id,
      notificationType: NOTIFICATION_TYPES.POST_COMMENT,
      notificationDetails: '정수진님이 당신의 게시물에 댓글을 남겼습니다',
      place: '서울',
      isRead: false,
      priority: 2,
      category: 'social',
      relatedId: 2,
      relatedType: 'post',
      actionUrl: '/post/2'
    },
    {
      userId: users[2].id,
      notificationType: NOTIFICATION_TYPES.POST_SHARED,
      notificationDetails: '최현우님이 당신의 게시물을 공유했습니다',
      place: '서울',
      isRead: true,
      priority: 2,
      category: 'social',
      relatedId: 3,
      relatedType: 'post',
      actionUrl: '/post/3'
    },
    {
      userId: users[0].id,
      notificationType: NOTIFICATION_TYPES.POST_MENTIONED,
      notificationDetails: '게시물에서 언급되었습니다: @김민지',
      place: '서울',
      isRead: false,
      priority: 1,
      category: 'social',
      relatedId: 4,
      relatedType: 'post',
      actionUrl: '/post/4'
    },
    {
      userId: users[1].id,
      notificationType: NOTIFICATION_TYPES.MEETING_LIKED,
      notificationDetails: '한소영님이 당신의 모임을 좋아합니다',
      place: '서울',
      isRead: false,
      priority: 3,
      category: 'social',
      relatedId: 2,
      relatedType: 'meeting',
      actionUrl: '/feed'
    },
    {
      userId: users[2].id,
      notificationType: NOTIFICATION_TYPES.MEETING_SHARED,
      notificationDetails: '윤태호님이 당신의 모임을 공유했습니다',
      place: '서울',
      isRead: true,
      priority: 2,
      category: 'social',
      relatedId: 3,
      relatedType: 'meeting',
      actionUrl: '/feed'
    },

    // ==================== ACHIEVEMENT NOTIFICATIONS ====================
    {
      userId: users[0].id,
      notificationType: NOTIFICATION_TYPES.BADGE_EARNED,
      notificationDetails: '새로운 배지를 획득했습니다: 첫 모임 개설자',
      place: '서울',
      isRead: false,
      priority: 1,
      category: 'achievement',
      relatedId: 1,
      relatedType: 'badge',
      actionUrl: '/profile'
    },
    {
      userId: users[1].id,
      notificationType: NOTIFICATION_TYPES.LEVEL_UP,
      notificationDetails: '커뮤니티 등급이 상승했습니다: 골드',
      place: '서울',
      isRead: false,
      priority: 1,
      category: 'achievement',
      relatedId: 2,
      relatedType: 'badge',
      actionUrl: '/profile'
    },
    {
      userId: users[2].id,
      notificationType: NOTIFICATION_TYPES.FIRST_MEETING_CREATED,
      notificationDetails: '첫 모임을 개설했습니다!',
      place: '서울',
      isRead: true,
      priority: 1,
      category: 'achievement',
      relatedId: 3,
      relatedType: 'meeting',
      actionUrl: '/feed'
    },
    {
      userId: users[0].id,
      notificationType: NOTIFICATION_TYPES.FIRST_MEETING_JOINED,
      notificationDetails: '첫 모임에 참여했습니다!',
      place: '서울',
      isRead: true,
      priority: 1,
      category: 'achievement',
      relatedId: 4,
      relatedType: 'meeting',
      actionUrl: '/feed'
    },

    // ==================== RECOMMENDATION NOTIFICATIONS ====================
    {
      userId: users[1].id,
      notificationType: NOTIFICATION_TYPES.MEETING_RECOMMENDATION,
      notificationDetails: '당신에게 맞는 모임을 추천합니다: 주말 등산 모임',
      place: '서울',
      isRead: false,
      priority: 2,
      category: 'recommendation',
      relatedId: 5,
      relatedType: 'meeting',
      actionUrl: '/feed'
    },
    {
      userId: users[2].id,
      notificationType: NOTIFICATION_TYPES.FRIEND_ACTIVITY,
      notificationDetails: '친구들이 활발하게 활동하고 있습니다',
      place: '서울',
      isRead: true,
      priority: 3,
      category: 'recommendation',
      relatedId: null,
      relatedType: null,
      actionUrl: '/profile'
    },
    {
      userId: users[0].id,
      notificationType: NOTIFICATION_TYPES.CATEGORY_MEETING_AVAILABLE,
      notificationDetails: '관심 카테고리의 새로운 모임이 있습니다: 요가 클래스',
      place: '서울',
      isRead: false,
      priority: 2,
      category: 'recommendation',
      relatedId: 6,
      relatedType: 'meeting',
      actionUrl: '/feed'
    },

    // ==================== MILESTONE NOTIFICATIONS ====================
    {
      userId: users[1].id,
      notificationType: NOTIFICATION_TYPES.MEETING_PARTICIPANTS_MILESTONE,
      notificationDetails: '모임 참여자가 50명을 돌파했습니다!',
      place: '서울',
      isRead: false,
      priority: 1,
      category: 'milestone',
      relatedId: 7,
      relatedType: 'meeting',
      actionUrl: '/feed'
    },
    {
      userId: users[2].id,
      notificationType: NOTIFICATION_TYPES.POST_LIKES_MILESTONE,
      notificationDetails: '게시물 좋아요가 100개를 돌파했습니다!',
      place: '서울',
      isRead: false,
      priority: 1,
      category: 'milestone',
      relatedId: 8,
      relatedType: 'post',
      actionUrl: '/post/8'
    },
    {
      userId: users[0].id,
      notificationType: NOTIFICATION_TYPES.FOLLOWERS_MILESTONE,
      notificationDetails: '팔로워가 500명을 돌파했습니다!',
      place: '서울',
      isRead: false,
      priority: 1,
      category: 'milestone',
      relatedId: null,
      relatedType: null,
      actionUrl: '/profile'
    },
    {
      userId: users[1].id,
      notificationType: NOTIFICATION_TYPES.MEETINGS_CREATED_MILESTONE,
      notificationDetails: '개설한 모임이 10개를 돌파했습니다!',
      place: '서울',
      isRead: true,
      priority: 1,
      category: 'milestone',
      relatedId: null,
      relatedType: null,
      actionUrl: '/profile'
    },
    {
      userId: users[2].id,
      notificationType: NOTIFICATION_TYPES.CONSECUTIVE_PARTICIPATION,
      notificationDetails: '연속 5번째 모임 참여 중입니다!',
      place: '서울',
      isRead: false,
      priority: 1,
      category: 'milestone',
      relatedId: null,
      relatedType: null,
      actionUrl: '/profile'
    }
  ];

  try {
    // Clear existing notifications
    await prisma.userNotification.deleteMany({});
    console.log('Cleared existing notifications');

    // Create new notifications
    for (const notification of notifications) {
      await prisma.userNotification.create({
        data: notification
      });
    }

    console.log(`✅ Created ${notifications.length} notifications`);
    
    // Show summary by category
    const categories = notifications.reduce((acc, notif) => {
      acc[notif.category] = (acc[notif.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📊 Notification categories:');
    Object.entries(categories).forEach(([category, count]) => {
      console.log(`   - ${category}: ${count} notifications`);
    });

  } catch (error) {
    console.error('Error seeding notifications:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedNotifications()
    .then(() => {
      console.log('Notification seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Notification seeding failed:', error);
      process.exit(1);
    });
}
