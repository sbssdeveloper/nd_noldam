import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/utils/auth'
import { prisma } from '@/utils/prisma'

export async function DELETE(
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
    const messageId = parseInt(id)
    
    if (!messageId || Number.isNaN(messageId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid message ID' },
        { status: 400 }
      )
    }

    // Get message to verify ownership
    const message = await (prisma as any).chatMessage.findUnique({
      where: { id: messageId },
      include: {
        room: true
      }
    })

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      )
    }

    // Check permissions: user must be sender OR group admin
    const isSender = message.senderId === userId
    
    // For group chats, check if user is admin
    let isAdmin = false
    if (message.room.type === 'group' && message.room.meetingId) {
      // Check if user is the meeting host (admin)
      const meeting = await (prisma as any).meeting.findUnique({
        where: { id: message.room.meetingId },
        select: { userId: true }
      })
      isAdmin = meeting?.userId === userId
    }
    
    // Check if user is a participant with host role
    if (!isSender && !isAdmin) {
      const participant = await (prisma as any).chatParticipant.findUnique({
        where: {
          roomId_userId: {
            roomId: message.roomId,
            userId: userId
          }
        }
      })
      
      // For group chats, allow if user is host
      if (message.room.type === 'group' && participant?.role === 'host') {
        isAdmin = true
      }
    }
    
    if (!isSender && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own messages or messages in groups you admin' },
        { status: 403 }
      )
    }

    // Soft delete the message
    await (prisma as any).chatMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        content: '[삭제된 메시지]', // Replace content with deletion notice
        attachmentUrl: null,
        fileName: null,
        fileSize: null
      }
    })

    // Notify other participants via socket (will be handled by socket server)
    // The frontend will refresh messages to see the deleted message

    return NextResponse.json({ success: true, message: 'Message deleted successfully' })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete message' },
      { status: 500 }
    )
  }
}

