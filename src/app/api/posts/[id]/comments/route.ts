import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/utils/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ success: false, reason: 'No token provided', statusCode: 401 }, { status: 401 });
    }

    const encoder = new TextEncoder();
    const jwtSecretKey = encoder.encode(process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments');
    const { payload } = await jwtVerify(token, jwtSecretKey);
    const userId = parseInt((payload.uid || payload.userId) as string);
    
    if (!userId) {
      return NextResponse.json({ success: false, reason: 'Invalid token', statusCode: 401 }, { status: 401 });
    }
    const resolvedParams = await params;
    const postId = parseInt(resolvedParams.id);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    if (isNaN(postId)) {
      return NextResponse.json({ success: false, reason: 'Invalid post ID', statusCode: 400 }, { status: 400 });
    }

    const skip = (page - 1) * limit;

    // Fetch top-level comments with pagination
    const topLevelComments = await prisma.postComment.findMany({
      where: {
        postId: postId,
        parentCommentId: null
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            profileImage: true
          }
        },
        likes: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                profileImage: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      skip: skip,
      take: limit
    });

    // For each top-level comment, fetch its nested replies
    const commentsWithReplies = await Promise.all(
      topLevelComments.map(async (comment) => {
        const replies = await getNestedReplies(comment.id);
        return {
          ...comment,
          replies
        };
      })
    );

    // Check if there are more comments
    const totalComments = await prisma.postComment.count({
      where: {
        postId: postId,
        parentCommentId: null
      }
    });

    const hasMoreComments = skip + limit < totalComments;

    return NextResponse.json({
      success: true,
      data: {
        comments: commentsWithReplies,
        hasMoreComments,
        currentPage: page,
        totalComments
      },
      statusCode: 200
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ success: false, reason: 'Internal server error', statusCode: 500 }, { status: 500 });
  }
}

// Helper function to recursively fetch nested replies
async function getNestedReplies(parentCommentId: number): Promise<any[]> {
  const directReplies = await prisma.postComment.findMany({
    where: { parentCommentId },
    include: {
      user: {
        select: {
          id: true,
          nickname: true,
          profileImage: true
        }
      },
      likes: {
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              profileImage: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  // For each direct reply, fetch its nested replies
  const repliesWithNestedReplies = await Promise.all(
    directReplies.map(async (reply) => {
      const nestedReplies = await getNestedReplies(reply.id);
      return {
        ...reply,
        replies: nestedReplies
      };
    })
  );

  return repliesWithNestedReplies;
}
