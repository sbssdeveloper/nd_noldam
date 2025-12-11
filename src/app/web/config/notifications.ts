// Complete Notification System Configuration
import type { NotificationItem, BadgeConfig } from '@/services/types/frontend'

export const NOTIFICATION_TYPES = {
  // Meeting notifications
  MEETING_CREATED: 'meeting_created',
  MEETING_JOINED: 'meeting_joined',
  MEETING_LEFT: 'meeting_left',
  MEETING_CANCELLED: 'meeting_cancelled',
  MEETING_REMINDER_24H: 'meeting_reminder_24h',
  MEETING_REMINDER_2H: 'meeting_reminder_2h',
  MEETING_REMINDER_30MIN: 'meeting_reminder_30min',
  MEETING_STARTED: 'meeting_started',
  MEETING_ENDED: 'meeting_ended',
  MEETING_DELETED_BY_HOST: 'meeting_deleted_by_host',
  MEETING_FULL: 'meeting_full',
  MEETING_PARTICIPANT_REMINDER: 'meeting_participant_reminder',
  MEETING_HOST_REMINDER: 'meeting_host_reminder',
  MEETING_COMPLETED: 'meeting_completed',
  
  // Social notifications
  POST_LIKED: 'post_liked',
  POST_COMMENT: 'post_comment',
  POST_SHARED: 'post_shared',
  POST_MENTIONED: 'post_mentioned',
  MEETING_LIKED: 'meeting_liked',
  MEETING_SHARED: 'meeting_shared',
  COMMENT_LIKED: 'comment_liked',
  FOLLOW_STARTED_SELF: 'follow_started_self',
  FOLLOW_RECEIVED: 'follow_received',
  UNFOLLOW_RECEIVED: 'unfollow_received',
  
  // Achievement notifications
  BADGE_EARNED: 'badge_earned',
  LEVEL_UP: 'level_up',
  FIRST_MEETING_CREATED: 'first_meeting_created',
  FIRST_MEETING_JOINED: 'first_meeting_joined',

  
  // Recommendation notifications
  MEETING_RECOMMENDATION: 'meeting_recommendation',
  FRIEND_ACTIVITY: 'friend_activity',
  CATEGORY_MEETING_AVAILABLE: 'category_meeting_available',
  
  // Statistics & Milestone notifications
  MEETING_PARTICIPANTS_MILESTONE: 'meeting_participants_milestone',
  POST_LIKES_MILESTONE: 'post_likes_milestone',
  MEETINGS_CREATED_MILESTONE: 'meetings_created_milestone',
  CONSECUTIVE_PARTICIPATION: 'consecutive_participation',
} as const;

