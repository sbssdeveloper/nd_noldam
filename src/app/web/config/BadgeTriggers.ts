import { BadgeService } from './BadgeService';
import type { BadgeConfig, NotificationItem } from '@/services/types/frontend';

export class BadgeTriggers {
  /**
   * Trigger badge check when user creates a meeting
   */
  static async onMeetingCreated(userId: number): Promise<void> {
    try {
      await BadgeService.checkAndAwardBadges(userId, 'meeting_created');
    } catch (error) {
      // Error in onMeetingCreated
    }
  }

  /**
   * Trigger badge check when user joins a meeting
   */
  static async onMeetingJoined(userId: number): Promise<void> {
    try {
      await BadgeService.checkAndAwardBadges(userId, 'meeting_joined');
    } catch (error) {
      // Error in onMeetingJoined
    }
  }

  /**
   * Trigger badge check when user creates a post
   */
  static async onPostCreated(userId: number): Promise<void> {
    try {
      await BadgeService.checkAndAwardBadges(userId, 'post_created');
    } catch (error) {
      // Error in onPostCreated
    }
  }

  /**
   * Trigger badge check when user's post gets liked
   */
  static async onPostLiked(userId: number): Promise<void> {
    try {
      await BadgeService.checkAndAwardBadges(userId, 'post_liked');
    } catch (error) {
      // Error in onPostLiked
    }
  }

  /**
   * Trigger badge check when user gains a new follower
   */
  static async onNewFollower(userId: number): Promise<void> {
    try {
      await BadgeService.checkAndAwardBadges(userId, 'new_follower');
    } catch (error) {
      // Error in onNewFollower
    }
  }

  /**
   * Trigger badge check when user loses a follower
   */
  static async onFollowerLost(userId: number): Promise<void> {
    try {
      await BadgeService.checkAndAwardBadges(userId, 'follower_lost');
    } catch (error) {
      // Error in onFollowerLost
    }
  }

  /**
   * Manual badge check for a user
   */
  static async checkUserBadges(userId: number): Promise<void> {
    try {
      await BadgeService.checkAndAwardBadges(userId, 'manual_check');
    } catch (error) {
      // Error in checkUserBadges
    }
  }
}
