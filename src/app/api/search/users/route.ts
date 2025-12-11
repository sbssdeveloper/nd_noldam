import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { successResponse, errorResponse } from '@/utils/general'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const categoryId = searchParams.get('category')

    // If no query provided, return empty results
    if (!query || !query.trim()) {
      return NextResponse.json(
        successResponse({
          users: [],
          total: 0
        }, 'Users retrieved successfully'),
        { status: 200 }
      )
    }

    // Build where clause - must use AND to combine status with search conditions
    const whereClause: any = {
      AND: [
        { status: 'active' } // Only show active users
      ]
    }

    // Category filter (filter users who have this category in their interests)
    if (categoryId) {
      whereClause.AND.push({
        categories: {
          has: parseInt(categoryId)
        }
      })
    }

    // Search filter - query is required (already checked above)
    const searchTerm = query.trim()
    whereClause.AND.push({
      OR: [
        { nickname: { contains: searchTerm, mode: 'insensitive' } },
        { statusMessage: { contains: searchTerm, mode: 'insensitive' } }
      ]
    })

    // Fetch users
    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        profile: {
          select: {
            description: true,
            publicVisibility: true
          }
        },
        activeCommunityBadge: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            description: true
          }
        },
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
            meetings: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limit results
    })

    // Transform results
    const results = users.map(user => ({
      id: user.id,
      nickname: user.nickname,
      statusMessage: user.statusMessage,
      profileImage: user.profileImage,
      city: user.city,
      province: user.province,
      description: user.profile?.description || user.statusMessage || '',
      activeCommunityBadge: user.activeCommunityBadge,
      stats: {
        followersCount: user._count.followers,
        followingCount: user._count.following,
        postsCount: user._count.posts,
        meetingsCount: user._count.meetings
      },
      createdAt: user.createdAt
    }))

    return NextResponse.json(
      successResponse({
        users: results,
        total: results.length
      }, 'Users retrieved successfully'),
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      errorResponse('Failed to search users', 500),
      { status: 500 }
    )
  }
}

