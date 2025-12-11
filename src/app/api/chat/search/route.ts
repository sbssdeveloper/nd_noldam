import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/utils/auth'
import { prisma } from '@/utils/prisma'

export async function GET(request: NextRequest) {
  try {
    // Auth check
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
    const query = searchParams.get('q') || ''
    const roomId = searchParams.get('roomId') // Optional: search within specific room
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const searchType = searchParams.get('type') || 'all' // 'all', 'messages', 'chats'

    // If query is empty and no roomId, return recent/default results
    if (!query.trim() && !roomId) {
      return getDefaultSearchResults(userId, limit)
    }

    // If roomId is provided, search only within that room
    if (roomId) {
      const roomIdInt = parseInt(roomId)
      if (Number.isNaN(roomIdInt)) {
        return NextResponse.json({ success: false, error: 'Invalid room ID' }, { status: 400 })
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
              meeting: {
                select: {
                  id: true,
                  meetingName: true,
                  meetingBackground: true
                }
              }
            }
          }
        }
      })

      if (!participant || !participant.isActive) {
        return NextResponse.json({ success: false, error: 'Not a participant in this room' }, { status: 403 })
      }

      // Search messages within this room
      const messages = await searchMessagesInRoom(roomIdInt, query, userId, limit, offset)
      
      return NextResponse.json({
        success: true,
        messages,
        chats: [] // No chats when searching within a room
      })
    }

    // Search across all user's chats
    const results = await searchAcrossAllChats(userId, query, limit, offset, searchType)
    
    return NextResponse.json({
      success: true,
      ...results
    })

  } catch (error: any) {
    console.error('Chat search error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to search chats' },
      { status: 500 }
    )
  }
}

