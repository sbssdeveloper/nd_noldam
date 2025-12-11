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

    // Get followers list with user details using raw SQL
    const followersResult = await prisma.$queryRaw`
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
      JOIN users u ON f."userId" = u.id
      LEFT JOIN badges ab ON u."activeCommunityBadgeId" = ab.id
      WHERE f."following" = ${targetUserId}
      ORDER BY f."startedOn" DESC
      LIMIT 50
    `

    // Get follow status for current user against all followers in one query
    const followerIds = (followersResult as any[]).map(follower => follower.id)
    let followStatusMap: Record<number, boolean> = {}
    
    if (followerIds.length > 0) {
      const followStatusResult = await prisma.$queryRaw`
        SELECT "following" as "followingId"
        FROM followers 
        WHERE "userId" = ${currentUserId} 
        AND "following" = ANY(${followerIds})
      `
      
      // Initialize all as false
      followerIds.forEach(id => {
        followStatusMap[id] = false
      })
      
      // Set true for users that are being followed
      if (Array.isArray(followStatusResult)) {
        (followStatusResult as any[]).forEach((follow: any) => {
          followStatusMap[follow.followingId] = true
        })
      }
    }

    // Map followers with follow status
    const followersWithStatus = (followersResult as any[]).map(follower => ({
      id: follower.id,
      nickname: follower.nickname,
      profileImage: follower.profileImage,
      status: follower.status,
      startedOn: follower.startedOn,
      activeCommunityBadge: follower.activeCommunityBadgeId ? {
        id: follower.activeCommunityBadgeId,
        name: follower.badgeName,
        imageUrl: follower.badgeImageUrl
      } : null,
      isFollowing: followStatusMap[follower.id] || false
    }))

    return NextResponse.json({
      success: true,
      data: {
        followers: followersWithStatus,
        totalCount: followersWithStatus.length
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get followers' }, { status: 500 })
  }
}
