import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/utils/prisma';
import { NotificationService } from '@/app/web/config/NotificationService';
import { NOTIFICATION_TYPES } from '@/app/web/config/notifications';

const notificationService = new NotificationService();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ success: false, reason: 'No token provided' }, { status: 401 });
    }

    const encoder = new TextEncoder();
    const jwtSecretKey = encoder.encode(process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments');
    const { payload } = await jwtVerify(token, jwtSecretKey);
    const userId = parseInt((payload.uid || payload.userId) as string);
    
    if (!userId) {
      return NextResponse.json({ success: false, reason: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;
    const meetingId = parseInt(id);

    if (isNaN(meetingId)) {
      return NextResponse.json({ success: false, reason: 'Invalid meeting ID' }, { status: 400 });
    }

    // Check if meeting exists
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, userId: true }
    });

    if (!meeting) {
      return NextResponse.json({ success: false, reason: 'Meeting not found' }, { status: 404 });
    }

    // Check if user already liked this meeting
    const existingLike = await prisma.meetingLikes.findFirst({
      where: {
        userId: userId,
        meetingId: meetingId
      }
    });

    if (existingLike) {
      // Unlike the meeting
      await prisma.meetingLikes.delete({
        where: {
          id: existingLike.id
        }
      });

      // Get updated like count
      const likeCount = await prisma.meetingLikes.count({
        where: { meetingId: meetingId }
      });

      return NextResponse.json({
        success: true,
        liked: false,
        likeCount: likeCount,
        message: 'Meeting unliked successfully'
      });
    } else {
      // Like the meeting
      await prisma.meetingLikes.create({
        data: {
          meetingId: meetingId,
          userId: userId
        }
      });

      if (meeting.userId !== userId) {
        try {
          const liker = await prisma.user.findUnique({
            where: { id: userId },
            select: { nickname: true }
          });

          await notificationService.createNotification(
            meeting.userId,
            NOTIFICATION_TYPES.MEETING_LIKED,
            {
              userName: liker?.nickname || 'Someone',
              meetingId
            },
            {
              relatedId: meetingId,
              relatedType: 'meeting'
            }
          );
        } catch (notificationError) {
          console.error('Meeting like notification error:', notificationError);
        }
      }

      // Get updated like count
      const likeCount = await prisma.meetingLikes.count({
        where: { meetingId: meetingId }
      });

      return NextResponse.json({
        success: true,
        liked: true,
        likeCount: likeCount,
        message: 'Meeting liked successfully'
      });
    }

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      reason: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
  // Don't disconnect shared Prisma instance!
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    // GET can work without token for public like counts
    let userId: number | null = null;
    
    if (token) {
      try {
        const encoder = new TextEncoder();
        const jwtSecretKey = encoder.encode(process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments');
        const { payload } = await jwtVerify(token, jwtSecretKey);
        userId = parseInt((payload.uid || payload.userId) as string) || null;
      } catch (e) {
        // Invalid token, continue as public
        userId = null;
      }
    }

    const { id } = await params;
    const meetingId = parseInt(id);

    if (isNaN(meetingId)) {
      return NextResponse.json({ success: false, reason: 'Invalid meeting ID' }, { status: 400 });
    }

    // Get like count
    const likeCount = await prisma.meetingLikes.count({
      where: { meetingId: meetingId }
    });

    // Get user's like status if authenticated
    let userLiked = false;
    if (userId) {
      const userLike = await prisma.meetingLikes.findFirst({
        where: {
          userId: userId,
          meetingId: meetingId
        }
      });
      userLiked = !!userLike;
    }

    return NextResponse.json({
      success: true,
      likeCount: likeCount,
      liked: userLiked
    });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      reason: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
  // Don't disconnect shared Prisma instance!
}

