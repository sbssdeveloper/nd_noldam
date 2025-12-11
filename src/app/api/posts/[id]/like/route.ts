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
    const userId = parseInt(payload.uid || payload.userId);
    
    
    if (!userId) {
      return NextResponse.json({ success: false, reason: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;
    const postId = parseInt(id);


    if (isNaN(postId)) {
      return NextResponse.json({ success: false, reason: 'Invalid post ID' }, { status: 400 });
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true }
    });


    if (!post) {
      return NextResponse.json({ success: false, reason: 'Post not found' }, { status: 404 });
    }


    // Check if user already liked this post
    const existingLike = await prisma.postLikes.findUnique({
      where: {
        userId_postId: {
          userId: userId,
          postId: postId
        }
      }
    });


    if (existingLike) {
      // Unlike the post
      await prisma.postLikes.delete({
        where: {
          userId_postId: {
            userId: userId,
            postId: postId
          }
        }
      });

      // Get updated like count
      const likeCount = await prisma.postLikes.count({
        where: { postId: postId }
      });


      return NextResponse.json({
        success: true,
        liked: false,
        likeCount: likeCount,
        message: 'Post unliked successfully'
      });
    } else {
      // Like the post
      await prisma.postLikes.create({
        data: {
          postId: postId,
          userId: userId
        }
      });

      if (post.userId !== userId) {
        try {
          const liker = await prisma.user.findUnique({
            where: { id: userId },
            select: { nickname: true }
          });

          await notificationService.createNotification(
            post.userId,
            NOTIFICATION_TYPES.POST_LIKED,
            {
              userName: liker?.nickname || 'Someone',
              postId
            },
            {
              relatedId: postId,
              relatedType: 'post'
            }
          );
        } catch (notificationError) {
          console.error('Post like notification error:', notificationError);
        }
      }

      // Get updated like count
      const likeCount = await prisma.postLikes.count({
        where: { postId: postId }
      });


      return NextResponse.json({
        success: true,
        liked: true,
        likeCount: likeCount,
        message: 'Post liked successfully'
      });
    }

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      reason: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
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

    const encoder = new TextEncoder();
    const jwtSecretKey = encoder.encode(process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments');
    const { payload } = await jwtVerify(token, jwtSecretKey);
    const userId = parseInt(payload.uid || payload.userId);
    
    if (!userId) {
      return NextResponse.json({ success: false, reason: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;
    const postId = parseInt(id);

    if (isNaN(postId)) {
      return NextResponse.json({ success: false, reason: 'Invalid post ID' }, { status: 400 });
    }

    // Get like count and check if current user liked it
    const [likeCount, userLiked] = await Promise.all([
      prisma.postLikes.count({
        where: { postId: postId }
      }),
      prisma.postLikes.findUnique({
        where: {
          userId_postId: {
            userId: userId,
            postId: postId
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
  } finally {
    await prisma.$disconnect();
  }
}
