import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { isAdminTokenValid } from '@/apiConfigs/admin'
import { ensureMeetingStatusUpToDate } from '@/utils/meetingStatusUpdater'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const adminToken = request.cookies.get('admin_auth_token')?.value
    if (!adminToken || !isAdminTokenValid(adminToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const meetingId = parseInt(id)
    
    if (isNaN(meetingId)) {
      return NextResponse.json({ error: 'Invalid meeting ID' }, { status: 400 })
    }

    const body = await request.json()
    const { status } = body

    // Validate status
    const validStatuses = ['pending', 'approved', 'reject', 'completed']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if meeting exists
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId }
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Update meeting status
    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status,
        updatedAt: new Date()
      }
    })

    // If status is approved, ensure it's up to date (check if it should be completed)
    if (status === 'approved') {
      await ensureMeetingStatusUpToDate(meetingId)
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedMeeting.id,
        status: updatedMeeting.status
      }
    })
  } catch (error) {
    console.error('Error updating meeting status:', error)
    return NextResponse.json(
      { error: 'Failed to update meeting status' },
      { status: 500 }
    )
  }
}


