import { NextRequest, NextResponse } from 'next/server'
import { fetchBiztalkResults } from '@/lib/sms/biztalk'
import { successResponse, errorResponse } from '@/utils/general'

/**
 * Check BizTalk message delivery status (NO AUTH REQUIRED - for testing only)
 * GET /api/biztalk/check-status?msgIdx=MSG_ID
 * 
 * This is a simplified endpoint for testing/debugging
 * Returns delivery status for a specific message
 */
export async function GET(request: NextRequest) {
  try {
    // Get msgIdx from query parameters (handle both msgIdx and msgldx typo)
    const { searchParams } = new URL(request.url)
    const msgIdx = searchParams.get('msgIdx') || searchParams.get('msgldx') // Handle typo

    if (!msgIdx) {
      return NextResponse.json(
        errorResponse('msgIdx parameter is required. Example: ?msgIdx=CLUB_JOINED_1764227960806_9445', 400),
        { status: 400 }
      )
    }

    console.log('[BizTalk Check Status] Checking delivery status for:', msgIdx)

    // Fetch message result from BizTalk
    const result = await fetchBiztalkResults(msgIdx)

    // Format response for easier reading
    const formattedResult = {
      msgIdx,
      responseCode: result?.responseCode,
      message: result?.msg || result?.message,
      resultList: result?.resultList || [],
      resultListCount: result?.resultList?.length || 0,
      // Show full raw response for debugging
      rawResponse: result,
      summary: result?.resultList?.[0] ? {
        status: result.resultList[0].status,
        statusCode: result.resultList[0].statusCode,
        statusMessage: result.resultList[0].statusMessage,
        errorCode: result.resultList[0].errorCode,
        errorMessage: result.resultList[0].errorMessage,
        sentAt: result.resultList[0].sentAt,
        deliveredAt: result.resultList[0].deliveredAt
      } : null,
      // Diagnostic information
      diagnostics: {
        hasResultList: !!result?.resultList,
        resultListIsEmpty: !result?.resultList || result.resultList.length === 0,
        interpretation: !result?.resultList || result.resultList.length === 0 
          ? "Empty resultList means: 1) Message status not available yet (wait 5-10 seconds), 2) Message was rejected before tracking, or 3) msgIdx not found in BizTalk system. Check server logs for full BizTalk response."
          : "Status available"
      }
    }

    return NextResponse.json(
      successResponse(formattedResult, 'Message status retrieved successfully'),
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[BizTalk Check Status] Error:', error)
    return NextResponse.json(
      errorResponse(error.message || 'Failed to check message status', 500),
      { status: 500 }
    )
  }
}

