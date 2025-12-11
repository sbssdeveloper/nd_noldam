import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/utils/prisma';
import { isAdminTokenValid } from '@/apiConfigs/admin';

// Helper function to recursively fetch nested replies
async function getNestedReplies(parentCommentId: number): Promise<any[]> {
  const now = new Date();
  const directReplies = await prisma.postComment.findMany({
    where: { 
      parentCommentId,
      OR: [
        { restrictionUntil: null },
        { restrictionUntil: { lte: now } }
      ]
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
              condition_followers: true
            }
          }
        }
      },
      likes: {
        select: {
          userId: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    let userId: number | null = null;
    
    // Try to get user ID from token if available, but don't require authentication
    if (token) {
      try {
        const encoder = new TextEncoder();
        const jwtSecretKey = encoder.encode(process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments');
        const { payload } = await jwtVerify(token, jwtSecretKey);
        userId = parseInt((payload.uid || payload.userId) as string);
      } catch (error) {
        // Token is invalid, but we'll continue without authentication
      }
    }
    
    const resolvedParams = await params;
    const postId = parseInt(resolvedParams.id);

    if (isNaN(postId)) {
      return NextResponse.json({ success: false, reason: 'Invalid post ID', statusCode: 400 }, { status: 400 });
    }

    // Fetch the post with user information
    // Filter out restricted posts (only show if restrictionUntil is null or has passed)
    const now = new Date();
    let post;
    try {
      post = await prisma.post.findFirst({
        where: { 
          id: postId,
          OR: [
            { restrictionUntil: null },
            { restrictionUntil: { lte: now } }
          ]
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
                  condition_followers: true
                }
              }
            }
          }
        }
      });
    } catch (dbError) {
      throw dbError;
    }

    if (!post) {
      return NextResponse.json({ success: false, reason: 'Post not found', statusCode: 404 }, { status: 404 });
    }

    // Fetch likes separately
    const likes = await prisma.postLikes.findMany({
      where: { postId: postId },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            profileImage: true
          }
        }
      }
    });

    // Fetch top-level comments (level 0) with pagination
    // Filter out restricted comments
    const commentsPerPage = 10;
    const topLevelComments = await prisma.postComment.findMany({
      where: {
        postId: postId,
        parentCommentId: null,
        OR: [
          { restrictionUntil: null },
          { restrictionUntil: { lte: now } }
        ]
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
                condition_followers: true
              }
            }
          }
        },
        likes: {
          select: {
            userId: true
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: commentsPerPage
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

    // Check if there are more comments (only count non-restricted comments)
    const totalComments = await prisma.postComment.count({
      where: {
        postId: postId,
        parentCommentId: null,
        OR: [
          { restrictionUntil: null },
          { restrictionUntil: { lte: now } }
        ]
      }
    });

    const hasMoreComments = totalComments > commentsPerPage;

    // Compute isLiked/likeCount for post
    const postIsLiked = userId ? likes.some(like => like.userId === userId) : false
    const postLikeCount = likes.length

    // Helper to attach isLiked/likeCount to each comment (recursively)
    const attachLikeMetaToComments = (items: any[]): any[] => {
      return items.map(item => {
        const likeCount = Array.isArray(item.likes) ? item.likes.length : 0
        const isLiked = userId && Array.isArray(item.likes) ? item.likes.some((l: any) => l.userId === userId) : false
        const replies = Array.isArray(item.replies) ? attachLikeMetaToComments(item.replies) : []
        return {
          ...item,
          isLiked,
          likeCount,
          replies
        }
      })
    }

    const commentsWithLikeMeta = attachLikeMetaToComments(commentsWithReplies)

    return NextResponse.json({
      success: true,
      data: {
        post: {
          ...post,
          likes: likes,
          isLiked: postIsLiked,
          likeCount: postLikeCount
        },
        comments: commentsWithLikeMeta,
        hasMoreComments,
        totalComments
      },
      statusCode: 200
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ success: false, reason: 'Internal server error', statusCode: 500 }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check for admin authentication via cookie
    let isAdmin = false;
    try {
      const adminToken = request.cookies.get('admin_auth_token')?.value;
      if (adminToken) {
        isAdmin = isAdminTokenValid(adminToken);
      }
    } catch (adminAuthError) {
      console.error('Admin auth check error:', adminAuthError);
      isAdmin = false;
    }

    if (!isAdmin) {
      return NextResponse.json({ success: false, reason: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const resolvedParams = await params;
    const postId = parseInt(resolvedParams.id);

    if (isNaN(postId)) {
      return NextResponse.json({ success: false, reason: 'Invalid post ID', statusCode: 400 }, { status: 400 });
    }

    const body = await request.json();
    const { restrictionDays } = body;

    // If restrictionDays is 0 or null, remove the restriction
    if (restrictionDays === 0 || restrictionDays === null) {
      await prisma.$executeRaw`
        UPDATE posts 
        SET restriction_until = NULL
        WHERE id = ${postId}
      `;

      return NextResponse.json({
        success: true,
        message: 'Post restriction removed',
        data: {
          postId,
          restrictionUntil: null
        },
        statusCode: 200
      }, { status: 200 });
    }

    if (!restrictionDays || restrictionDays <= 0) {
      return NextResponse.json({ success: false, reason: 'Restriction days must be a positive number', statusCode: 400 }, { status: 400 });
    }

    // Calculate restrictionUntil date
    const restrictionUntil = new Date();
    restrictionUntil.setDate(restrictionUntil.getDate() + restrictionDays);

    // Check if restrictionUntil column exists, if not add it
    try {
      await prisma.$executeRaw`ALTER TABLE posts ADD COLUMN IF NOT EXISTS restriction_until TIMESTAMP`;
    } catch (error: any) {
      // Column might already exist or error occurred, continue
    }

    // Update post with restriction date using raw SQL to bypass Prisma type checking
    await prisma.$executeRaw`
      UPDATE posts 
      SET restriction_until = ${restrictionUntil}::timestamp
      WHERE id = ${postId}
    `;

    // Verify the update
    const updatedPost = await prisma.$queryRaw<Array<{ id: number; restriction_until: Date | null }>>`
      SELECT id, restriction_until 
      FROM posts 
      WHERE id = ${postId}
    `;

    if (!updatedPost || updatedPost.length === 0) {
      return NextResponse.json({ success: false, reason: 'Post not found', statusCode: 404 }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Post restricted for ${restrictionDays} days`,
      data: {
        postId,
        restrictionUntil: restrictionUntil.toISOString()
      },
      statusCode: 200
    }, { status: 200 });

  } catch (error: any) {
    console.error('PUT /api/posts/[id] error:', error);
    return NextResponse.json({ 
      success: false, 
      reason: 'Internal server error',
      error: error.message,
      statusCode: 500 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check for admin authentication via cookie first
    let isAdmin = false;
    try {
      const adminToken = request.cookies.get('admin_auth_token')?.value;
      if (adminToken) {
        isAdmin = isAdminTokenValid(adminToken);
      }
    } catch (adminAuthError) {
      console.error('Admin auth check error:', adminAuthError);
      isAdmin = false;
    }

    let userId: number | null = null;

    if (!isAdmin) {
      // Regular user authentication via JWT
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return NextResponse.json({ success: false, reason: 'No token provided' }, { status: 401 });
      }

      try {
        const encoder = new TextEncoder();
        const jwtSecretKey = encoder.encode(process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments');
        const { payload } = await jwtVerify(token, jwtSecretKey);
        userId = parseInt((payload.uid || payload.userId) as string);
        
        if (!userId) {
          return NextResponse.json({ success: false, reason: 'Invalid token' }, { status: 401 });
        }
      } catch (jwtError) {
        return NextResponse.json({ success: false, reason: 'Invalid or expired token' }, { status: 401 });
      }
    }

    const resolvedParams = await params;
    const postId = parseInt(resolvedParams.id);

    if (isNaN(postId)) {
      return NextResponse.json({ success: false, reason: 'Invalid post ID' }, { status: 400 });
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        userId: true
      }
    });

    if (!post) {
      return NextResponse.json({ success: false, reason: 'Post not found' }, { status: 404 });
    }

    // Check if user can delete this post (skip check for admin)
    if (!isAdmin && userId) {
      // User can only delete their own posts
      if (post.userId !== userId) {
        return NextResponse.json({ 
          success: false, 
          reason: 'You do not have permission to delete this post' 
        }, { status: 403 });
      }
    }

    // Delete related records first due to RESTRICT constraints
    // Note: CommentLikes has CASCADE, so it will be deleted automatically when comments are deleted
    // UserMention has CASCADE, so it will be deleted automatically when post is deleted
    
    // Delete all comments (including nested replies)
    // Prisma will handle this recursively if needed, but we'll delete all at once
    await prisma.postComment.deleteMany({
      where: { postId }
    });
    
    // Delete post likes
    await prisma.postLikes.deleteMany({
      where: { postId }
    });
    
    // Delete post sections
    await prisma.postSection.deleteMany({
      where: { postId }
    });
    
    // Delete tags
    await prisma.tag.deleteMany({
      where: { postId }
    });
    
    // UserMention has CASCADE in schema, so it should be deleted automatically
    // But to be safe with database constraints, delete it explicitly
    await prisma.userMention.deleteMany({
      where: { postId }
    });
    
    // Now delete the post
    await prisma.post.delete({
      where: { id: postId }
    });

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully'
    });

  } catch (error: any) {
    console.error('DELETE /api/posts/[id] error:', error);
    return NextResponse.json({ 
      success: false, 
      reason: 'Internal server error',
      error: error.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
