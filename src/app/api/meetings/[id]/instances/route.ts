import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { verifyToken } from '@/utils/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyToken(request)
    
    if (!payload || (!payload.uid && !payload.userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUserId = parseInt((payload.uid || payload.userId) as string)
    const { id } = await params
    const meetingId = parseInt(id)
    
    if (!meetingId) {
      return NextResponse.json({ error: 'Invalid meeting ID' }, { status: 400 })
    }

    // Get the meeting details
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        userId: currentUserId
      }
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found or unauthorized' }, { status: 404 })
    }

    // Generate meeting instances based on frequency
    const instances = generateMeetingInstances(meeting)

    return NextResponse.json({
      success: true,
      data: {
        instances,
        totalCount: instances.length
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get meeting instances' }, { status: 500 })
  }
}

function generateMeetingInstances(meeting: any) {
  const instances = []
  const startDate = new Date(meeting.meetingTime)
  const endDate = meeting.recurrenceEndOn ? new Date(meeting.recurrenceEndOn) : null
  
  // Always include the first meeting
  instances.push({
    id: meeting.id,
    meetingTime: startDate,
    isOriginal: true,
    status: meeting.status
  })

  // Generate recurring instances based on frequency
  if (meeting.meetingFrequency !== 'none' && endDate) {
    let currentDate = new Date(startDate)
    let instanceCount = 1

    while (currentDate < endDate && instanceCount < 50) { // Limit to 50 instances
      switch (meeting.meetingFrequency) {
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7)
          break
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14)
          break
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1)
          break
        default:
          break
      }

      if (currentDate <= endDate) {
        instances.push({
          id: `${meeting.id}_${instanceCount}`,
          meetingTime: new Date(currentDate),
          isOriginal: false,
          status: 'scheduled'
        })
        instanceCount++
      }
    }
  }

  return instances
}