// Complete Notification Configuration with Templates and Settings
export const NOTIFICATION_CONFIG = {
  // ==================== MEETING NOTIFICATIONS ====================
  [NOTIFICATION_TYPES.MEETING_CREATED]: {
    priority: 1,
    category: 'meeting',
    template: '{userName} created a new meeting: {meetingName}',
    icon: '🆕',
    actionUrl: '/meeting/item-detail/{meetingId}',
    requiresRead: true
  },
  [NOTIFICATION_TYPES.MEETING_JOINED]: {
    priority: 1,
    category: 'meeting',
    template: '{userName} joined your meeting',
    icon: '🤝',
    actionUrl: '/meeting/item-detail/{meetingId}',
    requiresRead: true
  },
  [NOTIFICATION_TYPES.MEETING_LEFT]: {
    priority: 2,
    category: 'meeting',
    template: '{userName} canceled the {meetingName} meeting',
    icon: '🔄',
    actionUrl: '/meeting/item-detail/{meetingId}',
    requiresRead: false
  },
  [NOTIFICATION_TYPES.MEETING_CANCELLED]: {
    priority: 1,
    category: 'meeting',
    template: '{meetingName} meeting was cancelled',
    icon: '⛔',
    actionUrl: '/meeting/item-detail/{meetingId}',
    requiresRead: true
  },
  [NOTIFICATION_TYPES.MEETING_REMINDER_24H]: {
    priority: 1,
    category: 'reminder',
    template: '{meetingName} meeting starts in 24 hours',
    icon: '⏰',
    actionUrl: '/meeting/item-detail/{meetingId}',
    requiresRead: false
  },
  [NOTIFICATION_TYPES.MEETING_REMINDER_2H]: {
    priority: 1,
    category: 'reminder',
    template: '{meetingName} meeting starts in 2 hours',
    icon: '⏰',
    actionUrl: '/meeting/item-detail/{meetingId}',
    requiresRead: false
  },
  [NOTIFICATION_TYPES.MEETING_REMINDER_30MIN]: {
    priority: 1,
    category: 'reminder',
    template: '{meetingName} meeting starts in 30 minutes',
    icon: '⏰',
    actionUrl: '/meeting/item-detail/{meetingId}',
    requiresRead: false
  },
  [NOTIFICATION_TYPES.MEETING_STARTED]: {
    priority: 1,
    category: 'meeting',
    template: '{meetingName} meeting just started',
    icon: '🚀',
    actionUrl: '/meeting/item-detail/{meetingId}',
    requiresRead: false
  },
  [NOTIFICATION_TYPES.MEETING_ENDED]: {
    priority: 2,
    category: 'meeting',
    template: '{meetingName} meeting has ended',
    icon: '🏁',
    actionUrl: '/meeting/item-detail/{meetingId}',
    requiresRead: false
  },
  [NOTIFICATION_TYPES.MEETING_DELETED_BY_HOST]: {
    priority: 1,
    category: 'meeting',
    template: '{hostName} (host) deleted {meetingName} meeting',
    icon: '🗑️',
    actionUrl: '/meetings',
    requiresRead: true
  },
  [NOTIFICATION_TYPES.MEETING_FULL]: {
    priority: 1,
    category: 'meeting',
    template: 'Your meeting reached the maximum number of participants',
    icon: '🎉',
    actionUrl: '/meeting/item-detail/{meetingId}',
    requiresRead: true
  },
  [NOTIFICATION_TYPES.MEETING_PARTICIPANT_REMINDER]: {
    priority: 1,
    category: 'reminder',
    template: '{days} days left until the {meetingName} meeting starts',
    icon: '📆',
    actionUrl: '/meeting/item-detail/{meetingId}',
    requiresRead: false
  },
  [NOTIFICATION_TYPES.MEETING_HOST_REMINDER]: {
    priority: 1,
    category: 'reminder',
    template: '{days} days until the meeting you\'re hosting starts',
    icon: '🗓️',
    actionUrl: '/meeting/item-detail/{meetingId}',
    requiresRead: false
  },
  [NOTIFICATION_TYPES.MEETING_COMPLETED]: {
    priority: 2,
    category: 'meeting',
    template: '{meetingName} completed',
    icon: '✅',
    actionUrl: '/meeting/item-detail/{meetingId}',
    requiresRead: false
  },

  // ==================== SOCIAL NOTIFICATIONS ====================
  [NOTIFICATION_TYPES.POST_LIKED]: {
    priority: 3,
    category: 'social',
    template: '{userName} liked your post',
    icon: '❤️',
    actionUrl: '/post/{postId}',
    requiresRead: false
  },
  [NOTIFICATION_TYPES.POST_COMMENT]: {
    priority: 2,
    category: 'social',
    template: '{userName} commented on your post',
    icon: '💬',
    actionUrl: '/post/{postId}',
    requiresRead: true
  },
  [NOTIFICATION_TYPES.POST_SHARED]: {
    priority: 2,
    category: 'social',
    template: '{userName} shared your post',
    icon: '📤',
    actionUrl: '/post/{postId}',
    requiresRead: false
  },
  [NOTIFICATION_TYPES.POST_MENTIONED]: {
    priority: 1,
    category: 'social',
    template: 'You were mentioned in a post by {userName}',
    icon: '📝',
    actionUrl: '/post/{postId}',
    requiresRead: true
  },
  [NOTIFICATION_TYPES.MEETING_LIKED]: {
    priority: 3,
    category: 'social',
    template: '{userName} liked your meeting',
    icon: '🌟',
    actionUrl: '/meeting/item-detail/{meetingId}',
    requiresRead: false
  },
  [NOTIFICATION_TYPES.MEETING_SHARED]: {
    priority: 2,
    category: 'social',
    template: '{userName} shared your meeting',
    icon: '📤',
    actionUrl: '/meeting/item-detail/{meetingId}',
    requiresRead: false
  },
  [NOTIFICATION_TYPES.COMMENT_LIKED]: {
    priority: 3,
    category: 'social',
    template: '{userName} liked your comment',
    icon: '👍',
    actionUrl: '/post/{postId}',
    requiresRead: false
  },
  [NOTIFICATION_TYPES.FOLLOW_STARTED_SELF]: {
    priority: 3,
    category: 'social',
    template: 'You started following {userName}',
    icon: '➡️',
    actionUrl: '/profile?userId={targetUserId}',
    requiresRead: false
  },
  [NOTIFICATION_TYPES.FOLLOW_RECEIVED]: {
    priority: 2,
    category: 'social',
    template: '{userName} started following you',
    icon: '🤝',
    actionUrl: '/profile?userId={followerId}',
    requiresRead: true
  },
  [NOTIFICATION_TYPES.UNFOLLOW_RECEIVED]: {
    priority: 2,
    category: 'social',
    template: '{userName} unfollowed you',
    icon: '👋',
    actionUrl: '/profile?userId={followerId}',
    requiresRead: false
  },

  // ==================== ACHIEVEMENT NOTIFICATIONS ====================
  [NOTIFICATION_TYPES.BADGE_EARNED]: {
    priority: 1,
    category: 'achievement',
    template: '새로운 배지를 획득했습니다: {badgeName}',
    icon: '🏆',
    actionUrl: '/profile',
    requiresRead: true
  },
  [NOTIFICATION_TYPES.LEVEL_UP]: {
    priority: 1,
    category: 'achievement',
    template: '커뮤니티 등급이 상승했습니다: {newLevel}',
    icon: '⬆️',
    actionUrl: '/profile',
    requiresRead: true
  },
  [NOTIFICATION_TYPES.FIRST_MEETING_CREATED]: {
    priority: 1,
    category: 'achievement',
    template: '첫 모임을 개설했습니다!',
    icon: '🎉',
    actionUrl: '/feed',
    requiresRead: true
  },
  [NOTIFICATION_TYPES.FIRST_MEETING_JOINED]: {
    priority: 1,
    category: 'achievement',
    template: '첫 모임에 참여했습니다!',
    icon: '🎉',
    actionUrl: '/feed',
    requiresRead: true
  },

  // ==================== RECOMMENDATION NOTIFICATIONS ====================
  [NOTIFICATION_TYPES.MEETING_RECOMMENDATION]: {
    priority: 2,
    category: 'recommendation',
    template: '당신에게 맞는 모임을 추천합니다: {meetingName}',
    icon: '💡',
    actionUrl: '/meeting/item-detail/{meetingId}',
    requiresRead: false
  },
  [NOTIFICATION_TYPES.FRIEND_ACTIVITY]: {
    priority: 3,
    category: 'recommendation',
    template: '친구들이 활발하게 활동하고 있습니다',
    icon: '👥',
    actionUrl: '/profile',
    requiresRead: false
  },
  [NOTIFICATION_TYPES.CATEGORY_MEETING_AVAILABLE]: {
    priority: 2,
    category: 'recommendation',
    template: '관심 카테고리의 새로운 모임이 있습니다: {meetingName}',
    icon: '🎯',
    actionUrl: '/meeting/item-detail/{meetingId}',
    requiresRead: false
  },

  // ==================== STATISTICS & MILESTONE NOTIFICATIONS ====================
  [NOTIFICATION_TYPES.MEETING_PARTICIPANTS_MILESTONE]: {
    priority: 1,
    category: 'milestone',
    template: '모임 참여자가 {count}명을 돌파했습니다!',
    icon: '🎊',
    actionUrl: '/meeting/item-detail/{meetingId}',
    requiresRead: true
  },
  [NOTIFICATION_TYPES.POST_LIKES_MILESTONE]: {
    priority: 1,
    category: 'milestone',
    template: '게시물 좋아요가 {count}개를 돌파했습니다!',
    icon: '🎊',
    actionUrl: '/post/{postId}',
    requiresRead: true
  },
  [NOTIFICATION_TYPES.MEETINGS_CREATED_MILESTONE]: {
    priority: 1,
    category: 'milestone',
    template: '개설한 모임이 {count}개를 돌파했습니다!',
    icon: '🎊',
    actionUrl: '/profile',
    requiresRead: true
  },
  [NOTIFICATION_TYPES.CONSECUTIVE_PARTICIPATION]: {
    priority: 1,
    category: 'milestone',
    template: '연속 {count}번째 모임 참여 중입니다!',
    icon: '🔥',
    actionUrl: '/profile',
    requiresRead: true
  },
} as const;

// Helper function to get notification config
export function getNotificationConfig(type: string) {
  return NOTIFICATION_CONFIG[type as keyof typeof NOTIFICATION_CONFIG] || {
    priority: 3,
    category: 'general',
    template: type,
    icon: '🔔',
    actionUrl: '/',
    requiresRead: false
  };
}

// Helper function to format notification message
export function formatNotificationMessage(type: string, data: Record<string, any>): string {
  const config = getNotificationConfig(type);
  let message = config.template as string;
  
  Object.entries(data).forEach(([key, value]) => {
    message = message.replace(`{${key}}`, String(value || ''));
  });
  
  return message;
}

// Helper function to format action URL
export function formatActionUrl(type: string, data: Record<string, any>): string {
  const config = getNotificationConfig(type);
  let url = config.actionUrl as string;
  
  Object.entries(data).forEach(([key, value]) => {
    url = url.replace(`{${key}}`, String(value || ''));
  });
  
  return url;
}
