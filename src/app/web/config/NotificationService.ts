import type { NotificationItem, BadgeConfig } from '@/services/types/frontend';
import { NOTIFICATION_TYPES, formatNotificationMessage, formatActionUrl, getNotificationConfig } from './notifications';
import { prisma } from '@/utils/prisma';

export class NotificationService {
  private prisma = prisma;

  constructor() {
    // Use shared Prisma instance
  }

  /**
   * Create a single notification
   */
  async createNotification(
    userId: number,
    type: (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES],
    data: Record<string, any> = {},
    options: {
      priority?: number;
      place?: string;
      relatedId?: number;
      relatedType?: string;
    } = {}
  ) {
    const config = getNotificationConfig(type);
    
    // Format message and action URL
    const message = formatNotificationMessage(type, data);
    const actionUrl = formatActionUrl(type, data);

    try {
      return await this.prisma.userNotification.create({
        data: {
          userId,
          notificationType: type,
          notificationDetails: message,
          place: options.place,
          isRead: false,
          priority: options.priority || config.priority,
          category: config.category,
          relatedId: options.relatedId,
          relatedType: options.relatedType,
          actionUrl: actionUrl
        }
      });
    } catch (error) {
      // Error creating notification
      throw error;
    }
  }

  /**
   * Create notifications for multiple users (batch operation)
   */
  async createBatchNotifications(
    userIds: number[],
    type: (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES],
    data: Record<string, any> = {},
    options: {
      place?: string;
      relatedId?: number;
      relatedType?: string;
    } = {}
  ) {
    if (userIds.length === 0) return { count: 0 };

    const config = getNotificationConfig(type);
    const message = formatNotificationMessage(type, data);
    const actionUrl = formatActionUrl(type, data);

    const notifications = userIds.map(userId => ({
      userId,
      notificationType: type,
      notificationDetails: message,
      place: options.place,
      isRead: false,
      priority: config.priority,
      category: config.category,
      relatedId: options.relatedId,
      relatedType: options.relatedType,
      actionUrl: actionUrl
    }));

    try {
      return await this.prisma.userNotification.createMany({
        data: notifications
      });
    } catch (error) {
      // Error creating batch notifications
      throw error;
    }
  }

  /**
   * Get user notifications with pagination and filtering
   */
  async getUserNotifications(
    userId: number,
    options: {
      limit?: number;
      offset?: number;
      category?: string;
      unreadOnly?: boolean;
      priority?: number;
    } = {}
  ) {
    const where: any = { userId };
    
    if (options.category) {
      where.category = options.category;
    }
    
    if (options.unreadOnly) {
      where.isRead = false;
    }

    if (options.priority) {
      where.priority = options.priority;
    }

    try {
      return await this.prisma.userNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 20,
        skip: options.offset || 0
      });
    } catch (error) {
      // Error fetching user notifications
      throw error;
    }
  }

  /**
   * Get recent 5 notifications for summary slider
   */
  async getRecentNotifications(userId: number, limit: number = 10) {
    try {
      return await this.prisma.userNotification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    } catch (error) {
      // Error fetching recent notifications
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number) {
    try {
      return await this.prisma.userNotification.update({
        where: { id: notificationId },
        data: { isRead: true }
      });
    } catch (error) {
      // Error marking notification as read
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: number) {
    try {
      return await this.prisma.userNotification.updateMany({
        where: { userId },
        data: { isRead: true }
      });
    } catch (error) {
      // Error marking all notifications as read
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: number) {
    try {
      return await this.prisma.userNotification.count({
        where: {
          userId,
          isRead: false
        }
      });
    } catch (error) {
      // Error getting unread count
      return 0;
    }
  }

  /**
   * Delete old notifications (cleanup)
   */
  async cleanupOldNotifications(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    try {
      return await this.prisma.userNotification.deleteMany({
        where: {
          createdAt: { lt: cutoffDate }
        }
      });
    } catch (error) {
      // Error cleaning up old notifications
      throw error;
    }
  }

  /**
   * Delete specific notification
   */
  async deleteNotification(notificationId: number, userId: number) {
    try {
      return await this.prisma.userNotification.deleteMany({
        where: {
          id: notificationId,
          userId // Ensure user can only delete their own notifications
        }
      });
    } catch (error) {
      // Error deleting notification
      throw error;
    }
  }

  /**
   * Get notification statistics for a user
   */
  async getNotificationStats(userId: number) {
    try {
      const [total, unread, byCategory] = await Promise.all([
        this.prisma.userNotification.count({ where: { userId } }),
        this.prisma.userNotification.count({ where: { userId, isRead: false } }),
        this.prisma.userNotification.groupBy({
          by: ['category'],
          where: { userId },
          _count: { category: true }
        })
      ]);

      return {
        total,
        unread,
        byCategory: byCategory.reduce((acc, item) => {
          acc[item.category] = item._count.category;
          return acc;
        }, {} as Record<string, number>)
      };
    } catch (error) {
      // Error getting notification stats
      return { total: 0, unread: 0, byCategory: {} };
    }
  }
}
