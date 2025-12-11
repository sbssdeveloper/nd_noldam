import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { verifyToken } from '@/utils/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    
    const payload = await verifyToken(request)
    
    if (!payload || (!payload.uid && !payload.userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUserId = parseInt((payload.uid || payload.userId) as string)
    const targetUserId = parseInt(userId)
    
    if (!targetUserId) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    // Check if current user is following target user
    const followStatus = await prisma.$queryRaw`
      SELECT 1 as isFollowing
      FROM followers 
      WHERE "userId" = ${currentUserId} 
      AND "following" = ${targetUserId}
      LIMIT 1
    `

    const isFollowing = Array.isArray(followStatus) && followStatus.length > 0

    return NextResponse.json({
      success: true,
      data: {
        isFollowing
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get follow status' }, { status: 500 })
  }
}
