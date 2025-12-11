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

// POST /api/notifications/mark-all-read - Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, reason: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await notificationService.markAllAsRead(userId);

    return NextResponse.json({
      success: true,
      data: { updated: result.count }
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, reason: 'Internal server error' },
      { status: 500 }
    );
  }
}
