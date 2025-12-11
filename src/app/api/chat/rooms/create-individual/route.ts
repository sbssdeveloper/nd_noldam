import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/utils/auth'
import { prisma } from '@/utils/prisma'

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const payload = await verifyToken(request)
    if (!payload || (!payload.uid && !payload.userId)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const currentUserId = parseInt((payload.uid || payload.userId) as string)
    if (!currentUserId || Number.isNaN(currentUserId)) {
      return NextResponse.json({ success: false, error: 'Invalid user' }, { status: 401 })
    }

    const body = await request.json()
    const { otherUserId } = body

    if (!otherUserId) {
      return NextResponse.json(
        { success: false, error: 'otherUserId is required' },
        { status: 400 }
      )
    }

    // Convert to number, handling both string and number inputs
    const targetUserId = typeof otherUserId === 'string' 
      ? parseInt(otherUserId, 10) 
      : typeof otherUserId === 'number' 
        ? otherUserId 
        : parseInt(String(otherUserId), 10)

    // Validate targetUserId
    if (Number.isNaN(targetUserId) || targetUserId <= 0) {
      return NextResponse.json(
        { success: false, error: `Invalid target user ID: ${otherUserId}. Must be a positive number.` },
        { status: 400 }
      )
    }

    // Check if trying to chat with yourself
    if (targetUserId === currentUserId) {
      return NextResponse.json(
        { success: false, error: 'Cannot create chat with yourself' },
        { status: 400 }
      )
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    })

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Target user not found' },
        { status: 404 }
      )
    }

    // Note: We allow creating/finding chat rooms even if blocked
    // The chat will be visible but messaging will be disabled (like WhatsApp)
    // Block check happens at message send time, not at room creation time

    // Find existing individual chat room between these two users
    // For individual chats, we need to find rooms where:
    // 1. type = 'user'
    // 2. Both users are active participants
    const existingRooms = await (prisma as any).chatRoom.findMany({
      where: {
        type: 'user',
        meetingId: null,
        participants: {
          some: {
            userId: currentUserId,
            isActive: true
          }
        }
      },
      include: {
        participants: {
          where: {
            isActive: true
          }
        }
      }
    })

    // Find room that has exactly 2 participants (current user + target user)
    const existingRoom = existingRooms.find((room: any) => {
      const participantIds = room.participants.map((p: any) => p.userId)
      return participantIds.length === 2 &&
        participantIds.includes(currentUserId) &&
        participantIds.includes(targetUserId)
    })

    if (existingRoom) {
      // Room exists, return it
      const roomData = {
        id: String(existingRoom.id),
        type: 'user' as const,
        user: {
          id: String(targetUserId),
          nickname: targetUser.nickname || 'Unknown',
          avatar: targetUser.profileImage || '',
          isOnline: false, // TODO: Implement online status
          lastSeen: targetUser.lastLogin?.toISOString() || new Date().toISOString(),
          level: 1 // TODO: Get actual level from CommunityRating
        },
        lastMessage: null,
        unreadCount: 0,
        lastActivity: existingRoom.lastActivity.toISOString(),
        isActive: existingRoom.isActive
      }

      return NextResponse.json({ success: true, room: roomData })
    }

    // Create new individual chat room
    const newRoom = await (prisma as any).chatRoom.create({
      data: {
        type: 'user',
        meetingId: null,
        createdBy: currentUserId,
        allowParticipantChat: true,
        lastActivity: new Date()
      }
    })

    // Add both users as participants
    await (prisma as any).chatParticipant.createMany({
      data: [
        {
          roomId: newRoom.id,
          userId: currentUserId,
          role: 'participant',
          joinedAt: new Date(),
          isActive: true
        },
        {
          roomId: newRoom.id,
          userId: targetUserId,
          role: 'participant',
          joinedAt: new Date(),
          isActive: true
        }
      ]
    })

    const roomData = {
      id: String(newRoom.id),
      type: 'user' as const,
      user: {
        id: String(targetUserId),
        nickname: targetUser.nickname || 'Unknown',
        avatar: targetUser.profileImage || '',
        isOnline: false,
        lastSeen: targetUser.lastLogin?.toISOString() || new Date().toISOString(),
        level: 1
      },
      lastMessage: null,
      unreadCount: 0,
      lastActivity: newRoom.lastActivity.toISOString(),
      isActive: newRoom.isActive
    }

    // CRITICAL FIX: Ensure both users join the socket room when a new room is created
    // This ensures real-time notifications work for new chats
    try {
      const { getSocketServer } = await import('@/lib/socket-server')
      const io = getSocketServer()
      
      if (io) {
        // Force both users to join the new room
        [currentUserId, targetUserId].forEach((userId) => {
          io.sockets.sockets.forEach((socket: any) => {
            if (socket.data.userId === userId) {
              socket.join(`room:${newRoom.id}`)
            }
          })
        })
      }
    } catch (socketError) {
      // Log error but don't fail the request
      console.error('Socket room join error:', socketError)
    }

    return NextResponse.json({ success: true, room: roomData })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create chat room' },
      { status: 500 }
    )
  }
}

