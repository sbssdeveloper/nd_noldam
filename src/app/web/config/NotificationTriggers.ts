import type { NotificationItem, BadgeConfig } from '@/services/types/frontend';
import { NotificationService } from './NotificationService';
import { NOTIFICATION_TYPES } from './notifications';
import { prisma } from '@/utils/prisma';

export class NotificationTriggers {
  private prisma = prisma;
  private notificationService: NotificationService;

  constructor() {
    // Use shared Prisma instance
    this.notificationService = new NotificationService();
  }

  // ==================== MEETING EVENTS ====================

  /**
   * Triggered when a meeting is created
   */
  async onMeetingCreated(meetingId: number, creatorId: number, meetingName: string) {
    try {
      // Get meeting details
      const meeting = await this.prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { user: true }
      });

      if (!meeting) return;

      // Notify followers of the creator
      const followers = await this.getUserFollowers(creatorId);
      const followerIds = followers.map(f => f.userId);
      
      if (followerIds.length > 0) {
        await this.notificationService.createBatchNotifications(
          followerIds,
          NOTIFICATION_TYPES.MEETING_CREATED,
          { 
            userName: meeting.user.nickname || '익명',
            meetingName,
            meetingId 
          },
          { 
            relatedId: meetingId,
            relatedType: 'meeting'
          }
        );
      }
    } catch (error) {
      // Error in onMeetingCreated
    }
  }

  /**
   * Triggered when someone joins a meeting
   */
  async onMeetingJoined(meetingId: number, userId: number, meetingName: string) {
    try {
      // Get meeting details
      const meeting = await this.prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { user: true }
      });

      if (!meeting || meeting.userId === userId) return; // Don't notify creator

      // Get user details
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) return;

      // Notify meeting creator
      await this.notificationService.createNotification(
        meeting.userId,
        NOTIFICATION_TYPES.MEETING_JOINED,
        { 
          userName: user.nickname || '익명',
          meetingName,
          meetingId 
        },
        { 
          relatedId: meetingId,
          relatedType: 'meeting'
        }
      );
    } catch (error) {
      // Error in onMeetingJoined
    }
  }

  /**
   * Triggered when someone leaves a meeting
   */
  async onMeetingLeft(meetingId: number, userId: number, meetingName: string) {
    try {
      const meeting = await this.prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { user: true }
      });

      if (!meeting || meeting.userId === userId) return;

      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) return;

      await this.notificationService.createNotification(
        meeting.userId,
        NOTIFICATION_TYPES.MEETING_LEFT,
        { 
          userName: user.nickname || '익명',
          meetingName,
          meetingId 
        },
        { 
          relatedId: meetingId,
          relatedType: 'meeting'
        }
      );
    } catch (error) {
      // Error in onMeetingLeft
    }
  }

  /**
   * Triggered when a meeting is cancelled
   */
  async onMeetingCancelled(meetingId: number, meetingName: string) {
    try {
      // Get all participants
      const participants = await this.prisma.meetingParticipant.findMany({
        where: { meetingId },
        include: { user: true }
      });

      const participantIds = participants.map(p => p.userId);

      if (participantIds.length > 0) {
        await this.notificationService.createBatchNotifications(
          participantIds,
          NOTIFICATION_TYPES.MEETING_CANCELLED,
          { meetingName, meetingId },
          { 
            relatedId: meetingId,
            relatedType: 'meeting'
          }
        );
      }
    } catch (error) {
      // Error in onMeetingCancelled
    }
  }

  /**
   * Triggered when meeting starts
   */
  async onMeetingStarted(meetingId: number, meetingName: string) {
    try {
      // Get all participants
      const participants = await this.prisma.meetingParticipant.findMany({
        where: { meetingId },
        include: { user: true }
      });

      const participantIds = participants.map(p => p.userId);

      if (participantIds.length > 0) {
        await this.notificationService.createBatchNotifications(
          participantIds,
          NOTIFICATION_TYPES.MEETING_STARTED,
          { meetingName, meetingId },
          { 
            relatedId: meetingId,
            relatedType: 'meeting'
          }
        );
      }
    } catch (error) {
      // Error in onMeetingStarted
    }
  }

  /**
   * Triggered when meeting ends
   */
  async onMeetingEnded(meetingId: number, meetingName: string) {
    try {
      // Get all participants
      const participants = await this.prisma.meetingParticipant.findMany({
        where: { meetingId },
        include: { user: true }
      });

      const participantIds = participants.map(p => p.userId);

      if (participantIds.length > 0) {
        await this.notificationService.createBatchNotifications(
          participantIds,
          NOTIFICATION_TYPES.MEETING_ENDED,
          { meetingName, meetingId },
          { 
            relatedId: meetingId,
            relatedType: 'meeting'
          }
        );
      }
    } catch (error) {
      // Error in onMeetingEnded
    }
  }

  // ==================== SOCIAL EVENTS ====================



  /**
   * Triggered when a post is liked
   */
  async onPostLiked(postId: number, likerId: number, postOwnerId: number) {
    try {
      if (likerId === postOwnerId) return; // Don't notify self

      const liker = await this.prisma.user.findUnique({
        where: { id: likerId }
      });

      if (!liker) return;

      await this.notificationService.createNotification(
        postOwnerId,
        NOTIFICATION_TYPES.POST_LIKED,
        { 
          userName: liker.nickname || '익명',
          postId 
        },
        { 
          relatedId: postId,
          relatedType: 'post'
        }
      );
    } catch (error) {
      // Error in onPostLiked
    }
  }

  /**
   * Triggered when a post is commented on
   */
  async onPostComment(postId: number, commenterId: number, postOwnerId: number) {
    try {
      if (commenterId === postOwnerId) return;

      const commenter = await this.prisma.user.findUnique({
        where: { id: commenterId }
      });

      if (!commenter) return;

      await this.notificationService.createNotification(
        postOwnerId,
        NOTIFICATION_TYPES.POST_COMMENT,
        { 
          userName: commenter.nickname || '익명',
          postId 
        },
        { 
          relatedId: postId,
          relatedType: 'post'
        }
      );
    } catch (error) {
      // Error in onPostComment
    }
  }

  /**
   * Triggered when a post is shared
   */
  async onPostShared(postId: number, sharerId: number, postOwnerId: number) {
    try {
      if (sharerId === postOwnerId) return;

      const sharer = await this.prisma.user.findUnique({
        where: { id: sharerId }
      });

      if (!sharer) return;

      await this.notificationService.createNotification(
        postOwnerId,
        NOTIFICATION_TYPES.POST_SHARED,
        { 
          userName: sharer.nickname || '익명',
          postId 
        },
        { 
          relatedId: postId,
          relatedType: 'post'
        }
      );
    } catch (error) {
      // Error in onPostShared
    }
  }

  /**
   * Triggered when a post is mentioned
   */
  async onPostMentioned(postId: number, mentionedUserId: number, postOwnerId: number) {
    try {
      if (mentionedUserId === postOwnerId) return;

      const mentionedUser = await this.prisma.user.findUnique({
        where: { id: mentionedUserId }
      });

      if (!mentionedUser) return;

      await this.notificationService.createNotification(
        mentionedUserId,
        NOTIFICATION_TYPES.POST_MENTIONED,
        { 
          userName: mentionedUser.nickname || '익명',
          postId 
        },
        { 
          relatedId: postId,
          relatedType: 'post'
        }
      );
    } catch (error) {
      // Error in onPostMentioned
    }
  }

  /**
   * Triggered when a meeting is liked
   */
  async onMeetingLiked(meetingId: number, likerId: number, meetingOwnerId: number) {
    try {
      if (likerId === meetingOwnerId) return;

      const liker = await this.prisma.user.findUnique({
        where: { id: likerId }
      });

      if (!liker) return;

      await this.notificationService.createNotification(
        meetingOwnerId,
        NOTIFICATION_TYPES.MEETING_LIKED,
        { 
          userName: liker.nickname || '익명',
          meetingId 
        },
        { 
          relatedId: meetingId,
          relatedType: 'meeting'
        }
      );
    } catch (error) {
      // Error in onMeetingLiked
    }
  }

  /**
   * Triggered when a meeting is shared
   */
  async onMeetingShared(meetingId: number, sharerId: number, meetingOwnerId: number) {
    try {
      if (sharerId === meetingOwnerId) return;

      const sharer = await this.prisma.user.findUnique({
        where: { id: sharerId }
      });

      if (!sharer) return;

      await this.notificationService.createNotification(
        meetingOwnerId,
        NOTIFICATION_TYPES.MEETING_SHARED,
        { 
          userName: sharer.nickname || '익명',
          meetingId 
        },
        { 
          relatedId: meetingId,
          relatedType: 'meeting'
        }
      );
    } catch (error) {
      // Error in onMeetingShared
    }
  }

  // ==================== ACHIEVEMENT EVENTS ====================

  /**
   * Triggered when a user earns a badge
   */
  async onBadgeEarned(userId: number, badgeId: number, badgeName: string) {
    try {
      await this.notificationService.createNotification(
        userId,
        NOTIFICATION_TYPES.BADGE_EARNED,
        { badgeName, badgeId },
        { 
          relatedId: badgeId,
          relatedType: 'badge'
        }
      );
    } catch (error) {
      // Error in onBadgeEarned
    }
  }

  /**
   * Triggered when user level up
   */
  async onLevelUp(userId: number, newLevel: string) {
    try {
      await this.notificationService.createNotification(
        userId,
        NOTIFICATION_TYPES.LEVEL_UP,
        { newLevel }
      );
    } catch (error) {
      // Error in onLevelUp
    }
  }

  /**
   * Triggered when user creates first meeting
   */
  async onFirstMeetingCreated(userId: number) {
    try {
      await this.notificationService.createNotification(
        userId,
        NOTIFICATION_TYPES.FIRST_MEETING_CREATED,
        {}
      );
    } catch (error) {
      // Error in onFirstMeetingCreated
    }
  }

  /**
   * Triggered when user joins first meeting
   */
  async onFirstMeetingJoined(userId: number) {
    try {
      await this.notificationService.createNotification(
        userId,
        NOTIFICATION_TYPES.FIRST_MEETING_JOINED,
        {}
      );
    } catch (error) {
      // Error in onFirstMeetingJoined
    }
  }

  // ==================== RECOMMENDATION EVENTS ====================

  /**
   * Triggered for meeting recommendations
   */
  async onMeetingRecommendation(userId: number, meetingId: number, meetingName: string) {
    try {
      await this.notificationService.createNotification(
        userId,
        NOTIFICATION_TYPES.MEETING_RECOMMENDATION,
        { meetingName, meetingId },
        { 
          relatedId: meetingId,
          relatedType: 'meeting'
        }
      );
    } catch (error) {
      // Error in onMeetingRecommendation
    }
  }

  /**
   * Triggered for friend activity
   */
  async onFriendActivity(userId: number) {
    try {
      await this.notificationService.createNotification(
        userId,
        NOTIFICATION_TYPES.FRIEND_ACTIVITY,
        {}
      );
    } catch (error) {
      // Error in onFriendActivity
    }
  }

  /**
   * Triggered for category meeting availability
   */
  async onCategoryMeetingAvailable(userId: number, meetingId: number, meetingName: string) {
    try {
      await this.notificationService.createNotification(
        userId,
        NOTIFICATION_TYPES.CATEGORY_MEETING_AVAILABLE,
        { meetingName, meetingId },
        { 
          relatedId: meetingId,
          relatedType: 'meeting'
        }
      );
    } catch (error) {
      // Error in onCategoryMeetingAvailable
    }
  }

  // ==================== MILESTONE EVENTS ====================

  /**
   * Triggered for meeting participants milestone
   */
  async onMeetingParticipantsMilestone(meetingId: number, count: number) {
    try {
      const meeting = await this.prisma.meeting.findUnique({
        where: { id: meetingId }
      });

      if (!meeting) return;

      await this.notificationService.createNotification(
        meeting.userId,
        NOTIFICATION_TYPES.MEETING_PARTICIPANTS_MILESTONE,
        { count, meetingId },
        { 
          relatedId: meetingId,
          relatedType: 'meeting'
        }
      );
    } catch (error) {
      // Error in onMeetingParticipantsMilestone
    }
  }

  /**
   * Triggered for post likes milestone
   */
  async onPostLikesMilestone(postId: number, count: number, postOwnerId: number) {
    try {
      await this.notificationService.createNotification(
        postOwnerId,
        NOTIFICATION_TYPES.POST_LIKES_MILESTONE,
        { count, postId },
        { 
          relatedId: postId,
          relatedType: 'post'
        }
      );
    } catch (error) {
      // Error in onPostLikesMilestone
    }
  }


  /**
   * Triggered for meetings created milestone
   */
  async onMeetingsCreatedMilestone(userId: number, count: number) {
    try {
      await this.notificationService.createNotification(
        userId,
        NOTIFICATION_TYPES.MEETINGS_CREATED_MILESTONE,
        { count }
      );
    } catch (error) {
      // Error in onMeetingsCreatedMilestone
    }
  }

  /**
   * Triggered for consecutive participation
   */
  async onConsecutiveParticipation(userId: number, count: number) {
    try {
      await this.notificationService.createNotification(
        userId,
        NOTIFICATION_TYPES.CONSECUTIVE_PARTICIPATION,
        { count }
      );
    } catch (error) {
      // Error in onConsecutiveParticipation
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get user's followers
   */
  private async getUserFollowers(userId: number) {
    try {
      return await this.prisma.follower.findMany({
        where: { userId },
        select: { userId: true }
      });
    } catch (error) {
      // Error getting user followers
      return [];
    }
  }

  /**
   * Cleanup method
   */
  async cleanup() {
    await this.prisma.$disconnect();
  }
}
