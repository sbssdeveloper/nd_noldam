import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/utils/auth'
import { prisma } from '@/utils/prisma'

// POST /api/meetings/[id]/reviews - Create a new review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const meetingId = parseInt(id)
    
    if (isNaN(meetingId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid meeting ID' },
        { status: 400 }
      )
    }

    // Auth check
    const payload = await verifyToken(request)
    if (!payload || (!payload.uid && !payload.userId)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt((payload.uid || payload.userId) as string)
    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ success: false, error: 'Invalid user' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { title, content, rating } = body

    // Validate required fields
    if (!content || !rating) {
      return NextResponse.json(
        { success: false, error: 'Content and rating are required' },
        { status: 400 }
      )
    }

    // Validate rating (1-5)
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Check if meeting exists
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId }
    })

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: 'Meeting not found' },
        { status: 404 }
      )
    }

    // Check if user is a participant of this meeting
    const participant = await prisma.meetingParticipant.findFirst({
      where: {
        userId: userId,
        meetingId: meetingId
      }
    })

    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'You must be a participant to review this meeting' },
        { status: 403 }
      )
    }

    // Check if user has already reviewed this meeting
    const existingReview = await prisma.meetingReview.findFirst({
      where: {
        userId: userId,
        meetingId: meetingId
      }
    })

    if (existingReview) {
      return NextResponse.json(
        { success: false, error: 'You have already reviewed this meeting' },
        { status: 409 }
      )
    }

    // Create the review
    const review = await prisma.meetingReview.create({
      data: {
        userId: userId,
        meetingId: meetingId,
        title: title || null,
        content: content,
        rating: rating
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
    })

    return NextResponse.json({
      success: true,
      data: review,
      message: 'Review submitted successfully'
    })

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/meetings/[id]/reviews - Get all reviews for a meeting
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const meetingId = parseInt(id)
    
    if (isNaN(meetingId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid meeting ID' },
        { status: 400 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Get reviews with pagination
    const [reviews, totalCount] = await Promise.all([
      prisma.meetingReview.findMany({
        where: { meetingId: meetingId },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              profileImage: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limit
      }),
      prisma.meetingReview.count({
        where: { meetingId: meetingId }
      })
    ])

    // Calculate average rating
    const avgRating = await prisma.meetingReview.aggregate({
      where: { meetingId: meetingId },
      _avg: { rating: true }
    })

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        averageRating: avgRating._avg.rating || 0
      }
    })

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
