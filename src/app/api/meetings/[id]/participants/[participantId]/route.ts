import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/utils/auth'
import { prisma } from '@/utils/prisma'
import { isAdminTokenValid } from '@/apiConfigs/admin'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  try {
    // Check for admin authentication via cookie first
    let isAdmin = false
    let userId: number | null = null

    try {
      const adminToken = request.cookies.get('admin_auth_token')?.value
      if (adminToken && isAdminTokenValid(adminToken)) {
        isAdmin = true
        // For admin access, find an admin user from the database
        const adminUser = await prisma.user.findFirst({
          where: {
            role: {
              in: ['admin', 'manager', '관리자']
            }
          },
          select: { id: true }
        })
        if (adminUser) {
          userId = adminUser.id
        }
      }
    } catch (adminAuthError) {
      console.error('Admin auth check error:', adminAuthError)
    }

    // If not admin, try JWT token authentication
    if (!isAdmin) {
      const payload = await verifyToken(request)
      if (!payload || (!payload.uid && !payload.userId)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }

      userId = parseInt((payload.uid || payload.userId) as string)
      if (!userId || Number.isNaN(userId)) {
        return NextResponse.json({ success: false, error: 'Invalid user' }, { status: 401 })
      }

      // Check if user is admin or manager
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true }
        })
        isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === '관리자'
      } catch (error) {
        console.error('Error checking user role:', error)
      }
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id, participantId } = await params
    const meetingId = parseInt(id)
    const participantIdInt = parseInt(participantId)

    if (isNaN(meetingId) || isNaN(participantIdInt)) {
      return NextResponse.json({ success: false, error: 'Invalid meeting or participant ID' }, { status: 400 })
    }

    // Check if meeting exists
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { userId: true }
    })

    if (!meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 })
    }

    // Only allow admin or meeting owner to remove participants
    if (!isAdmin && meeting.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized to remove participants' }, { status: 403 })
    }

    // Check if participant exists
    const participant = await prisma.meetingParticipant.findUnique({
      where: { id: participantIdInt },
      include: {
        meeting: {
          select: { id: true, userId: true }
        }
      }
    })

    if (!participant) {
      return NextResponse.json({ success: false, error: 'Participant not found' }, { status: 404 })
    }

    // Verify participant belongs to this meeting
    if (participant.meetingId !== meetingId) {
      return NextResponse.json({ success: false, error: 'Participant does not belong to this meeting' }, { status: 400 })
    }

    // Get action from query parameter (suspend or unsuspend)
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'suspend' // Default to suspend

    if (action === 'unsuspend') {
      // Unsuspend: restore participant to confirmed status (if they had payment) or pending
      const originalStatus = participant.paymentId ? 'confirmed' : 'pending'
      await prisma.meetingParticipant.update({
        where: { id: participantIdInt },
        data: { paymentStatus: originalStatus }
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Participant unsuspended successfully',
        participant: await prisma.meetingParticipant.findUnique({
          where: { id: participantIdInt },
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                profileImage: true,
                activeCommunityBadge: {
                  select: {
                    id: true,
                    name: true,
                    imageUrl: true
                  }
                }
              }
            }
          }
        })
      }, { status: 200 })
    } else {
      // Suspend: mark participant as suspended (don't delete, just mark as suspended)
      await prisma.meetingParticipant.update({
        where: { id: participantIdInt },
        data: { paymentStatus: 'suspended' }
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Participant suspended successfully',
        participant: await prisma.meetingParticipant.findUnique({
          where: { id: participantIdInt },
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                profileImage: true,
                activeCommunityBadge: {
                  select: {
                    id: true,
                    name: true,
                    imageUrl: true
                  }
                }
              }
            }
          }
        })
      }, { status: 200 })
    }

  } catch (error: any) {
    console.error('Error removing participant:', error)
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Failed to remove participant' 
    }, { status: 500 })
  }
}

