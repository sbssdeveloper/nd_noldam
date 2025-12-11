import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/utils/auth'
import { prisma } from '@/utils/prisma'
import { NotificationService } from '@/app/web/config/NotificationService'
import { NOTIFICATION_TYPES } from '@/app/web/config/notifications'

const notificationService = new NotificationService()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const payload = await verifyToken(request)
    if (!payload || (!payload.uid && !payload.userId)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt((payload.uid || payload.userId) as string)
    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ success: false, error: 'Invalid user' }, { status: 401 })
    }

    const { id } = await params
    const meetingId = parseInt(id)
    
    if (isNaN(meetingId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid meeting ID' },
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

    // Check if user has joined this meeting
    const existingParticipant = await prisma.meetingParticipant.findFirst({
      where: {
        meetingId,
        userId
      }
    })

    if (!existingParticipant) {
      return NextResponse.json(
        { success: false, error: 'You have not joined this meeting' },
        { status: 400 }
      )
    }

    // Check if cancellation is still allowed (1 day before meeting)
    const meetingTime = new Date(meeting.meetingTime)
    const cancelDeadline = new Date(meetingTime)
    cancelDeadline.setDate(cancelDeadline.getDate() - 1)
    cancelDeadline.setHours(16, 59, 59, 999) // 4:59:59 PM

    const now = new Date()
    if (now >= cancelDeadline) {
      return NextResponse.json(
        { success: false, error: 'Cancellation deadline has passed. You can only cancel until 1 day before the meeting.' },
        { status: 400 }
      )
    }

    // Delete participant record (leave meeting)
    await prisma.meetingParticipant.delete({
      where: {
        id: existingParticipant.id
      }
    })

    try {
      const participantUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { nickname: true }
      })

      await notificationService.createNotification(
        meeting.userId,
        NOTIFICATION_TYPES.MEETING_LEFT,
        {
          userName: participantUser?.nickname || 'Someone',
          meetingName: meeting.meetingName,
          meetingId
        },
        {
          relatedId: meetingId,
          relatedType: 'meeting'
        }
      )
    } catch (notificationError) {
      console.error('Meeting leave notification error:', notificationError)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully left the meeting'
    })

  } catch (error: any) {
    console.error('Error leaving meeting:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to leave meeting' },
      { status: 500 }
    )
  }
}

