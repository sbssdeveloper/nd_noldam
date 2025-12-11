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
    // Show posts from last 30 days for better content availability
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get all recent posts (excluding current user's own posts for trending)
    const now = new Date();
    const whereClause: any = {
      createdAt: {
        gte: thirtyDaysAgo
      },
      isPublic: true, // Only show public posts
      // Filter out restricted posts (only show if restrictionUntil is null or has passed)
      OR: [
        { restrictionUntil: null },
        { restrictionUntil: { lte: now } }
      ]
    }

    // Exclude current user's own posts from trending (like Instagram)
    if (currentUserId) {
      whereClause.userId = { not: currentUserId }
      // Combine with AND when we have userId filter
      whereClause.AND = [
        {
          createdAt: {
            gte: thirtyDaysAgo
          },
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
      // Remove top-level OR since we're using AND now
      delete whereClause.OR;
      delete whereClause.createdAt;
      delete whereClause.isPublic;
      delete whereClause.userId;
    }

    const allPosts = await prisma.post.findMany({
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

    const uniqueUserIds = Array.from(new Set(allPosts.map(post => post.user.id).filter((id): id is number => typeof id === 'number' && !Number.isNaN(id))))
    const badgeMap = await BadgeService.ensureCommunityBadgesForUsers(uniqueUserIds)

    // Sort by likes + comments count (most engagement = trending)
    // If user has interest categories, prioritize posts from users with matching categories
    const postsWithScore = allPosts.map(post => {
      const likesCount = post.likes.length
      const commentsCount = post.comments.length
      
      // Check if post author categories match user interests
      const postUserCategories = post.user.categories || []
      const matchesInterest = userCategories.length === 0 || 
        postUserCategories.some((cat: any) => userCategories.includes(cat))

      // Boost score if matches interests
      const interestBoost = matchesInterest ? 0.5 : 0

      return {
        ...post,
        likesCount,
        commentsCount,
        sortScore: likesCount + commentsCount + interestBoost  // Include comments in trending score
      }
    })

    // Separate posts with engagement vs without engagement
    const postsWithEngagement = postsWithScore.filter(post => post.likesCount > 0 || post.commentsCount > 0)
    const postsWithoutEngagement = postsWithScore.filter(post => post.likesCount === 0 && post.commentsCount === 0)

    // Sort posts with engagement by trending score
    const sortedPostsWithEngagement = postsWithEngagement.sort((a, b) => b.sortScore - a.sortScore)
    
    // Sort posts without engagement randomly (for fallback)
    const sortedPostsWithoutEngagement = postsWithoutEngagement.sort(() => Math.random() - 0.5)

    // Combine: trending posts first, then random posts as fallback
    const sortedPosts = [...sortedPostsWithEngagement, ...sortedPostsWithoutEngagement]
    
    
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
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch trending posts' 
      },
      { status: 500 }
    )
  }
}

