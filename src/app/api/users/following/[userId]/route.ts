import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { verifyToken } from '@/utils/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const payload = await verifyToken(request)
    
    if (!payload || (!payload.uid && !payload.userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUserId = parseInt((payload.uid || payload.userId) as string)
    const targetUserId = parseInt(params.userId)
    
    if (!targetUserId) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    // Get following list with user details using raw SQL
    const followingResult = await prisma.$queryRaw`
      SELECT 
        f."startedOn",
        u.id,
        u.nickname,
        u."profileImage",
        u.status,
        u."activeCommunityBadgeId",
        ab.name as "badgeName",
        ab."imageUrl" as "badgeImageUrl"
      FROM followers f
      JOIN users u ON f."following" = u.id
      LEFT JOIN badges ab ON u."activeCommunityBadgeId" = ab.id
      WHERE f."userId" = ${targetUserId}
      ORDER BY f."startedOn" DESC
      LIMIT 50
    `

    // Get follow status for current user against all following users in one query
    const followingIds = (followingResult as any[]).map(following => following.id)
    let followStatusMap: Record<number, boolean> = {}
    
    if (followingIds.length > 0) {
      const followStatusResult = await prisma.$queryRaw`
        SELECT "following" as "followingId"
        FROM followers 
        WHERE "userId" = ${currentUserId} 
        AND "following" = ANY(${followingIds})
      `
      
      // Initialize all as false
      followingIds.forEach(id => {
        followStatusMap[id] = false
      })
      
      // Set true for users that are being followed
      if (Array.isArray(followStatusResult)) {
        (followStatusResult as any[]).forEach((follow: any) => {
          followStatusMap[follow.followingId] = true
        })
      }
    }

    // Map following with follow status
    const followingWithStatus = (followingResult as any[]).map(following => ({
      id: following.id,
      nickname: following.nickname,
      profileImage: following.profileImage,
      status: following.status,
      startedOn: following.startedOn,
      activeCommunityBadge: following.activeCommunityBadgeId ? {
        id: following.activeCommunityBadgeId,
        name: following.badgeName,
        imageUrl: following.badgeImageUrl
      } : null,
      isFollowing: followStatusMap[following.id] || false
    }))

    return NextResponse.json({
      success: true,
      data: {
        following: followingWithStatus,
        totalCount: followingWithStatus.length
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get following' }, { status: 500 })
  }
}
