import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { verifyToken } from '@/utils/auth'

export async function PUT(
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

    const requestBody = await request.json()
    
    const { meetingFrequency, recurrenceEndOn } = requestBody

    // Verify the user owns this meeting
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        userId: currentUserId
      }
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found or unauthorized' }, { status: 404 })
    }

    // Update meeting frequency and recurrence
    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        meetingFrequency: meetingFrequency || 'none',
        recurrenceEndOn: recurrenceEndOn ? new Date(recurrenceEndOn) : null
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        meeting: updatedMeeting
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update meeting frequency' }, { status: 500 })
  }
}
