import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { jwtVerify } from 'jose'
import { prisma } from '@/utils/prisma'

let io: SocketIOServer | null = null

export function initializeSocketServer(httpServer: HTTPServer) {
  if (io) {
    return io
  }

  // Get allowed origins for CORS
  // Support both NEXT_PUBLIC_APP_URL and NEXT_PUBLIC_SITE_URL
  // Dynamically allow both localhost (development) and production URLs
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL
  
  // Dynamic CORS origin checker - allows both localhost:3010 and production
  const corsOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true)
    }
    
    // Allow localhost:3010 specifically for development
    if (origin === 'http://localhost:3010' || origin === 'http://127.0.0.1:3010') {
      return callback(null, true)
    }
    
    // Allow other localhost ports for flexibility (development)
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true)
    }
    
    // Allow production URL from environment variable
    if (appUrl && origin === appUrl) {
      return callback(null, true)
    }
    
    // Allow all if no app URL is set (development mode)
    if (!appUrl) {
      return callback(null, true)
    }
    
    // Reject other origins
    callback(new Error('Not allowed by CORS'))
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
      // Allow all headers for production compatibility
      allowedHeaders: ['Authorization', 'Content-Type']
    },
    path: '/api/socket',
    // Increased timeout configurations for production (network latency, load balancers, etc.)
    connectTimeout: 45000, // 45 seconds - increased for production
    pingTimeout: 45000, // 45 seconds - how long to wait for pong
    pingInterval: 20000, // 20 seconds - how often to ping clients (less frequent for production)
    // Allow more time for authentication middleware
    allowEIO3: true,
    // Increase max HTTP buffer size for large messages
    maxHttpBufferSize: 1e8, // 100MB
    // Support both transports for maximum compatibility
    // Polling first for production (more reliable through proxies/load balancers)
    transports: ['polling', 'websocket'],
    // Upgrade timeout for transport upgrades
    upgradeTimeout: 15000, // Increased for production
    // Additional production settings
    allowRequest: (req, callback) => {
      // Allow all requests (CORS is handled above)
      callback(null, true)
    }
  })

  // Authentication middleware
  io.use(async (socket, next) => {
    const origin = socket.handshake.headers.origin
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '')
    
    try {
      if (!token) {
        console.error('[Socket] ❌ No token provided')
        return next(new Error('Authentication error: No token provided'))
      }

      // Set a timeout for authentication to prevent hanging
      let authTimeout: NodeJS.Timeout | null = null
      let authCompleted = false

      const timeoutPromise = new Promise<void>((_, reject) => {
        authTimeout = setTimeout(() => {
          if (!authCompleted) {
            authCompleted = true
            reject(new Error('Authentication timeout: Server took too long to respond'))
          }
        }, 30000) // 30 second timeout for auth
      })

      try {
        const authPromise = (async () => {
          const jwtSecret = process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments'
          const secret = new TextEncoder().encode(jwtSecret)
          
          let payload: any
          try {
            const result = await jwtVerify(token, secret)
            payload = result.payload
          } catch (jwtError: any) {
            console.error('[Socket] ❌ JWT verification failed:', {
              error: jwtError.message,
              code: jwtError.code,
              name: jwtError.name
            })
            throw new Error(`JWT verification failed: ${jwtError.message}`)
          }
          
          const userId = parseInt((payload.uid || payload.userId) as string)
          
          if (!userId || Number.isNaN(userId)) {
            console.error('[Socket] ❌ Invalid user ID from token:', { uid: payload.uid, userId: payload.userId, parsed: userId })
            throw new Error('Authentication error: Invalid user ID in token')
          }

          // Verify user exists
          let user
          try {
            user = await prisma.user.findUnique({
              where: { id: userId }
            })
          } catch (dbError: any) {
            console.error('[Socket] ❌ Database error:', dbError.message)
            throw new Error(`Database error: ${dbError.message}`)
          }

          if (!user) {
            console.error('[Socket] ❌ User not found in database:', userId)
            throw new Error(`Authentication error: User ${userId} not found`)
          }

          // Store user ID in socket data
          socket.data.userId = userId
          return true
        })()

        // Race between auth and timeout
        await Promise.race([authPromise, timeoutPromise])
        
        if (authTimeout) {
          clearTimeout(authTimeout)
        }
        authCompleted = true
        next()
      } catch (error: any) {
        if (authTimeout) {
          clearTimeout(authTimeout)
        }
        authCompleted = true
        const errorMessage = error?.message || 'Authentication error'
        console.error('[Socket] ❌ Authentication failed:', {
          message: errorMessage,
          origin,
          hasToken: !!token
        })
        // Return specific error message instead of generic "server error"
        next(new Error(errorMessage))
      }
    } catch (error: any) {
      console.error('[Socket] ❌ Authentication middleware error:', {
        message: error?.message || error,
        stack: error?.stack,
        origin
      })
      next(new Error(error?.message || 'Authentication error'))
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

