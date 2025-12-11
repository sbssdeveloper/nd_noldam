import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/utils/auth'
import { prisma } from '@/utils/prisma'

export async function GET(
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

    // Verify user is a participant
    const participant = await (prisma as any).chatParticipant.findUnique({
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
            },
            participants: {
              where: {
                isActive: true
              },
              include: {
                user: {
                  select: {
                    id: true,
                    nickname: true,
                    profileImage: true,
                    lastLogin: true
                  }
                }
              }
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

    const room = participant.room
    const isGroupChat = room.type === 'group'

    // For individual chats, find the other user
    let otherUser = null
    if (!isGroupChat) {
      const otherParticipant = room.participants.find((p: any) => p.userId !== userId)
      if (otherParticipant) {
        const user = otherParticipant.user
        // Check if user is blocked
        const isBlocked = await (prisma as any).blockedUser.findFirst({
          where: {
            OR: [
              { blockerId: userId, blockedId: user.id },
              { blockerId: user.id, blockedId: userId }
            ]
          }
        })

        if (!isBlocked) {
          // Get community rating level
          const communityRating = await prisma.communityRating.findUnique({
            where: { userId: user.id },
            select: { level: true }
          })

          otherUser = {
            id: String(user.id),
            nickname: user.nickname || 'Unknown',
            avatar: user.profileImage || '',
            isOnline: false,
            lastSeen: user.lastLogin?.toISOString() || new Date().toISOString(),
            level: communityRating ? parseInt(communityRating.level) || 1 : 1
          }
        }
      }
    }

    // Get last message
    const lastMessage = await (prisma as any).chatMessage.findFirst({
      where: {
        roomId: roomIdInt,
        isDeleted: false
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
            profileImage: true,
            lastLogin: true
          }
        }
      }
    })

    let formattedLastMessage = null
    if (lastMessage) {
      const senderCommunityRating = await prisma.communityRating.findUnique({
        where: { userId: lastMessage.sender.id },
        select: { level: true }
      })

      formattedLastMessage = {
        id: String(lastMessage.id),
        content: lastMessage.content,
        type: lastMessage.type,
        sender: {
          id: String(lastMessage.sender.id),
          nickname: lastMessage.sender.nickname || 'Unknown',
          avatar: lastMessage.sender.profileImage || '',
          isOnline: false,
          lastSeen: lastMessage.sender.lastLogin?.toISOString() || new Date().toISOString(),
          level: senderCommunityRating ? parseInt(senderCommunityRating.level) || 1 : 1
        },
        timestamp: lastMessage.createdAt.toISOString(),
        isRead: participant.lastReadAt ? participant.lastReadAt >= lastMessage.createdAt : false
      }
    }

    // Calculate unread count
    const unreadCount = participant.lastReadAt
      ? await (prisma as any).chatMessage.count({
          where: {
            roomId: roomIdInt,
            senderId: { not: userId },
            createdAt: { gt: participant.lastReadAt },
            isDeleted: false
          }
        })
      : await (prisma as any).chatMessage.count({
          where: {
            roomId: roomIdInt,
            senderId: { not: userId },
            isDeleted: false
          }
        })

    if (isGroupChat) {
      return NextResponse.json({
        success: true,
        room: {
          id: String(room.id),
          meetingId: room.meetingId ? String(room.meetingId) : null,
          type: 'group' as const,
          group: {
            id: String(room.id),
            name: room.name || room.meeting?.meetingName || 'Group Chat',
            avatar: room.avatar || room.meeting?.meetingBackground || '',
            isHost: participant.role === 'host',
            meetingId: room.meetingId ? String(room.meetingId) : null,
            meetingName: room.meeting?.meetingName || null,
            meetingBackground: room.meeting?.meetingBackground || null,
            allowParticipantChat: room.allowParticipantChat,
            members: room.participants.map((p: any) => ({
              id: String(p.user.id),
              nickname: p.user.nickname || 'Unknown',
              avatar: p.user.profileImage || '',
              isOnline: false,
              lastSeen: p.user.lastLogin?.toISOString() || new Date().toISOString(),
              level: 1
            })),
            createdAt: room.createdAt.toISOString()
          },
          lastMessage: formattedLastMessage,
          unreadCount,
          lastActivity: room.lastActivity.toISOString(),
          isActive: room.isActive
        }
      })
    } else {
      if (!otherUser) {
        return NextResponse.json(
          { success: false, error: 'Cannot access chat with blocked user' },
          { status: 403 }
        )
      }

      return NextResponse.json({
        success: true,
        room: {
          id: String(room.id),
          type: 'user' as const,
          user: otherUser,
          lastMessage: formattedLastMessage,
          unreadCount,
          lastActivity: room.lastActivity.toISOString(),
          isActive: room.isActive
        }
      })
    }

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch room details' },
      { status: 500 }
    )
  }
}

