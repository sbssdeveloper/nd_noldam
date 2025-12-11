import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { verifyToken } from '@/utils/auth'
import { NotificationService } from '@/app/web/config/NotificationService'
import { NOTIFICATION_TYPES } from '@/app/web/config/notifications'

const notificationService = new NotificationService()

export async function POST(request: NextRequest) {
  try {
    const payload = await verifyToken(request)
    
    if (!payload || (!payload.uid && !payload.userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUserId = parseInt((payload.uid || payload.userId) as string)
    
    if (!currentUserId || Number.isNaN(currentUserId)) {
      return NextResponse.json({ error: 'Invalid current user ID' }, { status: 400 })
    }
    
    const requestBody = await request.json()
    
    const { userId: targetUserId } = requestBody

    if (!targetUserId || currentUserId === targetUserId) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    // Check if already following using raw SQL
    const existingFollow = await prisma.$queryRaw`
      SELECT * FROM followers 
      WHERE "userId" = ${currentUserId} AND "following" = ${targetUserId}
    `

    if (Array.isArray(existingFollow) && existingFollow.length > 0) {
      return NextResponse.json({ error: 'Already following this user' }, { status: 400 })
    }

    // Create follow relationship using raw SQL
    await prisma.$executeRaw`
      INSERT INTO followers ("userId", "following", "startedOn") 
      VALUES (${currentUserId}, ${targetUserId}, NOW())
    `

    // Get user nicknames for notification
    const [currentUser, targetUser] = await Promise.all([
      prisma.$queryRaw`SELECT nickname FROM users WHERE id = ${currentUserId}`,
      prisma.$queryRaw`SELECT nickname FROM users WHERE id = ${targetUserId}`
    ])

    if (!(targetUser as any)[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const currentUserNickname = (currentUser as any)[0]?.nickname || 'Unknown User'
    const targetUserNickname = (targetUser as any)[0]?.nickname || 'Unknown User'

    try {
      await Promise.all([
        notificationService.createNotification(
          currentUserId,
          NOTIFICATION_TYPES.FOLLOW_STARTED_SELF,
          {
            userName: targetUserNickname,
            targetUserId
          },
          {
            relatedId: targetUserId,
            relatedType: 'user'
          }
        ),
        notificationService.createNotification(
          targetUserId,
          NOTIFICATION_TYPES.FOLLOW_RECEIVED,
          {
            userName: currentUserNickname,
            followerId: currentUserId
          },
          {
            relatedId: currentUserId,
            relatedType: 'user'
          }
        )
      ])
    } catch (notificationError) {
      console.error('Follow notification error:', notificationError)
    }

    // Get updated counts using raw SQL
    const [followingResult, followersResult] = await Promise.all([
      prisma.$queryRaw`SELECT COUNT(*) as count FROM followers WHERE "userId" = ${currentUserId}`,
      prisma.$queryRaw`SELECT COUNT(*) as count FROM followers WHERE "following" = ${targetUserId}`
    ])

    const followingCount = Number((followingResult as any)[0].count)
    const followersCount = Number((followersResult as any)[0].count)


    return NextResponse.json({
      success: true,
      data: {
        followingCount,
        followersCount
      }
    })
  } catch (error) {
    console.error('Follow user error:', error)
    return NextResponse.json({ error: 'Failed to follow user' }, { status: 500 })
  }
}
