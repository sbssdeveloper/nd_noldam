import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { jwtVerify } from 'jose'
import { prisma } from '@/utils/prisma'

let io: SocketIOServer | null = null

export function initializeSocketServer(httpServer: HTTPServer) {
  if (io) {
    return io
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/api/socket'
  })

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '')
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'))
      }

      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments')
      const { payload } = await jwtVerify(token, secret)
      
      const userId = parseInt((payload.uid || payload.userId) as string)
      
      if (!userId || Number.isNaN(userId)) {
        return next(new Error('Authentication error: Invalid token'))
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return next(new Error('Authentication error: User not found'))
      }

      // Store user ID in socket data
      socket.data.userId = userId
      next()
    } catch (error) {
      next(new Error('Authentication error'))
    }
  })

  io.on('connection', async (socket) => {
    const userId = socket.data.userId

    // Join rooms where user is a participant
    const userRooms = await (prisma as any).chatParticipant.findMany({
      where: {
        userId: userId,
        isActive: true
      },
      select: {
        roomId: true
      }
    })

    userRooms.forEach((room: { roomId: number }) => {
      socket.join(`room:${room.roomId}`)
    })

    // Handle explicit join/leave requests
    socket.on('join', async (data: { roomId: string | number }) => {
      const roomId = parseInt(String(data.roomId))
      if (!isNaN(roomId)) {
        // Verify user is a participant before joining
        const participant = await (prisma as any).chatParticipant.findUnique({
          where: {
            roomId_userId: {
              roomId: roomId,
              userId: userId
            }
          }
        })
        
        if (participant && participant.isActive) {
          socket.join(`room:${roomId}`)
        }
      }
    })

    socket.on('leave', (data: { roomId: string | number }) => {
      const roomId = parseInt(String(data.roomId))
      if (!isNaN(roomId)) {
        socket.leave(`room:${roomId}`)
      }
    })

    // Handle new message
    socket.on('message:send', async (data) => {
      try {
        const { roomId, content, type, attachmentUrl, fileName, fileSize, clubMeetingId, replyToId, tempId } = data

        if (!roomId) {
          socket.emit('error', { message: 'Room ID is required' })
          return
        }

        const roomIdInt = parseInt(String(roomId))

        // Verify user is a participant
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

        if (!participant || !participant.isActive) {
          socket.emit('error', { message: 'Not a participant in this room' })
          return
        }

        // Check participant chat permissions
        if (participant.room.type === 'group' && participant.role === 'participant' && !participant.room.allowParticipantChat) {
          socket.emit('error', { message: 'Participant chat is not allowed' })
          return
        }

        // For individual chats, check if user is blocked
        if (participant.room.type === 'user') {
          // Get the other participant
          const otherParticipant = await (prisma as any).chatParticipant.findFirst({
            where: {
              roomId: roomIdInt,
              userId: { not: userId },
              isActive: true
            },
            include: {
              user: {
                select: {
                  id: true
                }
              }
            }
          })

          if (otherParticipant) {
            const otherUserId = otherParticipant.user.id
            
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
              socket.emit('error', { message: 'Cannot send message to blocked user' })
              return
            }
          }
        }

        // Create message
        const message = await (prisma as any).chatMessage.create({
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

        // Update thread count if reply
        if (replyToId) {
          await (prisma as any).chatMessage.update({
            where: { id: parseInt(String(replyToId)) },
            data: {
              threadCount: { increment: 1 }
            }
          })
        }

        // Update room activity
        await (prisma as any).chatRoom.update({
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

        // Format message
        const formattedMessage: any = {
          id: String(message.id),
          content: message.content,
          type: message.type,
          sender: {
            id: String(message.sender.id),
            nickname: message.sender.nickname || 'Unknown',
            avatar: message.sender.profileImage || '',
            isOnline: true,
            lastSeen: message.sender.lastLogin?.toISOString() || new Date().toISOString(),
            level: communityRating ? parseInt(communityRating.level) || 1 : 1
          },
          timestamp: message.createdAt.toISOString(),
          isRead: false
        }

        if (message.attachmentUrl) {
          formattedMessage.attachmentUrl = message.attachmentUrl
          formattedMessage.fileName = message.fileName
          formattedMessage.fileSize = message.fileSize
        }

        if (message.clubMeeting) {
          formattedMessage.clubMeeting = {
            id: String(message.clubMeeting.id),
            name: message.clubMeeting.meetingName,
            image: message.clubMeeting.meetingBackground || '',
            meetingTime: message.clubMeeting.meetingTime.toISOString()
          }
        }

        if (replyToId) {
          formattedMessage.replyToId = String(replyToId)
        }

        // Send confirmation to sender only (they already have optimistic update)
        // Include tempId to help client match the optimistic message
        socket.emit('message:sent', {
          ...formattedMessage,
          roomId: String(roomIdInt),
          tempId: tempId || undefined // Echo tempId back so client can reconcile optimistic update
        })
        
        // CRITICAL FIX: Broadcast to ALL participants, ensuring they're in the room first
        // Get all active participants to ensure they're in the socket room
        const allParticipants = await (prisma as any).chatParticipant.findMany({
          where: {
            roomId: roomIdInt,
            isActive: true
          },
          select: {
            userId: true
          }
        })

        // Ensure all participants are in the socket room
        const socketIO = io
        if (socketIO && socketIO.sockets) {
          allParticipants.forEach((participant: { userId: number }) => {
            socketIO.sockets.sockets.forEach((socket: any) => {
              if (socket.data.userId === participant.userId) {
                socket.join(`room:${roomIdInt}`)
              }
            })
          })
        }

        // Broadcast new message to all OTHER users in the room (not sender)
        // socket.to() automatically excludes the sender
        socket.to(`room:${roomIdInt}`).emit('message:new', {
          ...formattedMessage,
          roomId: String(roomIdInt)
        })

        // Notify all participants (including sender) that room activity was updated
        if (io) {
          io.to(`room:${roomIdInt}`).emit('room:updated', {
            roomId: String(roomIdInt),
            lastMessage: formattedMessage,
            lastActivity: new Date().toISOString(),
            senderId: String(userId)
          })
        }

      } catch (error: any) {
        socket.emit('error', { message: error?.message || 'Failed to send message' })
      }
    })

    // Handle typing indicator
    socket.on('typing:start', async (data) => {
      const { roomId } = data
      if (roomId) {
        socket.to(`room:${roomId}`).emit('typing:start', {
          roomId,
          userId: userId
        })
      }
    })

    socket.on('typing:stop', async (data) => {
      const { roomId } = data
      if (roomId) {
        socket.to(`room:${roomId}`).emit('typing:stop', {
          roomId,
          userId: userId
        })
      }
    })

    // Handle read receipt
    socket.on('message:read', async (data) => {
      try {
        const { roomId } = data
        const roomIdInt = parseInt(String(roomId))

        await (prisma as any).chatParticipant.update({
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

        // Notify others in room
        socket.to(`room:${roomIdInt}`).emit('message:read', {
          roomId: roomIdInt,
          userId: userId
        })

      } catch (error) {
      }
    })

    // Handle disconnect
    socket.on('disconnect', () => {
    })
  })

  return io
}

export function getSocketServer(): SocketIOServer | null {
  return io
}

