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

// PATCH /api/notifications/[id] - Mark notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, reason: 'Unauthorized' },
        { status: 401 }
      );
    }

    const notificationId = parseInt(params.id);
    if (isNaN(notificationId)) {
      return NextResponse.json(
        { success: false, reason: 'Invalid notification ID' },
        { status: 400 }
      );
    }

    const notification = await notificationService.markAsRead(notificationId);

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

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, reason: 'Unauthorized' },
        { status: 401 }
      );
    }

    const notificationId = parseInt(params.id);
    if (isNaN(notificationId)) {
      return NextResponse.json(
        { success: false, reason: 'Invalid notification ID' },
        { status: 400 }
      );
    }

    const result = await notificationService.deleteNotification(notificationId, userId);

    return NextResponse.json({
      success: true,
      data: { deleted: result.count > 0 }
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, reason: 'Internal server error' },
      { status: 500 }
    );
  }
}
