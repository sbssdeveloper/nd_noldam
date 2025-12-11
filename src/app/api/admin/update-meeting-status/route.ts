import { NextRequest, NextResponse } from 'next/server'
import { updateCompletedMeetings } from '@/utils/meetingStatusUpdater'

export async function POST(request: NextRequest) {
  try {
    // You might want to add admin authentication here
    // const payload = await verifyToken(request)
    // if (!payload || !isAdmin(payload)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const result = await updateCompletedMeetings()
    
    return NextResponse.json({
      success: true,
      message: `Updated ${result.updated} meetings to completed status`,
      data: {
        updated: result.updated,
        errors: result.errors
      }
    })
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update meeting status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Allow GET requests for easy testing
  return POST(request)
}
