import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/utils/auth'
import { prisma } from '@/utils/prisma'
import { BadgeService } from '@/app/web/config/BadgeService'

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

    // Get all chat rooms where user is an active participant
    const chatParticipants = await prisma.chatParticipant.findMany({
      where: {
        userId: userId,
        isActive: true
      },
      include: {
        room: {
          include: {
            meeting: {
              select: {
                id: true,
                userId: true,
                meetingName: true,
                meetingBackground: true,
                meetingTime: true,
                roadNameAddress: true,
                detailedAddress: true
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
                  lastLogin: true,
                  activeCommunityBadge: {
                    select: {
                      id: true,
                      name: true,
                      imageUrl: true
                    }
                  },
                  activeCommunityBadgeId: true
                }
              }
            }
            },
            messages: {
              orderBy: {
                createdAt: 'desc'
              },
              take: 1,
            include: {
          sender: {
                select: {
                  id: true,
                  nickname: true,
                  profileImage: true,
                  lastLogin: true,
                  activeCommunityBadge: {
                    select: {
                      id: true,
                      name: true,
                      imageUrl: true
                    }
                  },
                  activeCommunityBadgeId: true
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
      }
    })

    const userIdsForBadges = new Set<number>()
    chatParticipants.forEach(participant => {
      participant.room.participants.forEach(p => {
        if (p.user?.id) userIdsForBadges.add(p.user.id)
      })
      participant.room.messages.forEach(msg => {
        if (msg.sender?.id) userIdsForBadges.add(msg.sender.id)
      })
    })

    const badgeMap = userIdsForBadges.size > 0
      ? await BadgeService.ensureCommunityBadgesForUsers(Array.from(userIdsForBadges))
      : {}

    const getBadgeForUser = (
      userId: number | null | undefined,
      badge?: { id?: number | null; name?: string | null; imageUrl?: string | null } | null
    ) => {
      if (!userId && !badge) return null
      const fallback = badge ?? null
      const ensured = userId != null ? badgeMap[userId] ?? fallback : fallback
      if (!ensured) return null
      return {
        id: ensured.id ?? null,
        name: ensured.name ?? null,
        imageUrl: ensured.imageUrl ?? null
      }
    }

    const rooms = await Promise.all(
      chatParticipants.map(async (participant) => {
        const room = participant.room
        const isGroupChat = room.type === 'group'

        // For individual chats, find the other user
        let otherUser = null
        let otherUserBadgeSource: { id?: number | null; name?: string | null; imageUrl?: string | null } | null = null
        if (!isGroupChat) {
          const otherParticipant = room.participants.find(p => p.userId !== userId)
          if (otherParticipant) {
            const user = otherParticipant.user
            // Check if user is blocked
            const isBlocked = await prisma.blockedUser.findFirst({
              where: {
                OR: [
                  { blockerId: userId, blockedId: user.id },
                  { blockerId: user.id, blockedId: userId }
                ]
              }
            })

            // Always include user data, even if blocked
            // Get community rating level
            const communityRating = await prisma.communityRating.findUnique({
              where: { userId: user.id },
              select: { level: true }
            })

            const badge = getBadgeForUser(user.id, user.activeCommunityBadge)
            otherUser = {
              id: String(user.id),
              nickname: user.nickname || 'Unknown',
              avatar: user.profileImage || '',
              isOnline: false, // TODO: Implement online status tracking
              lastSeen: user.lastLogin?.toISOString() || new Date().toISOString(),
              level: communityRating ? parseInt(communityRating.level) || 1 : 1,
              activeCommunityBadge: badge,
              badge
            }
            otherUserBadgeSource = user.activeCommunityBadge ?? null
          }
        }

        // Get last message
        const lastMessage = room.messages[0] || null
        let formattedLastMessage = null

        if (lastMessage && !lastMessage.isDeleted) {
          const senderUser = lastMessage.sender
          const senderCommunityRating = await prisma.communityRating.findUnique({
            where: { userId: senderUser.id },
            select: { level: true }
          })

          const badge = getBadgeForUser(senderUser.id, senderUser.activeCommunityBadge)

          formattedLastMessage = {
            id: String(lastMessage.id),
            content: lastMessage.content,
            type: lastMessage.type as 'text' | 'image' | 'file' | 'club',
          sender: {
              id: String(senderUser.id),
              nickname: senderUser.nickname || 'Unknown',
              avatar: senderUser.profileImage || '',
            isOnline: false,
              lastSeen: senderUser.lastLogin?.toISOString() || new Date().toISOString(),
              level: senderCommunityRating ? parseInt(senderCommunityRating.level) || 1 : 1,
              activeCommunityBadge: badge,
              badge
            },
            timestamp: lastMessage.createdAt.toISOString(),
            isRead: participant.lastReadAt ? participant.lastReadAt >= lastMessage.createdAt : false
          }
        }

        // Calculate unread count
        const unreadCount = participant.lastReadAt
          ? await prisma.chatMessage.count({
              where: {
                roomId: room.id,
                senderId: { not: userId },
                createdAt: { gt: participant.lastReadAt },
                isDeleted: false
              }
            })
          : await prisma.chatMessage.count({
              where: {
                roomId: room.id,
                senderId: { not: userId },
                isDeleted: false
              }
            })

        if (isGroupChat) {
          // For group chats linked to meetings, verify user is actually a meeting participant OR the host
          if (room.meetingId) {
            // Check if user is the meeting host
            const isHost = room.meeting?.userId === userId
            
            // Check if user is a meeting participant
            const meetingParticipant = await prisma.meetingParticipant.findFirst({
              where: {
                meetingId: room.meetingId,
                userId: userId
              }
            })

            // Only show if user is the host OR a participant in the meeting
            if (!isHost && !meetingParticipant) {
              return null // Skip this room - user is not a meeting participant or host
            }
          }

          // Group/Club chat
          return {
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
              meetingTime: room.meeting?.meetingTime ? room.meeting.meetingTime.toISOString() : null,
              meetingAddress: room.meeting?.roadNameAddress || null,
              meetingDetailedAddress: room.meeting?.detailedAddress || null,
              meetingBackground: room.meeting?.meetingBackground || null,
              allowParticipantChat: room.allowParticipantChat,
              members: room.participants.map(p => {
                const badge = getBadgeForUser(p.user.id, p.user.activeCommunityBadge)
                return {
                  id: String(p.user.id),
                  nickname: p.user.nickname || 'Unknown',
                  avatar: p.user.profileImage || '',
                  isOnline: false,
                  lastSeen: p.user.lastLogin?.toISOString() || new Date().toISOString(),
                  level: 1, // TODO: Get actual levels
                  activeCommunityBadge: badge,
                  badge
                }
              }),
              createdAt: room.createdAt.toISOString()
            },
            lastMessage: formattedLastMessage,
            unreadCount,
            lastActivity: room.lastActivity.toISOString(),
            isActive: room.isActive
          }
        } else {
          // Individual chat - always include, even if blocked
          if (!otherUser) {
            return null
          }

          // Check block status for individual chats
          const blockCheck = await (prisma as any).blockedUser.findFirst({
            where: {
              OR: [
                { blockerId: userId, blockedId: parseInt(otherUser.id) },
                { blockerId: parseInt(otherUser.id), blockedId: userId }
              ]
            }
          })
          const isBlocked = !!blockCheck

          // Check mutual follow status (Instagram-style message requests)
          // Check if current user follows other user
          const currentUserFollowsOther = await prisma.$queryRaw`
            SELECT 1 as isFollowing
            FROM followers 
            WHERE "userId" = ${userId} AND "following" = ${parseInt(otherUser.id)}
            LIMIT 1
          `
          const currentUserFollows = Array.isArray(currentUserFollowsOther) && currentUserFollowsOther.length > 0

          // Check if other user follows current user
          const otherUserFollowsCurrent = await prisma.$queryRaw`
            SELECT 1 as isFollowing
            FROM followers 
            WHERE "userId" = ${parseInt(otherUser.id)} AND "following" = ${userId}
            LIMIT 1
          `
          const otherUserFollows = Array.isArray(otherUserFollowsCurrent) && otherUserFollowsCurrent.length > 0

          // Mutual follow means both users follow each other
          const hasMutualFollow = currentUserFollows && otherUserFollows
          
          // Check if current user has ever sent a message in this room
          // If they have, it's not a message request anymore (user has accepted by replying)
          const currentUserHasSentMessage = await prisma.chatMessage.findFirst({
            where: {
              roomId: room.id,
              senderId: userId,
              isDeleted: false
            }
          })
          
          // Message request = individual chat where:
          // 1. Users don't mutually follow each other
          // 2. Current user hasn't sent any messages yet (hasn't accepted/replied)
          // 3. There are unread messages from the other user
          const isMessageRequest = !hasMutualFollow && 
            !currentUserHasSentMessage && 
            unreadCount > 0

          const badge = getBadgeForUser(parseInt(otherUser.id), otherUserBadgeSource)
          return {
            id: String(room.id),
            type: 'user' as const,
            user: {
              ...otherUser,
              activeCommunityBadge: badge,
              badge
            },
            lastMessage: formattedLastMessage,
            unreadCount,
            lastActivity: room.lastActivity.toISOString(),
            isActive: room.isActive,
            isBlocked: isBlocked,
            isMessageRequest: isMessageRequest || false,
            hasMutualFollow: hasMutualFollow
          }
        }
      })
    )

    // Filter out null rooms (only null if no otherUser found)
    const filteredRooms = rooms.filter(room => room !== null)

    return NextResponse.json({ success: true, rooms: filteredRooms })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch chat rooms' },
      { status: 500 }
    )
  }
}
