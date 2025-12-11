import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering and disable Next.js route caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import jwt from 'jsonwebtoken';
import { prisma } from '@/utils/prisma';
import { isAdminTokenValid } from '@/apiConfigs/admin';

function errorResponse(message: string, statusCode: number) {
  return {
    success: false,
    reason: message,
    statusCode
  };
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const { searchParams } = new URL(request.url);
    // Optional target user to view
    const qUserId = searchParams.get('userId');
    const targetUserId = qUserId ? parseInt(qUserId) : null;
    
    // Support both `type` and legacy `tab` query keys
    const qType = searchParams.get('type');
    const qTab = searchParams.get('tab');
    const type = (qType || qTab || 'posts') as 'posts' | 'replies' | 'tagged' | 'my-posts';
    
    let viewerId: number | null = null; // Authenticated user ID (for like checks)
    let feedOwnerId: number | null = null; // User whose feed we're viewing

    // Check for admin authentication via cookies (for admin dashboard access)
    const adminToken = request.cookies.get('admin_auth_token')?.value;
    const isAdmin = adminToken ? isAdminTokenValid(adminToken) : false;

    if (isAdmin) {
      // Admin access - allow viewing any user's feed
      if (targetUserId) {
        // Admin is viewing another user's feed - allow access
        // Verify target user exists
        const targetUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { id: true, nickname: true }
        });

        if (!targetUser) {
          return NextResponse.json(
            errorResponse('Target user not found', 404),
            { status: 404 }
          );
        }

        // For admin access, use targetUserId as feedOwnerId
        feedOwnerId = targetUserId;
        viewerId = targetUserId; // Admin viewing as that user
      } else {
        // Admin viewing without targetUserId - need token to determine which user
        if (!token) {
          return NextResponse.json(
            errorResponse('No token or targetUserId provided', 401),
            { status: 401 }
          );
        }
        // Fall through to regular user authentication
      }
    }
    
    // Regular user authentication via JWT (or admin without targetUserId)
    // If admin already set feedOwnerId, skip regular auth
    if (!feedOwnerId) {
      if (!token) {
        return NextResponse.json(
          errorResponse('No token provided', 401),
          { status: 401 }
        );
      }

      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments') as any;
        viewerId = parseInt(payload.uid || payload.userId);

        if (!viewerId) {
          return NextResponse.json(
            errorResponse('Invalid token payload', 401),
            { status: 401 }
          );
        }

        // Check if authenticated user exists
        const user = await prisma.user.findUnique({
          where: { id: viewerId },
          select: { id: true, nickname: true }
        });

        if (!user) {
          return NextResponse.json(
            errorResponse('User not found', 404),
            { status: 404 }
          );
        }

        // Set feedOwnerId based on targetUserId
        if (targetUserId) {
          if (targetUserId !== viewerId) {
            // Viewing another user's feed - verify target user exists
            const targetUser = await prisma.user.findUnique({
              where: { id: targetUserId },
              select: { id: true, nickname: true }
            });

            if (!targetUser) {
              return NextResponse.json(
                errorResponse('Target user not found', 404),
                { status: 404 }
              );
            }

            // Use targetUserId as the feedOwnerId (whose feed we're viewing)
            // Keep viewerId as the authenticated user (for like checks)
            feedOwnerId = targetUserId;
          } else {
            // targetUserId === viewerId, viewing own feed
            feedOwnerId = viewerId;
          }
        } else {
          // No targetUserId provided, viewing own feed
          feedOwnerId = viewerId;
        }
      } catch (jwtError) {
        return NextResponse.json(
          errorResponse('Invalid or expired token', 401),
          { status: 401 }
        );
      }
    }

    // Use feedOwnerId for querying feed data
    // Ensure we always have a valid ID
    if (!feedOwnerId && !viewerId) {
      return NextResponse.json(
        errorResponse('Unable to determine feed owner', 400),
        { status: 400 }
      );
    }
    const finalTargetUserId = feedOwnerId || viewerId;

    let feedData: any[] = [];

    switch (type) {
      case 'my-posts':
      case 'posts':
        // User's own posts only
        // Filter out restricted posts (only for non-admin users - admins see all posts)
        const now = new Date();
        feedData = await prisma.post.findMany({
          where: { 
            userId: finalTargetUserId,
            // Only apply restriction filter for non-admin users
            ...(isAdmin ? {} : {
              OR: [
                { restrictionUntil: null },
                { restrictionUntil: { lte: now } }
              ]
            })
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
              where: {
                // Only apply restriction filter for non-admin users - admins see all comments
                ...(isAdmin ? {} : {
                  OR: [
                    { restrictionUntil: null },
                    { restrictionUntil: { lte: now } }
                  ]
                })
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
            },
            tags: true
          },
          orderBy: { createdAt: 'desc' }
        });
        break;

      case 'replies':
        // Posts where the current user has commented; include ONLY that user's comments
        // and that user's nested replies under their own comments
        const restrictionDate = new Date();
        const commentedPosts = await prisma.post.findMany({
          where: {
            comments: { some: { userId: finalTargetUserId } },
            // Only apply restriction filter for non-admin users - admins see all posts
            ...(isAdmin ? {} : {
              OR: [
                { restrictionUntil: null },
                { restrictionUntil: { lte: restrictionDate } }
              ]
            })
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
            likes: { select: { userId: true } },
            // Provide total counts for the post, regardless of filtered comments
            _count: {
              select: {
                comments: true,
                likes: true
              }
            },
            // Only include current user's comments on these posts
            // Filter out restricted comments (only for non-admin users - admins see all comments)
            comments: {
              where: { 
                userId: finalTargetUserId,
                // Only apply restriction filter for non-admin users
                ...(isAdmin ? {} : {
                  OR: [
                    { restrictionUntil: null },
                    { restrictionUntil: { lte: restrictionDate } }
                  ]
                })
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
                likes: { select: { id: true, userId: true } }
              }
            },
            tags: true
          },
          orderBy: { createdAt: 'desc' }
        });

        // For each user's comment, fetch that user's nested replies only
        const postsWithUserOnlyReplyThreads = await Promise.all(
          commentedPosts.map(async (post: any) => {
            const commentsWithReplies = await Promise.all(
              (post.comments || []).map(async (c: any) => {
                const replies = await prisma.postComment.findMany({
                  where: { 
                    parentCommentId: c.id, 
                    userId: finalTargetUserId,
                    // Only apply restriction filter for non-admin users - admins see all replies
                    ...(isAdmin ? {} : {
                      OR: [
                        { restrictionUntil: null },
                        { restrictionUntil: { lte: restrictionDate } }
                      ]
                    })
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
                    likes: { select: { id: true, userId: true } }
                  },
                  orderBy: { createdAt: 'asc' }
                });
                return { ...c, replies };
              })
            );
            return { ...post, comments: commentsWithReplies };
          })
        );

        feedData = postsWithUserOnlyReplyThreads;
        break;

      case 'tagged':
        // Posts where user is mentioned/tagged (@username)
        const taggedRestrictionDate = new Date();
        const mentions = await prisma.userMention.findMany({
          where: { 
            mentionedUserId: finalTargetUserId,
            post: {
              // Only apply restriction filter for non-admin users - admins see all posts
              ...(isAdmin ? {} : {
                OR: [
                  { restrictionUntil: null },
                  { restrictionUntil: { lte: taggedRestrictionDate } }
                ]
              })
            }
          },
          include: {
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
                  where: {
                    // Only apply restriction filter for non-admin users - admins see all comments
                    ...(isAdmin ? {} : {
                      OR: [
                        { restrictionUntil: null },
                        { restrictionUntil: { lte: taggedRestrictionDate } }
                      ]
                    })
                  },
                  include: {
                    user: {
                      select: {
                        id: true,
                        nickname: true,
                        profileImage: true
                      }
                    }
                  }
                },
                tags: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
        // Return the actual posts where user was mentioned
        feedData = mentions.map((mention: any) => mention.post);
        break;

      default:
        feedData = [];
    }

    // Enrich posts with like counts and isLiked status
    const enrichedFeedData = feedData.map((post: any) => {
      const likeCount = post.likes?.length || 0
      const isLiked = post.likes?.some((like: any) => like.userId === viewerId) || false
      
      return {
        ...post,
        likeCount,
        isLiked,
        // Also enrich comments with like counts and isLiked status
        comments: post.comments?.map((comment: any) => {
          const commentLikeCount = comment.likes?.length || 0
          const commentIsLiked = comment.likes?.some((like: any) => like.userId === viewerId) || false
          
          return {
            ...comment,
            likeCount: commentLikeCount,
            isLiked: commentIsLiked
          }
        }) || []
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        type,
        items: enrichedFeedData,
        total: enrichedFeedData.length
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });

  } catch (error) {
    return NextResponse.json(
      errorResponse('Internal server error', 500),
      { status: 500, headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      } }
    );
  }
}
