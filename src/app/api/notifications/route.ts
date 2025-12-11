import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { NotificationService } from '@/app/web/config/NotificationService';

const notificationService = new NotificationService();

// Helper function to get user ID from token
function getUserIdFromToken(request: NextRequest): number | null {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return null;
    
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments') as any;
    return parseInt(payload.uid || payload.userId);
  } catch (error) {
    return null;
  }
}

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, reason: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const category = searchParams.get('category') || undefined;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const priority = searchParams.get('priority') ? parseInt(searchParams.get('priority')!) : undefined;

    const notifications = await notificationService.getUserNotifications(userId, {
      limit,
      offset,
      category,
      unreadOnly,
      priority
    });

    const unreadCount = await notificationService.getUnreadCount(userId);

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          limit,
          offset,
          hasMore: notifications.length === limit
        }
      }
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, reason: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create notification (admin only)
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, reason: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, data, options } = body;

    if (!type) {
      return NextResponse.json(
        { success: false, reason: 'Notification type is required' },
        { status: 400 }
      );
    }

    const notification = await notificationService.createNotification(
      userId,
      type,
      data || {},
      options || {}
    );

    return NextResponse.json({
      success: true,
      data: notification
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, reason: 'Internal server error' },
      { status: 500 }
    );
  }
}
