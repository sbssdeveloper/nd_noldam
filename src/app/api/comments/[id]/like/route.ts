import { NextResponse, NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
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

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments') as any;
    const userId = parseInt(payload.uid || payload.userId);
    
    if (!userId) {
      return NextResponse.json({ success: false, reason: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;
    const commentId = parseInt(id);

    if (isNaN(commentId)) {
      return NextResponse.json({ success: false, reason: 'Invalid comment ID' }, { status: 400 });
    }

    // Check if comment exists
    const comment = await prisma.postComment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true, postId: true }
    });

    if (!comment) {
      return NextResponse.json({ success: false, reason: 'Comment not found' }, { status: 404 });
    }

    // Check if user already liked this comment
    const existingLike = await prisma.commentLikes.findUnique({
      where: {
        commentId_userId: {
          commentId: commentId,
          userId: userId
        }
      }
    });

    if (existingLike) {
      // Unlike the comment
      await prisma.commentLikes.delete({
        where: {
          commentId_userId: {
            commentId: commentId,
            userId: userId
          }
        }
      });

      // Get updated like count
      const likeCount = await prisma.commentLikes.count({
        where: { commentId: commentId }
      });

      return NextResponse.json({
        success: true,
        liked: false,
        likeCount: likeCount,
        message: 'Comment unliked successfully'
      });
    } else {
      // Like the comment
      await prisma.commentLikes.create({
        data: {
          commentId: commentId,
          userId: userId
        }
      });

      if (comment.userId !== userId) {
        try {
          const liker = await prisma.user.findUnique({
            where: { id: userId },
            select: { nickname: true }
          });

          await notificationService.createNotification(
            comment.userId,
            NOTIFICATION_TYPES.COMMENT_LIKED,
            {
              userName: liker?.nickname || 'Someone',
              postId: comment.postId
            },
            {
              relatedId: commentId,
              relatedType: 'comment'
            }
          );
        } catch (notificationError) {
          console.error('Comment like notification error:', notificationError);
        }
      }

      // Get updated like count
      const likeCount = await prisma.commentLikes.count({
        where: { commentId: commentId }
      });

      return NextResponse.json({
        success: true,
        liked: true,
        likeCount: likeCount,
        message: 'Comment liked successfully'
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
    
    if (!token) {
      return NextResponse.json({ success: false, reason: 'No token provided' }, { status: 401 });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments') as any;
    const userId = parseInt(payload.uid || payload.userId);
    
    if (!userId) {
      return NextResponse.json({ success: false, reason: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;
    const commentId = parseInt(id);

    if (isNaN(commentId)) {
      return NextResponse.json({ success: false, reason: 'Invalid comment ID' }, { status: 400 });
    }

    // Get like count and check if current user liked it
    const [likeCount, userLiked] = await Promise.all([
      prisma.commentLikes.count({
        where: { commentId: commentId }
      }),
      prisma.commentLikes.findUnique({
        where: {
          commentId_userId: {
            commentId: commentId,
            userId: userId
          }
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      likeCount: likeCount,
      liked: !!userLiked
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
