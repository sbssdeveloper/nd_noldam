import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/utils/auth'
import { prisma } from '@/utils/prisma'

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { userId: targetUserId } = body

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'Target user ID is required' },
        { status: 400 }
      )
    }

    const targetUserIdInt = parseInt(String(targetUserId))
    if (Number.isNaN(targetUserIdInt)) {
      return NextResponse.json(
        { success: false, error: 'Invalid target user ID' },
        { status: 400 }
      )
    }

    if (userId === targetUserIdInt) {
      return NextResponse.json(
        { success: false, error: 'Cannot block yourself' },
        { status: 400 }
      )
    }

    // Check if already blocked
    const existingBlock = await (prisma as any).blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId: targetUserIdInt
        }
      }
    })

    if (existingBlock) {
      return NextResponse.json({ success: true, message: 'User already blocked' })
    }

    // Create block entry
    await (prisma as any).blockedUser.create({
      data: {
        blockerId: userId,
        blockedId: targetUserIdInt
      }
    })

    return NextResponse.json({ success: true, message: 'User blocked successfully' })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to block user' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId')

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'Target user ID is required' },
        { status: 400 }
      )
    }

    const targetUserIdInt = parseInt(targetUserId)
    if (Number.isNaN(targetUserIdInt)) {
      return NextResponse.json(
        { success: false, error: 'Invalid target user ID' },
        { status: 400 }
      )
    }

    // Remove block entry
    await (prisma as any).blockedUser.deleteMany({
      where: {
        blockerId: userId,
        blockedId: targetUserIdInt
      }
    })

    return NextResponse.json({ success: true, message: 'User unblocked successfully' })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to unblock user' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId')

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'Target user ID is required' },
        { status: 400 }
      )
    }

    const targetUserIdInt = parseInt(targetUserId)
    if (Number.isNaN(targetUserIdInt)) {
      return NextResponse.json(
        { success: false, error: 'Invalid target user ID' },
        { status: 400 }
      )
    }

    // Check if user is blocked (either direction)
    const isBlocked = await (prisma as any).blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: targetUserIdInt },
          { blockerId: targetUserIdInt, blockedId: userId }
        ]
      }
    })

    return NextResponse.json({ 
      success: true, 
      isBlocked: !!isBlocked,
      blockedBy: isBlocked?.blockerId === userId ? null : isBlocked?.blockerId || null
    })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to check block status' },
      { status: 500 }
    )
  }
}