// Search messages within a specific room
async function searchMessagesInRoom(
  roomId: number,
  query: string,
  userId: number,
  limit: number,
  offset: number
) {
  const whereClause: any = {
    roomId,
    isDeleted: false
  }

  if (query.trim()) {
    whereClause.content = {
      contains: query,
      mode: 'insensitive'
    }
  }

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
      room: {
        include: {
          meeting: {
            select: {
              id: true,
              meetingName: true,
              meetingBackground: true
            }
          },
          participants: {
            where: { isActive: true },
            include: {
              user: {
                select: {
                  id: true,
                  nickname: true,
                  profileImage: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    skip: offset
  })

  // Get community ratings for senders
  const senderIds = [...new Set(messages.map(m => m.senderId))]
  const communityRatings = await prisma.communityRating.findMany({
    where: { userId: { in: senderIds } }
  })
  const ratingMap = new Map(
    communityRatings.map(r => [r.userId, parseInt(r.level) || 1])
  )

  return messages.map(msg => {
    const senderLevel = ratingMap.get(msg.senderId) || 1
    const room = msg.room
    const isGroupChat = room.type === 'group'
    
    // Get room name/display info
    let roomName = ''
    let roomType: 'user' | 'club' = 'user'
    let participants = 0

    if (isGroupChat) {
      roomName = room.name || room.meeting?.meetingName || 'Group Chat'
      roomType = 'club'
      participants = room.participants.length
    } else {
      const otherUser = room.participants.find(p => p.userId !== userId)?.user
      roomName = otherUser?.nickname || 'Unknown User'
      roomType = 'user'
      participants = 0
    }

    // Extract preview text (first 100 chars)
    const preview = msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content

    return {
      id: String(msg.id),
      sender: roomName,
      type: roomType,
      participants: participants > 0 ? participants : undefined,
      preview,
      timestamp: formatTimestamp(msg.createdAt),
      highlightedText: query.trim() || undefined,
      roomId: String(room.id),
      messageId: String(msg.id)
    }
  })
}

// Search across all user's chats
async function searchAcrossAllChats(
  userId: number,
  query: string,
  limit: number,
  offset: number,
  searchType: string
) {
  // Get all rooms where user is a participant
  const participants = await prisma.chatParticipant.findMany({
    where: {
      userId,
      isActive: true
    },
    include: {
      room: {
        include: {
          meeting: {
            select: {
              id: true,
              meetingName: true,
              meetingBackground: true
            }
          },
          participants: {
            where: { isActive: true },
            include: {
              user: {
                select: {
                  id: true,
                  nickname: true,
                  profileImage: true
                }
              }
            }
          }
        }
      }
    }
  })

  const roomIds = participants.map(p => p.room.id)

  const messages: any[] = []
  const chats: any[] = []

  // Search messages if needed
  if (searchType === 'all' || searchType === 'messages') {
    const messageWhere: any = {
      roomId: { in: roomIds },
      isDeleted: false
    }

    if (query.trim()) {
      messageWhere.content = {
        contains: query,
        mode: 'insensitive'
      }
    }

    const foundMessages = await prisma.chatMessage.findMany({
      where: messageWhere,
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
            profileImage: true
          }
        },
        room: {
          include: {
            meeting: {
              select: {
                id: true,
                meetingName: true,
                meetingBackground: true
              }
            },
            participants: {
              where: { isActive: true },
              include: {
                user: {
                  select: {
                    id: true,
                    nickname: true,
                    profileImage: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Get community ratings
    const senderIds = [...new Set(foundMessages.map(m => m.senderId))]
    const communityRatings = await prisma.communityRating.findMany({
      where: { userId: { in: senderIds } }
    })
    const ratingMap = new Map(
      communityRatings.map(r => [r.userId, parseInt(r.level) || 1])
    )

    // Format messages
    foundMessages.forEach(msg => {
      const room = msg.room
      const isGroupChat = room.type === 'group'
      
      let roomName = ''
      let roomType: 'user' | 'club' = 'user'
      let participants = 0

      if (isGroupChat) {
        roomName = room.name || room.meeting?.meetingName || 'Group Chat'
        roomType = 'club'
        participants = room.participants.length
      } else {
        const otherUser = room.participants.find(p => p.userId !== userId)?.user
        roomName = otherUser?.nickname || 'Unknown User'
        roomType = 'user'
      }

      const preview = msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content

      messages.push({
        id: String(msg.id),
        sender: roomName,
        type: roomType,
        participants: participants > 0 ? participants : undefined,
        preview,
        timestamp: formatTimestamp(msg.createdAt),
        highlightedText: query.trim() || undefined,
        roomId: String(room.id),
        messageId: String(msg.id)
      })
    })
  }

  // Search chats/rooms if needed
  if (searchType === 'all' || searchType === 'chats') {
    const rooms = participants.map(p => p.room)
    const roomIds = rooms.map(r => r.id)
    
    // Filter rooms by query if provided
    let filteredRooms = query.trim()
      ? rooms.filter(room => {
          if (room.type === 'group') {
            const name = room.name || room.meeting?.meetingName || ''
            return name.toLowerCase().includes(query.toLowerCase())
          } else {
            const otherUser = room.participants.find(p => p.userId !== userId)?.user
            const nickname = otherUser?.nickname || ''
            return nickname.toLowerCase().includes(query.toLowerCase())
          }
        })
      : rooms

    // If query is provided, also include rooms that have messages matching the query
    const matchingMessageRoomsMap = new Map<number, any>()
    if (query.trim() && roomIds.length > 0) {
      const matchingMessageRooms = await prisma.chatMessage.findMany({
        where: {
          roomId: { in: roomIds },
          content: {
            contains: query,
            mode: 'insensitive'
          },
          isDeleted: false
        },
        include: {
          sender: {
            select: {
              id: true,
              nickname: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        distinct: ['roomId']
      })

      // Map roomId to the matching message
      matchingMessageRooms.forEach(msg => {
        if (!matchingMessageRoomsMap.has(msg.roomId)) {
          matchingMessageRoomsMap.set(msg.roomId, msg)
        }
      })

      const matchingRoomIds = new Set(matchingMessageRooms.map(m => m.roomId))
      
      // Add rooms that have matching messages but weren't already in filteredRooms
      rooms.forEach(room => {
        if (matchingRoomIds.has(room.id)) {
          const alreadyIncluded = filteredRooms.some(r => r.id === room.id)
          if (!alreadyIncluded) {
            filteredRooms.push(room)
          }
        }
      })
    }

    // Get last messages for preview (for rooms that don't have matching messages)
    const roomIdsForPreview = filteredRooms.map(r => r.id)
    const lastMessages = await prisma.chatMessage.findMany({
      where: {
        roomId: { in: roomIdsForPreview },
        isDeleted: false
      },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      distinct: ['roomId']
    })

    const lastMessageMap = new Map(
      lastMessages.map(m => [m.roomId, m])
    )

    filteredRooms.forEach(room => {
      const isGroupChat = room.type === 'group'
      let roomName = ''
      let roomType: 'user' | 'club' = 'user'
      let participants = 0

      if (isGroupChat) {
        roomName = room.name || room.meeting?.meetingName || 'Group Chat'
        roomType = 'club'
        participants = room.participants.length
      } else {
        const otherUser = room.participants.find(p => p.userId !== userId)?.user
        roomName = otherUser?.nickname || 'Unknown User'
        roomType = 'user'
      }

      // Prefer matching message if available, otherwise use last message
      const matchingMsg = matchingMessageRoomsMap.get(room.id)
      const lastMsg = lastMessageMap.get(room.id)
      const previewMsg = matchingMsg || lastMsg
      
      const preview = previewMsg 
        ? (previewMsg.content.length > 50 ? previewMsg.content.substring(0, 50) + '...' : previewMsg.content)
        : 'No messages yet'

      chats.push({
        id: String(room.id),
        name: roomName,
        type: roomType,
        participants: participants > 0 ? participants : undefined,
        preview,
        timestamp: lastMsg ? formatTimestamp(lastMsg.createdAt) : formatTimestamp(room.createdAt),
        highlightedText: query.trim() || undefined,
        roomId: String(room.id)
      })
    })

    // Sort chats by last activity
    chats.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  return {
    messages: messages.slice(0, limit),
    chats: chats.slice(0, limit)
  }
}

// Get default/recent search results when no query
async function getDefaultSearchResults(userId: number, limit: number) {
  const participants = await prisma.chatParticipant.findMany({
    where: {
      userId,
      isActive: true
    },
    include: {
      room: {
        include: {
          meeting: {
            select: {
              id: true,
              meetingName: true,
              meetingBackground: true
            }
          },
          participants: {
            where: { isActive: true },
            include: {
              user: {
                select: {
                  id: true,
                  nickname: true,
                  profileImage: true
                }
              }
            }
          },
          messages: {
            where: { isDeleted: false },
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: {
                select: {
                  id: true,
                  nickname: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: {
      room: {
        lastActivity: 'desc'
      }
    },
    take: limit
  })

  const messages: any[] = []
  const chats: any[] = []

  participants.forEach(participant => {
    const room = participant.room
    const isGroupChat = room.type === 'group'
    
    let roomName = ''
    let roomType: 'user' | 'club' = 'user'
    let participants = 0

    if (isGroupChat) {
      roomName = room.name || room.meeting?.meetingName || 'Group Chat'
      roomType = 'club'
      participants = room.participants.length
    } else {
      const otherUser = room.participants.find(p => p.userId !== userId)?.user
      roomName = otherUser?.nickname || 'Unknown User'
      roomType = 'user'
    }

    const lastMsg = room.messages[0]
    if (lastMsg) {
      const preview = lastMsg.content.length > 100 ? lastMsg.content.substring(0, 100) + '...' : lastMsg.content
      messages.push({
        id: String(lastMsg.id),
        sender: roomName,
        type: roomType,
        participants: participants > 0 ? participants : undefined,
        preview,
        timestamp: formatTimestamp(lastMsg.createdAt),
        roomId: String(room.id),
        messageId: String(lastMsg.id)
      })
    }

    const preview = lastMsg 
      ? (lastMsg.content.length > 50 ? lastMsg.content.substring(0, 50) + '...' : lastMsg.content)
      : 'No messages yet'

    chats.push({
      id: String(room.id),
      name: roomName,
      type: roomType,
      participants: participants > 0 ? participants : undefined,
      preview,
      timestamp: lastMsg ? formatTimestamp(lastMsg.createdAt) : formatTimestamp(room.createdAt),
      roomId: String(room.id)
    })
  })

  return NextResponse.json({
    success: true,
    messages: messages.slice(0, limit),
    chats: chats.slice(0, limit)
  })
}

// Format timestamp to Korean format
function formatTimestamp(date: Date): string {
  const now = new Date()
  const msgDate = new Date(date)
  const diffMs = now.getTime() - msgDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return '오늘'
  } else if (diffDays === 1) {
    return '어제'
  } else if (diffDays < 7) {
    return `${diffDays}일 전`
  } else {
    return msgDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  }
}

