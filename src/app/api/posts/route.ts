import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    const { content, imageUrl, title, isPublic, tags } = body;

    if (!content) {
      return NextResponse.json(
        errorResponse('Content is required', 400),
        { status: 400 }
      );
    }

    // Handle ordered content (array) or simple text content
    let postContent;
    let firstImageUrl = null;
    
    if (Array.isArray(content)) {
      // Process ordered content array
      const processedContent = content.map(item => {
        if (item.type === 'file') {
          // For files, store metadata only (file will be uploaded separately)
          return {
            ...item,
            file: undefined, // Remove file object
            fileId: item.id // Use ID as reference
          };
        }
        if (item.type === 'image') {
          // Use server URL for images
          return {
            ...item,
            file: undefined // Remove file object
          };
        }
        return item;
      });
      
      postContent = JSON.stringify(processedContent);
      
      // Find first image URL for preview
      const firstImage = content.find(item => item.type === 'image');
      if (firstImage) {
        firstImageUrl = firstImage.url;
      }
    } else {
      // Simple text content
      postContent = content.trim();
      firstImageUrl = imageUrl || null;
    }

    // Create the post
    const post = await prisma.post.create({
      data: {
        userId,
        content: postContent,
        title: title || '',
        imageUrl: firstImageUrl,
        isPublic: isPublic !== undefined ? isPublic : true
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
        },
        comments: {
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
        },
        tags: true
      }
    });

    // If tags were provided, create tag records
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tagName of tags) {
        await prisma.tag.create({
          data: {
            tag: tagName,
            postId: post.id
          }
        });
      }
    }

    // Enrich post with like counts
    const enrichedPost = {
      ...post,
      likeCount: post.likes?.length || 0,
      isLiked: false
    };

    return NextResponse.json({
      success: true,
      data: {
        post: enrichedPost,
        message: 'Post created successfully'
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

