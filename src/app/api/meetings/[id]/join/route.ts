import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/utils/auth'
import { prisma } from '@/utils/prisma'
import { NotificationService } from '@/app/web/config/NotificationService'
import { NOTIFICATION_TYPES } from '@/app/web/config/notifications'
import { sendMeetingJoinedNotification } from '@/lib/sms/biztalk'

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
      where: { id: meetingId },
      include: {
        participants: true,
        user: {
          select: {
            id: true,
            nickname: true
          }
        }
      }
    })

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: 'Meeting not found' },
        { status: 404 }
      )
    }

    // Check if meeting is approved by admin
    // if (!meeting.adminApproval) {
    //   return NextResponse.json(
    //     { success: false, error: 'Meeting is not yet approved' },
    //     { status: 403 }
    //   )
    // }

    // Check if user is the owner
    if (meeting.userId === userId) {
      return NextResponse.json(
        { success: false, error: 'You cannot join your own meeting' },
        { status: 400 }
      )
    }

    // Check if user already joined
    const existingParticipant = await prisma.meetingParticipant.findFirst({
      where: {
        meetingId,
        userId
      }
    })

    if (existingParticipant) {
      // If payment is pending, allow them to proceed to payment page
      if (existingParticipant.paymentStatus === 'pending' && meeting.hasFee) {
        return NextResponse.json(
          { 
            success: true, 
            participant: existingParticipant,
            paymentPending: true,
            message: 'Payment pending - proceed to payment page'
          },
          { status: 200 }
        )
      }
      
      // If already confirmed, reject
      return NextResponse.json(
        { success: false, error: 'You have already joined this meeting', alreadyJoined: true },
        { status: 400 }
      )
    }

    // Check if meeting is full
    // Only count confirmed participants (exclude pending payments)
    const confirmedParticipants = meeting.participants.filter(p => p.paymentStatus === 'confirmed')
    const currentParticipants = confirmedParticipants.length
    if (currentParticipants >= meeting.maxNum) {
      return NextResponse.json(
        { success: false, error: 'Meeting is full', isFull: true },
        { status: 400 }
      )
    }

    // Create participant record
    const participant = await prisma.meetingParticipant.create({
      data: {
        userId,
        meetingId,
        paymentStatus: meeting.hasFee ? 'pending' : 'confirmed'
      }
    })

    console.log('[Join Meeting] Participant created:', {
      participantId: participant.id,
      paymentStatus: participant.paymentStatus,
      meetingHasFee: meeting.hasFee
    })

    // Send KakaoTalk notification for free meetings
    if (!meeting.hasFee && participant.paymentStatus === 'confirmed') {
      try {
        const participantUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { 
            nickname: true,
            phoneNumber: true 
          }
        })
        
        if (participantUser?.phoneNumber) {
          await sendMeetingJoinedNotification({
            recipientPhone: participantUser.phoneNumber,
            participantName: participantUser.nickname || '회원',
            meetingName: meeting.meetingName,
            paymentDate: participant.joinedOn,
            paymentAmount: 0,
            paymentMethod: '무료',
            meetingId: meetingId
          })
          console.log('[Join Meeting] KakaoTalk notification sent to participant for free meeting')
        }
      } catch (kakaoError: any) {
        console.error('[Join Meeting] Failed to send KakaoTalk notification:', kakaoError)
        // Don't fail the join process if notification fails
      }
    }

    try {
      const participantUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { nickname: true }
      })

      await notificationService.createNotification(
        meeting.userId,
        NOTIFICATION_TYPES.MEETING_JOINED,
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

      // Only count confirmed participants for capacity check
      const confirmedCount = meeting.participants.filter(p => p.paymentStatus === 'confirmed').length
      const updatedCount = confirmedCount + 1
      if (updatedCount >= meeting.maxNum) {
        const alreadyNotified = await prisma.userNotification.findFirst({
          where: {
            userId: meeting.userId,
            notificationType: NOTIFICATION_TYPES.MEETING_FULL,
            relatedId: meetingId
          }
        })

        if (!alreadyNotified) {
          await notificationService.createNotification(
            meeting.userId,
            NOTIFICATION_TYPES.MEETING_FULL,
            {
              meetingName: meeting.meetingName,
              meetingId
            },
            {
              relatedId: meetingId,
              relatedType: 'meeting'
            }
          )
        }
      }
    } catch (notificationError) {
      console.error('Meeting join notification error:', notificationError)
    }

    // Automatically add participant to the meeting's chat group
    try {
      // Find or create the chat room for this meeting
      let chatRoom = await (prisma as any).chatRoom.findFirst({
        where: {
          meetingId: meetingId,
          type: 'group',
          isActive: true
        }
      })

      // If chat room doesn't exist, create it
      if (!chatRoom) {
        chatRoom = await (prisma as any).chatRoom.create({
          data: {
            type: 'group',
            name: meeting.meetingName,
            avatar: meeting.meetingBackground || null,
            meetingId: meetingId,
            createdBy: meeting.userId,
            allowParticipantChat: true,
            lastActivity: new Date(),
            isActive: true
          }
        })

        // Add meeting creator as host if they're not already in the room
        const hostExists = await (prisma as any).chatParticipant.findUnique({
          where: {
            roomId_userId: {
              roomId: chatRoom.id,
              userId: meeting.userId
            }
          }
        })

        if (!hostExists) {
          await (prisma as any).chatParticipant.create({
            data: {
              roomId: chatRoom.id,
              userId: meeting.userId,
              role: 'host',
              joinedAt: new Date(),
              isActive: true
            }
          })
        }
      }

      // Add the new participant to the chat room (if not already added)
      const existingChatParticipant = await (prisma as any).chatParticipant.findUnique({
        where: {
          roomId_userId: {
            roomId: chatRoom.id,
            userId: userId
          }
        }
      })

      if (!existingChatParticipant) {
        await (prisma as any).chatParticipant.create({
          data: {
            roomId: chatRoom.id,
            userId: userId,
            role: 'participant',
            joinedAt: new Date(),
            isActive: true
          }
        })
      } else if (!existingChatParticipant.isActive) {
        // Reactivate if they had left before
        await (prisma as any).chatParticipant.update({
          where: {
            roomId_userId: {
              roomId: chatRoom.id,
              userId: userId
            }
          },
          data: {
            isActive: true,
            leftAt: null,
            joinedAt: new Date()
          }
        })
      }
    } catch (chatRoomError) {
      // Log error but don't fail participant joining
      console.error('Error adding participant to chat room:', chatRoomError)
    }

    return NextResponse.json({ 
      success: true, 
      participant,
      message: 'Successfully joined the meeting'
    })

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to join meeting' },
      { status: 500 }
    )
  }
}

// GET endpoint to check if user can join
export async function GET(
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
      where: { id: meetingId },
      include: {
        participants: true
      }
    })

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: 'Meeting not found' },
        { status: 404 }
      )
    }

    // Check various conditions
    const isOwner = meeting.userId === userId
    // Only count confirmed participants (exclude pending payments)
    const confirmedParticipants = meeting.participants.filter(p => p.paymentStatus === 'confirmed')
    const currentParticipants = confirmedParticipants.length
    const isFull = currentParticipants >= meeting.maxNum
    const userParticipant = meeting.participants.find(p => p.userId === userId)
    const alreadyJoined = !!userParticipant
    const canJoin = !isOwner && !isFull && !alreadyJoined && meeting.status === 'approved'
    
    // Get payment status if user has joined
    const paymentStatus = userParticipant?.paymentStatus || null

    return NextResponse.json({
      success: true,
      canJoin,
      isOwner,
      isFull,
      alreadyJoined,
      paymentStatus, // Add payment status to response
      currentParticipants,
      maxParticipants: meeting.maxNum,
      isApproved: meeting.status === 'approved'
    })

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to check join status' },
      { status: 500 }
    )
  }
}

