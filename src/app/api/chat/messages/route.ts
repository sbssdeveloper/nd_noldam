import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/utils/auth'
import { prisma } from '@/utils/prisma'

export async function GET(request: NextRequest) {
  try {
    // Auth check with better error logging
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Unauthorized: No token provided' }, { status: 401 })
    }

    const payload = await verifyToken(request)
    if (!payload || (!payload.uid && !payload.userId)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Invalid token' }, { status: 401 })
    }

    const userId = parseInt((payload.uid || payload.userId) as string)
    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ success: false, error: 'Invalid user' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const type = searchParams.get('type') // 'user' or 'group'
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before') // Message ID to fetch messages before

    if (!roomId || !type) {
      return NextResponse.json(
        { success: false, error: 'Room ID and type are required' },
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

    // Verify user is a participant in this room
    const participant = await prisma.chatParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId: roomIdInt,
          userId: userId
        }
      }
    })

    if (!participant || !participant.isActive) {
      return NextResponse.json(
        { success: false, error: 'Not a participant in this room' },
        { status: 403 }
      )
    }

    // Build query for messages
    const whereClause: any = {
      roomId: roomIdInt,
      isDeleted: false
    }

    // If 'before' is provided, fetch messages before that message
    if (before) {
      const beforeId = parseInt(before)
      if (!Number.isNaN(beforeId)) {
        whereClause.id = { lt: beforeId }
      }
    }

    // Fetch messages
    const messages = await prisma.chatMessage.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
            profileImage: true,
            lastLogin: true
          }
        },
        clubMeeting: {
          select: {
            id: true,
            meetingName: true,
            meetingBackground: true,
            meetingTime: true
          }
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                nickname: true,
                profileImage: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    // Get community ratings for all senders
    const senderIds = [...new Set(messages.map(m => m.senderId))]
    const communityRatings = await prisma.communityRating.findMany({
      where: {
        userId: { in: senderIds }
      }
    })

    const ratingMap = new Map(
      communityRatings.map(r => [r.userId, parseInt(r.level) || 1])
    )

    // Format messages
    const formattedMessages = await Promise.all(
      messages.reverse().map(async (msg) => {
        const senderLevel = ratingMap.get(msg.senderId) || 1

        const formatted: any = {
          id: String(msg.id),
          content: msg.content,
          type: msg.type as 'text' | 'image' | 'file' | 'club',
          sender: {
            id: String(msg.sender.id),
            nickname: msg.sender.nickname || 'Unknown',
            avatar: msg.sender.profileImage || '',
            isOnline: false, // TODO: Implement online status
            lastSeen: msg.sender.lastLogin?.toISOString() || new Date().toISOString(),
            level: senderLevel
          },
          timestamp: msg.createdAt.toISOString(),
          isRead: participant.lastReadAt ? participant.lastReadAt >= msg.createdAt : false
        }

        // Add attachment info for images/files
        if (msg.type === 'image' || msg.type === 'file') {
          formatted.attachmentUrl = msg.attachmentUrl || ''
          formatted.fileName = msg.fileName || ''
          formatted.fileSize = msg.fileSize || 0
        }

        // Add club meeting info for club link messages
        if (msg.type === 'club' && msg.clubMeeting) {
          formatted.clubMeeting = {
            id: String(msg.clubMeeting.id),
            name: msg.clubMeeting.meetingName,
            image: msg.clubMeeting.meetingBackground || '',
            meetingTime: msg.clubMeeting.meetingTime.toISOString()
          }
        }

        // Add reply info if this is a reply
        if (msg.replyToId && msg.replyTo) {
          const replySenderLevel = ratingMap.get(msg.replyTo.senderId) || 1
          formatted.replyTo = {
            id: String(msg.replyTo.id),
            content: msg.replyTo.content,
            sender: {
              id: String(msg.replyTo.sender.id),
              nickname: msg.replyTo.sender.nickname || 'Unknown',
              avatar: msg.replyTo.sender.profileImage || '',
              level: replySenderLevel
            }
          }
        }

        // Add thread count
        if (msg.threadCount > 0) {
          formatted.threadCount = msg.threadCount
        }

        return formatted
      })
    )

    // Update last read timestamp for this user
    await prisma.chatParticipant.update({
      where: {
        roomId_userId: {
          roomId: roomIdInt,
          userId: userId
        }
      },
      data: {
        lastReadAt: new Date()
      }
    })

    return NextResponse.json({ success: true, messages: formattedMessages })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { roomId, content, type, attachmentUrl, fileName, fileSize, clubMeetingId, replyToId } = body

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: 'Room ID is required' },
        { status: 400 }
      )
    }

    const roomIdInt = parseInt(String(roomId))
    if (Number.isNaN(roomIdInt)) {
      return NextResponse.json(
        { success: false, error: 'Invalid room ID' },
        { status: 400 }
      )
    }

    // Verify user is a participant
    const participant = await prisma.chatParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId: roomIdInt,
          userId: userId
        }
      },
      include: {
        room: {
          include: {
            participants: {
              where: {
                isActive: true,
                userId: { not: userId }
              },
              include: {
                user: {
                  select: {
                    id: true
                  }
                }
              },
              take: 1
            }
          }
        }
      }
    })

    if (!participant || !participant.isActive) {
      return NextResponse.json(
        { success: false, error: 'Not a participant in this room' },
        { status: 403 }
      )
    }

    // For individual chats, check if user is blocked
    if (participant.room.type === 'user' && participant.room.participants.length > 0) {
      const otherUserId = participant.room.participants[0].user.id
      
      // Check if either user has blocked the other
      const isBlocked = await (prisma as any).blockedUser.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: otherUserId },
            { blockerId: otherUserId, blockedId: userId }
          ]
        }
      })

      if (isBlocked) {
        return NextResponse.json(
          { success: false, error: 'Cannot send message to blocked user' },
          { status: 403 }
        )
      }
    }

    // Check if participant chat is allowed (for group chats)
    if (participant.room.type === 'group' && participant.role === 'participant' && !participant.room.allowParticipantChat) {
      return NextResponse.json(
        { success: false, error: 'Participant chat is not allowed in this room' },
        { status: 403 }
      )
    }

    // Create message
    const message = await prisma.chatMessage.create({
      data: {
        roomId: roomIdInt,
        senderId: userId,
        content: content || '',
        type: type || 'text',
        attachmentUrl: attachmentUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        clubMeetingId: clubMeetingId ? parseInt(String(clubMeetingId)) : null,
        replyToId: replyToId ? parseInt(String(replyToId)) : null
      },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
            profileImage: true,
            lastLogin: true
          }
        },
        clubMeeting: {
          select: {
            id: true,
            meetingName: true,
            meetingBackground: true,
            meetingTime: true
          }
        }
      }
    })

    // Reactivate any inactive participants in this room (they left but are receiving a new message)
    // This allows them to see the new message in their chat list
    await (prisma as any).chatParticipant.updateMany({
      where: {
        roomId: roomIdInt,
        userId: { not: userId }, // All participants except the sender
        isActive: false
      },
      data: {
        isActive: true
      }
    })

    // Update thread count if this is a reply
    if (replyToId) {
      await prisma.chatMessage.update({
        where: { id: parseInt(String(replyToId)) },
        data: {
          threadCount: {
            increment: 1
          }
        }
      })
    }

    // Update room's last activity and last message
    await prisma.chatRoom.update({
      where: { id: roomIdInt },
      data: {
        lastMessageId: message.id,
        lastActivity: new Date()
      }
    })

    // Get sender level
    const communityRating = await prisma.communityRating.findUnique({
      where: { userId: userId },
      select: { level: true }
    })

    const formattedMessage = {
      id: String(message.id),
      content: message.content,
      type: message.type as 'text' | 'image' | 'file' | 'club',
      sender: {
        id: String(message.sender.id),
        nickname: message.sender.nickname || 'Unknown',
        avatar: message.sender.profileImage || '',
        isOnline: false,
        lastSeen: message.sender.lastLogin?.toISOString() || new Date().toISOString(),
        level: communityRating ? parseInt(communityRating.level) || 1 : 1
      },
      timestamp: message.createdAt.toISOString(),
      isRead: false
    }

    if (message.attachmentUrl) {
      (formattedMessage as any).attachmentUrl = message.attachmentUrl
      (formattedMessage as any).fileName = message.fileName
      (formattedMessage as any).fileSize = message.fileSize
    }

    if (message.clubMeeting) {
      (formattedMessage as any).clubMeeting = {
        id: String(message.clubMeeting.id),
        name: message.clubMeeting.meetingName,
        image: message.clubMeeting.meetingBackground || '',
        meetingTime: message.clubMeeting.meetingTime.toISOString()
      }
    }

    if (replyToId) {
      (formattedMessage as any).replyToId = String(replyToId)
    }

    // CRITICAL FIX: Broadcast message via socket for real-time updates
    // This ensures messages sent via HTTP also trigger socket events
    try {
      const { getSocketServer } = await import('@/lib/socket-server')
      const io = getSocketServer()
      
      if (io) {
        // Get all participants in this room (including inactive ones that were just reactivated)
        const allParticipants = await prisma.chatParticipant.findMany({
          where: {
            roomId: roomIdInt,
            isActive: true
          },
          select: {
            userId: true
          }
        })

        // Ensure all participants are in the socket room
        // This handles cases where new rooms are created or participants were inactive
        allParticipants.forEach((participant) => {
          // Force join all participants to the room
          io.sockets.sockets.forEach((socket: any) => {
            if (socket.data.userId === participant.userId) {
              socket.join(`room:${roomIdInt}`)
            }
          })
        })

        // Broadcast new message to all OTHER users in the room (not sender)
        // Find sender's socket and exclude them
        const senderSockets = new Set<number>()
        io.sockets.sockets.forEach((socket: any) => {
          if (socket.data.userId === userId) {
            senderSockets.add(socket.id)
          }
        })
        
        // Emit to all sockets in room except sender
        io.to(`room:${roomIdInt}`).except(Array.from(senderSockets)).emit('message:new', {
          ...formattedMessage,
          roomId: String(roomIdInt)
        })
        
        // Send confirmation to sender only
        senderSockets.forEach((socketId) => {
          const senderSocket = io.sockets.sockets.get(socketId)
          if (senderSocket) {
            senderSocket.emit('message:sent', {
              ...formattedMessage,
              roomId: String(roomIdInt),
              tempId: undefined
            })
          }
        })

        // Notify all participants (including sender) that room activity was updated
        io.to(`room:${roomIdInt}`).emit('room:updated', {
          roomId: String(roomIdInt),
          lastMessage: formattedMessage,
          lastActivity: new Date().toISOString(),
          senderId: String(userId)
        })
      }
    } catch (socketError) {
      // Log error but don't fail the request
      console.error('Socket broadcast error:', socketError)
    }

    return NextResponse.json({ success: true, message: formattedMessage })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create message' },
      { status: 500 }
    )
  }
}
