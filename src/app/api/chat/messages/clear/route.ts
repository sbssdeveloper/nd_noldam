import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/utils/auth'
import { prisma } from '@/utils/prisma'

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: 'Room ID is required' },
        { status: 400 }
      )
    }

    const roomIdInt = parseInt(roomId)
    if (Number.isNaN(roomIdInt)) {
      return NextResponse.json(
        { success: false, error: 'Invalid room ID' },
        { status: 400 }
      )
    }

    // Get room to check permissions
    const room = await (prisma as any).chatRoom.findUnique({
      where: { id: roomIdInt },
      include: {
        meeting: {
          select: {
            userId: true
          }
        }
      }
    })

    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      )
    }

    // Check permissions
    let canClear = false

    // For individual chats, user can clear their own chat
    if (room.type === 'user') {
      // Check if user is a participant
      const participant = await (prisma as any).chatParticipant.findUnique({
        where: {
          roomId_userId: {
            roomId: roomIdInt,
            userId: userId
          }
        }
      })
      canClear = !!participant
    } else if (room.type === 'group') {
      // For group chats, only admin/host can clear
      // Check if user is meeting host
      if (room.meeting && room.meeting.userId === userId) {
        canClear = true
      } else {
        // Check if user is a participant with host role
        const participant = await (prisma as any).chatParticipant.findUnique({
          where: {
            roomId_userId: {
              roomId: roomIdInt,
              userId: userId
            }
          }
        })
        canClear = participant?.role === 'host'
      }
    }

    if (!canClear) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to clear this chat' },
        { status: 403 }
      )
    }

    // Soft delete all messages in the room
    await (prisma as any).chatMessage.updateMany({
      where: {
        roomId: roomIdInt,
        isDeleted: false
      },
      data: {
        isDeleted: true,
        content: '[삭제된 메시지]',
        attachmentUrl: null,
        fileName: null,
        fileSize: null
      }
    })

    // Update room's last activity and clear last message
    await (prisma as any).chatRoom.update({
      where: { id: roomIdInt },
      data: {
        lastMessageId: null,
        lastActivity: new Date()
      }
    })

    return NextResponse.json({ success: true, message: 'Chat cleared successfully' })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to clear chat' },
      { status: 500 }
    )
  }
}

