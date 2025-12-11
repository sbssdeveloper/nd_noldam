import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/utils/auth'
import { fetchBiztalkResults } from '@/lib/sms/biztalk'
import { successResponse, errorResponse } from '@/utils/general'

/**
 * Check BizTalk message delivery status
 * GET /api/admin/biztalk/check-message?msgIdx=MSG_ID
 * 
 * Returns delivery status for a specific message
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check (admin only)
    const payload = await verifyToken(request)
    if (!payload || (!payload.uid && !payload.userId)) {
      return NextResponse.json(errorResponse('Unauthorized', 401), { status: 401 })
    }

    // Get msgIdx from query parameters
    const { searchParams } = new URL(request.url)
    const msgIdx = searchParams.get('msgIdx')

    if (!msgIdx) {
      return NextResponse.json(
        errorResponse('msgIdx parameter is required', 400),
        { status: 400 }
      )
    }

    // Fetch message result from BizTalk
    const result = await fetchBiztalkResults(msgIdx)

    return NextResponse.json(
      successResponse(result, 'Message status retrieved successfully'),
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[BizTalk Check Message] Error:', error)
    return NextResponse.json(
      errorResponse(error.message || 'Failed to check message status', 500),
      { status: 500 }
    )
  }
}


