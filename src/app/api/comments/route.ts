import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/utils/prisma';

function errorResponse(message: string, statusCode: number) {
  return {
    success: false,
    reason: message,
    statusCode
  };
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        errorResponse('No token provided', 401),
        { status: 401 }
      );
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments') as any;
    const userId = parseInt(payload.uid || payload.userId);

    if (!userId) {
      return NextResponse.json(
        errorResponse('Invalid token payload', 401),
        { status: 401 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nickname: true }
    });

    if (!user) {
      return NextResponse.json(
        errorResponse('User not found', 404),
        { status: 404 }
      );
    }

    const body = await request.json();
    const { postId, content, parentCommentId } = body;

    if (!postId || !content) {
      return NextResponse.json(
        errorResponse('Post ID and content are required', 400),
        { status: 400 }
      );
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: parseInt(postId) },
      select: { id: true, userId: true }
    });

    if (!post) {
      return NextResponse.json(
        errorResponse('Post not found', 404),
        { status: 404 }
      );
    }

    // Calculate level based on parent comment
    let level = 0;
    if (parentCommentId) {
      const parentComment = await prisma.postComment.findUnique({
        where: { id: parseInt(parentCommentId) },
        select: { level: true }
      });
      if (parentComment) {
        level = parentComment.level + 1;
      }
    }

    // Create the comment
    const comment = await prisma.postComment.create({
      data: {
        postId: parseInt(postId),
        userId,
        content: content.trim(),
        parentCommentId: parentCommentId ? parseInt(parentCommentId) : null,
        level
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            profileImage: true,
            activeCommunityBadge: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                description: true
              }
            }
          }
        },
        post: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                profileImage: true,
                activeCommunityBadge: {
                  select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                    description: true
                  }
                }
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        comment,
        message: 'Comment added successfully'
      }
    });

  } catch (error) {
    return NextResponse.json(
      errorResponse('Internal server error', 500),
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
