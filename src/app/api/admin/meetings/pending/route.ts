import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { isAdminTokenValid } from '@/apiConfigs/admin'

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const adminToken = request.cookies.get('admin_auth_token')?.value
    if (!adminToken || !isAdminTokenValid(adminToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch meetings with pending status
    const meetings = await prisma.meeting.findMany({
      where: {
        status: 'pending'
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            phoneNumber: true,
            profileImage: true
          }
        },
        participants: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Fetch all unique category IDs from meetings
    const categoryIds = new Set<number>()
    meetings.forEach(meeting => {
      if (meeting.categories && Array.isArray(meeting.categories)) {
        meeting.categories.forEach((catId: string | number) => {
          const id = typeof catId === 'string' ? parseInt(catId) : catId
          if (!isNaN(id)) {
            categoryIds.add(id)
          }
        })
      }
    })

    // Fetch category names
    const categories = await prisma.category.findMany({
      where: {
        id: { in: Array.from(categoryIds) }
      },
      select: {
        id: true,
        name: true
      }
    })

    // Create a map of category ID to name
    const categoryMap = new Map<number, string>()
    categories.forEach(cat => {
      categoryMap.set(cat.id, cat.name)
    })

    // Transform data to match expected format
    const transformedMeetings = meetings.map(meeting => {
      const date = new Date(meeting.meetingTime)
      const formattedDate = date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })

      // Get category name from ID
      let categoryName = ''
      if (meeting.categories && meeting.categories.length > 0) {
        const firstCategoryId = typeof meeting.categories[0] === 'string' 
          ? parseInt(meeting.categories[0]) 
          : meeting.categories[0]
        categoryName = categoryMap.get(firstCategoryId) || ''
      }

      return {
        id: meeting.id,
        title: meeting.meetingName,
        host: meeting.user?.nickname || 'Unknown',
        category: categoryName,
        date: formattedDate,
        price: meeting.hasFee ? `₩${Number(meeting.fee).toLocaleString()}` : '무료',
        capacity: `${meeting.maxNum}명`,
        location: `${meeting.roadNameAddress} ${meeting.detailedAddress}`.trim(),
        meetingTime: meeting.meetingTime,
        description: meeting.description,
        fee: meeting.fee,
        maxNum: meeting.maxNum,
        minNum: meeting.minNum,
        userId: meeting.userId
      }
    })

    return NextResponse.json(transformedMeetings, {
      headers: {
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error('Error fetching pending meetings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending meetings' },
      { status: 500 }
    )
  }
}

