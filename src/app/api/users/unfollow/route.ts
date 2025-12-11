import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { verifyToken } from '@/utils/auth'
import { NotificationService } from '@/app/web/config/NotificationService'
import { NOTIFICATION_TYPES } from '@/app/web/config/notifications'

const notificationService = new NotificationService()

export async function DELETE(request: NextRequest) {
  try {
    const payload = await verifyToken(request)
    if (!payload || (!payload.uid && !payload.userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUserId = parseInt((payload.uid || payload.userId) as string)
    
    if (!currentUserId || Number.isNaN(currentUserId)) {
      return NextResponse.json({ error: 'Invalid current user ID' }, { status: 400 })
    }
    
    const { searchParams } = new URL(request.url)
    const targetUserId = parseInt(searchParams.get('userId') || '0')

    if (!targetUserId || currentUserId === targetUserId) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    // Remove follow relationship using raw SQL
    await prisma.$executeRaw`
      DELETE FROM followers 
      WHERE "userId" = ${currentUserId} AND "following" = ${targetUserId}
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

    try {
      await notificationService.createNotification(
        targetUserId,
        NOTIFICATION_TYPES.UNFOLLOW_RECEIVED,
        {
          userName: currentUserNickname,
          followerId: currentUserId
        },
        {
          relatedId: currentUserId,
          relatedType: 'user'
        }
      )
    } catch (notificationError) {
      console.error('Unfollow notification error:', notificationError)
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
    console.error('Unfollow user error:', error)
    return NextResponse.json({ error: 'Failed to unfollow user' }, { status: 500 })
  }
}
