import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/utils/auth'
import { prisma } from '@/utils/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
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

    const { roomId } = await params
    const roomIdInt = parseInt(roomId)
    
    if (Number.isNaN(roomIdInt)) {
      return NextResponse.json(
        { success: false, error: 'Invalid room ID' },
        { status: 400 }
      )
    }

    // Find the participant
    const participant = await (prisma as any).chatParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId: roomIdInt,
          userId: userId
        }
      },
      include: {
        room: true
      }
    })

    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'Not a participant in this room' },
        { status: 404 }
      )
    }

    // Set isActive to false (this will hide the chat from the rooms list)
    await (prisma as any).chatParticipant.update({
      where: {
        roomId_userId: {
          roomId: roomIdInt,
          userId: userId
        }
      },
      data: {
        isActive: false
      }
    })

    return NextResponse.json({ success: true, message: 'Left chat successfully' })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to leave chat' },
      { status: 500 }
    )
  }
}

