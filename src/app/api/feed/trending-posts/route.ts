import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { BadgeService } from '@/app/web/config/BadgeService'
import { verifyToken } from '@/utils/auth'

// Section 3: Get trending posts based on user interests
export async function GET(request: NextRequest) {
  try {
    // Get pagination parameters
    const { searchParams } = new URL(request.url)
    const offset = parseInt(searchParams.get('offset') || '0')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // Try to get user info, but don't require it
    const payload = await verifyToken(request)
    let userCategories: any[] = []
    let currentUserId: number | null = null
    
    
    if (payload && (payload.uid || payload.userId)) {
      const userId = parseInt((payload.uid || payload.userId) as string)
      if (userId && !Number.isNaN(userId)) {
        currentUserId = userId
        
        // Get user's interested categories if authenticated
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { categories: true }
        })
        userCategories = user?.categories || []
      }
    }

    // Get trending posts based on likes count (Top 10 most liked posts)
    // Show all posts sorted by likes - no date restriction for trending
    const now = new Date();
    
    // Build where clause - no date restriction, just public and non-restricted posts
    const whereClause: any = currentUserId 
      ? {
          AND: [
            {
              isPublic: true
            },
            {
              userId: { not: currentUserId }
            },
            {
              OR: [
                { restrictionUntil: null },
                { restrictionUntil: { lte: now } }
              ]
            }
          ]
        }
      : {
          isPublic: true,
          OR: [
            { restrictionUntil: null },
            { restrictionUntil: { lte: now } }
          ]
        }

    // Get all posts matching criteria
    let allPosts = await prisma.post.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            profileImage: true,
            city: true,
            province: true,
            categories: true,
            activeCommunityBadge: {
              select: {
                id: true,
                name: true,
                imageUrl: true
              }
            }
          }
        },
        likes: {
          select: {
            id: true
          }
        },
        comments: {
          select: {
            id: true
          }
        },
        tags: {
          select: {
            tag: true
          }
        }
      }
    })

    // Fallback 1: If no posts found with current filters, try without isPublic restriction
    // This handles cases where all posts might be private
    if (allPosts.length === 0) {
      const fallbackWhereClause: any = currentUserId 
        ? {
            AND: [
              {
                userId: { not: currentUserId }
              },
              {
                OR: [
                  { restrictionUntil: null },
                  { restrictionUntil: { lte: now } }
                ]
              }
            ]
          }
        : {
            OR: [
              { restrictionUntil: null },
              { restrictionUntil: { lte: now } }
            ]
          }

      allPosts = await prisma.post.findMany({
        where: fallbackWhereClause,
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              profileImage: true,
              city: true,
              province: true,
              categories: true,
              activeCommunityBadge: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true
                }
              }
            }
          },
          likes: {
            select: {
              id: true
            }
          },
          comments: {
            select: {
              id: true
            }
          },
          tags: {
            select: {
              tag: true
            }
          }
        }
      })
    }

    // Fallback 2: If still no posts (maybe all belong to current user), show all posts
    // This ensures trending section always shows something if posts exist
    if (allPosts.length === 0 && currentUserId) {
      allPosts = await prisma.post.findMany({
        where: {
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
              city: true,
              province: true,
              categories: true,
              activeCommunityBadge: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true
                }
              }
            }
          },
          likes: {
            select: {
              id: true
            }
          },
          comments: {
            select: {
              id: true
            }
          },
          tags: {
            select: {
              tag: true
            }
          }
        }
      })
    }

    const uniqueUserIds = Array.from(new Set(allPosts.map(post => post.user.id).filter((id): id is number => typeof id === 'number' && !Number.isNaN(id))))
    const badgeMap = await BadgeService.ensureCommunityBadgesForUsers(uniqueUserIds)

    // Sort by likes count only (Top 10 most liked posts)
    // If user has interest categories, prioritize posts from users with matching categories
    const postsWithScore = allPosts.map(post => {
      const likesCount = post.likes.length
      const commentsCount = post.comments.length
      
      // Check if post author categories match user interests
      const postUserCategories = post.user.categories || []
      const matchesInterest = userCategories.length === 0 || 
        postUserCategories.some((cat: any) => userCategories.includes(cat))

      // Boost score if matches interests (small boost to break ties)
      const interestBoost = matchesInterest ? 0.1 : 0

      return {
        ...post,
        likesCount,
        commentsCount,
        sortScore: likesCount + interestBoost  // Sort by likes count only
      }
    })

    // Separate posts with likes vs without likes
    const postsWithLikes = postsWithScore.filter(post => post.likesCount > 0)
    const postsWithoutLikes = postsWithScore.filter(post => post.likesCount === 0)

    // Sort posts with likes by likes count (descending)
    const sortedPostsWithLikes = postsWithLikes.sort((a, b) => b.sortScore - a.sortScore)
    
    // Sort posts without likes by creation date (newest first)
    const sortedPostsWithoutLikes = postsWithoutLikes.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Combine: posts with likes first (sorted by likes), then posts without likes (sorted by date)
    const sortedPosts = [...sortedPostsWithLikes, ...sortedPostsWithoutLikes]
    
    
    const trendingPosts = sortedPosts
      .slice(0, 10)
      .map(post => ({
        id: post.id,
        title: post.title,
        content: post.content,
        imageUrl: post.imageUrl,
        createdAt: post.createdAt.toISOString(),
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        user: {
          id: post.user.id,
          nickname: post.user.nickname,
          profileImage: post.user.profileImage,
          city: post.user.city,
          province: post.user.province,
          activeCommunityBadge: badgeMap[post.user.id] ?? post.user.activeCommunityBadge
        }
      }))

    // Get remaining posts from 11th position onwards
    const remainingPosts = sortedPosts
      .slice(10)
      .map(post => ({
        id: post.id,
        title: post.title,
        content: post.content,
        imageUrl: post.imageUrl,
        createdAt: post.createdAt.toISOString(),
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        user: {
          id: post.user.id,
          nickname: post.user.nickname,
        profileImage: post.user.profileImage,
        city: post.user.city,
        province: post.user.province,
        activeCommunityBadge: badgeMap[post.user.id] ?? post.user.activeCommunityBadge
        }
      }))

    // Return both trending posts and remaining posts
    
    const response = {
      success: true,
      data: {
        trendingPosts,
        remainingPosts
      }
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching trending posts:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch trending posts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

