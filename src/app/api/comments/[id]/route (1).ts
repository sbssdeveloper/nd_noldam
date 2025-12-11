import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/utils/prisma';
import { isAdminTokenValid } from '@/apiConfigs/admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    if (isAdmin) {
      // Admin can delete any comment
      userId = null; // Will bypass permission check
    } else {
      // Regular user authentication via JWT
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return NextResponse.json({ success: false, reason: 'No token provided' }, { status: 401 });
      }

      const encoder = new TextEncoder();
      const jwtSecretKey = encoder.encode(process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments');
      const { payload } = await jwtVerify(token, jwtSecretKey);
      userId = parseInt(payload.uid || payload.userId);
      
      if (!userId) {
        return NextResponse.json({ success: false, reason: 'Invalid token' }, { status: 401 });
      }
    }

    const commentId = parseInt(params.id);

    if (isNaN(commentId)) {
      return NextResponse.json({ success: false, reason: 'Invalid comment ID' }, { status: 400 });
    }

    // Check if comment exists
    const comment = await prisma.postComment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          select: {
            id: true,
            userId: true
          }
        }
      }
    });

    if (!comment) {
      return NextResponse.json({ success: false, reason: 'Comment not found' }, { status: 404 });
    }

    // Check if user can delete this comment (skip check for admin)
    if (!isAdmin && userId) {
      // User can delete if:
      // 1. They own the comment, OR
      // 2. They own the post
      const canDelete = comment.userId === userId || comment.post.userId === userId;

      if (!canDelete) {
        return NextResponse.json({ 
          success: false, 
          reason: 'You do not have permission to delete this comment' 
        }, { status: 403 });
      }
    }

    // Delete the comment (this will also delete all replies due to cascade)
    await prisma.postComment.delete({
      where: { id: commentId }
    });

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully'
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const commentId = parseInt(params.id);

    if (isNaN(commentId)) {
      return NextResponse.json({ success: false, reason: 'Invalid comment ID', statusCode: 400 }, { status: 400 });
    }

    const body = await request.json();
    const { restrictionDays } = body;

    // If restrictionDays is 0 or null, remove the restriction
    if (restrictionDays === 0 || restrictionDays === null) {
      await prisma.$executeRaw`
        UPDATE post_comments 
        SET restriction_until = NULL
        WHERE id = ${commentId}
      `;

      return NextResponse.json({
        success: true,
        message: 'Comment restriction removed',
        data: {
          commentId,
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
      await prisma.$executeRaw`ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS restriction_until TIMESTAMP`;
    } catch (error: any) {
      // Column might already exist or error occurred, continue
    }

    // Update comment with restriction date using raw SQL to bypass Prisma type checking
    await prisma.$executeRaw`
      UPDATE post_comments 
      SET restriction_until = ${restrictionUntil}::timestamp
      WHERE id = ${commentId}
    `;

    // Verify the update
    const updatedComment = await prisma.$queryRaw<Array<{ id: number; restriction_until: Date | null }>>`
      SELECT id, restriction_until 
      FROM post_comments 
      WHERE id = ${commentId}
    `;

    if (!updatedComment || updatedComment.length === 0) {
      return NextResponse.json({ success: false, reason: 'Comment not found', statusCode: 404 }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Comment restricted for ${restrictionDays} days`,
      data: {
        commentId,
        restrictionUntil: restrictionUntil.toISOString()
      },
      statusCode: 200
    }, { status: 200 });

  } catch (error: any) {
    console.error('PUT /api/comments/[id] error:', error);
    return NextResponse.json({ 
      success: false, 
      reason: 'Internal server error',
      error: error.message,
      statusCode: 500 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
