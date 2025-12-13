import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { successResponse, errorResponse } from '@/utils/general'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const categoryId = searchParams.get('category')
    const round = searchParams.get('round') || 'all' // all, this_week, this_month
    const sort = searchParams.get('sort') || 'latest' // latest, popular
    const isAdmin = searchParams.get('admin') === '1'

    // Get current user for draft visibility check
    let currentUserId: number | null = null
    try {
      const authHeader = request.headers.get('authorization')
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '')
        const { verifyToken } = await import('@/utils/auth')
        const payload = await verifyToken(request)
        if (payload && (payload.uid || payload.userId)) {
          currentUserId = parseInt((payload.uid || payload.userId) as string)
        }
      }
    } catch (authError) {
      // Ignore auth errors - user is not authenticated
    }

    // If no query provided, return empty results
    if (!query || !query.trim()) {
      return NextResponse.json(
        successResponse({
          meetings: [],
          total: 0
        }, 'Meetings retrieved successfully'),
        { status: 200 }
      )
    }

    // Build where clause
    const whereClause: any = { AND: [] }
    if (!isAdmin) {
      // Visibility rules:
      // - "approved" → visible to everyone
      // - "pending", "reject", "completed", "draft" → visible only to creator
      whereClause.AND.push({
        OR: [
          { status: { in: ['approved', 'completed'] } }, // Show approved and completed meetings to everyone
          // Show pending/reject/draft only to creator
          ...(currentUserId ? [
            { status: { in: ['pending', 'reject', 'draft'] }, userId: currentUserId }
          ] : [])
        ]
      })
    }

    // Category filter (applied separately from search)
    if (categoryId) {
      whereClause.AND.push({
        categories: {
          has: categoryId
        }
      })
    }

    // Search filter - query is required (already checked above)
    if (query && query.trim()) {
      const searchTerm = query.trim()
      whereClause.AND.push({
        OR: [
          { meetingName: { contains: searchTerm, mode: 'insensitive' } },
          { roadNameAddress: { contains: searchTerm, mode: 'insensitive' } },
          { detailedAddress: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } }
        ]
      })
    }

    // Round/Time filter
    const now = new Date()
    if (round === 'this_week') {
      // This week: from Monday 00:00 to Sunday 23:59 of current week
      const startOfWeek = new Date(now)
      const currentDay = now.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
      
      // Calculate days to go back to Monday (or Sunday if you want week to start on Sunday)
      const daysToMonday = currentDay === 0 ? -6 : -(currentDay - 1) // Adjust to Monday
      startOfWeek.setDate(now.getDate() + daysToMonday)
      startOfWeek.setHours(0, 0, 0, 0) // Start of Monday
      
      // Calculate end of week (Sunday)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6) // Add 6 days to get to Sunday
      endOfWeek.setHours(23, 59, 59, 999) // End of Sunday
      
      whereClause.AND.push({
        meetingTime: {
          gte: startOfWeek,
          lte: endOfWeek
        }
      })
    } else if (round === 'this_month') {
      // This month: from 1st day 00:00 to last day 23:59 of current month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      
      whereClause.AND.push({
        meetingTime: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      })
    }

    // Build orderBy clause
    let orderBy: any = { createdAt: 'desc' } // default: latest

    if (sort === 'popular') {
      // We'll sort by popularity after fetching (participants + likes count)
      orderBy = { createdAt: 'desc' } // fetch all first, then sort in memory
    }

    // Fetch meetings
    const meetings = await prisma.meeting.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            profileImage: true,
            city: true,
            province: true,
            activeCommunityBadge: {
              select: {
                id: true,
                name: true,
                imageUrl: true
              }
            }
          }
        },
        participants: {
          select: {
            userId: true
          }
        },
        likes: {
          select: {
            userId: true
          }
        },
        _count: {
          select: {
            participants: true,
            likes: true
          }
        }
      },
      orderBy,
      take: 50 // Limit results
    })

    // Transform and calculate popularity
    let results = meetings.map(meeting => {
      const participantCount = meeting._count.participants
      const likeCount = meeting._count.likes
      const popularityScore = participantCount + likeCount

      return {
        id: meeting.id,
        meetingName: meeting.meetingName,
        meetingBackground: meeting.meetingBackground,
        categories: meeting.categories,
        activities: meeting.activities,
        location: meeting.roadNameAddress,
        roadNameAddress: meeting.roadNameAddress,
        detailedAddress: meeting.detailedAddress,
        meetingTime: meeting.meetingTime,
        description: meeting.description,
        minNum: meeting.minNum,
        maxNum: meeting.maxNum,
        fee: meeting.fee,
        hasFee: meeting.hasFee,
        participantCount,
        likeCount,
        popularityScore,
        user: {
          id: meeting.user.id,
          nickname: meeting.user.nickname,
          profileImage: meeting.user.profileImage,
          city: meeting.user.city,
          province: meeting.user.province,
          activeCommunityBadge: meeting.user.activeCommunityBadge
        },
        createdAt: meeting.createdAt
      }
    })

    // Sort by popularity if requested
    if (sort === 'popular') {
      results = results.sort((a, b) => b.popularityScore - a.popularityScore)
    }

    return NextResponse.json(
      successResponse({
        meetings: results,
        total: results.length
      }, 'Meetings retrieved successfully'),
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      errorResponse('Failed to search meetings', 500),
      { status: 500 }
    )
  }
}

