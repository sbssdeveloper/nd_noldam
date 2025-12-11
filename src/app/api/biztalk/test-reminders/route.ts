import { NextRequest, NextResponse } from 'next/server'
import { sendMeetingReminderOneDay, sendMeetingReminderThreeDays } from '@/lib/sms/biztalk'
import { successResponse, errorResponse, validationErrorResponse } from '@/utils/general'

/**
 * Test endpoint for BizTalk reminder templates
 * POST /api/biztalk/test-reminders
 * 
 * Body:
 * {
 *   "type": "oneDay" | "threeDays",
 *   "recipientPhone": "01012345678",
 *   "name": "Test User",
 *   "clubName": "Test Meeting"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, recipientPhone, name, clubName } = body

    // Validate required fields
    if (!type || !recipientPhone) {
      return NextResponse.json(
        validationErrorResponse('type and recipientPhone are required'),
        { status: 400 }
      )
    }

    if (!['oneDay', 'threeDays'].includes(type)) {
      return NextResponse.json(
        validationErrorResponse('type must be "oneDay" or "threeDays"'),
        { status: 400 }
      )
    }

    const testName = name || '테스트 사용자'
    const testClubName = clubName || '테스트 모임'

    console.log('[BizTalk Test] Sending test reminder:', {
      type,
      recipientPhone,
      name: testName,
      clubName: testClubName
    })

    let result
    let messageType

    if (type === 'oneDay') {
      result = await sendMeetingReminderOneDay({
        recipientPhone,
        name: testName,
        clubName: testClubName,
        meetingId: 999 // Test meeting ID
      })
      messageType = '1-day reminder'
    } else {
      result = await sendMeetingReminderThreeDays({
        recipientPhone,
        name: testName,
        clubName: testClubName,
        meetingId: 999 // Test meeting ID
      })
      messageType = '3-day reminder'
    }

    console.log('[BizTalk Test] ✅ Test message sent successfully:', {
      msgIdx: result.msgIdx,
      success: result.success,
      payloadInfo: result.payloadInfo
    })

    // Get environment variable info for debugging
    const envVarName = type === 'oneDay' 
      ? 'BIZTALK_MESSAGE_TYPE_MEETING_ONE_DAY'
      : 'BIZTALK_MESSAGE_TYPE_MEETING_THREE_DAYS'
    const envVarValue = process.env[envVarName] || 'not set (defaults to AT)'
    const templateCodeEnvVar = type === 'oneDay'
      ? 'BIZTALK_TEMPLATE_CODE_MEETING_ONE_DAY'
      : 'BIZTALK_TEMPLATE_CODE_MEETING_THREE_DAYS'
    const templateCode = process.env[templateCodeEnvVar] || (type === 'oneDay' ? 'club_coming' : 'club_coming_3')

    return NextResponse.json(
      successResponse({
        msgIdx: result.msgIdx,
        success: result.success,
        messageType,
        recipientPhone,
        sentAt: new Date().toISOString(),
        payloadInfo: result.payloadInfo,
        configuration: {
          templateCode,
          messageTypeFromEnv: envVarValue,
          messageTypeInPayload: result.payloadInfo?.messageType || 'NOT SET (BizTalk will use template default)',
          envVarName,
          templateCodeEnvVar
        },
        troubleshooting: result.payloadInfo?.messageType 
          ? `Payload messageType is "${result.payloadInfo.messageType}". If you get 3030 error, ensure your BizTalk template is registered as ${result.payloadInfo.messageType === 'AI' ? 'Image Alimtalk (AI)' : 'Regular Alimtalk (AT)'}.`
          : 'Payload messageType is NOT SET. BizTalk will use template default. If you get 3030 error, set the environment variable to match your template registration (AT or AI).'
      }, `${messageType} test message sent successfully`),
      { status: 200 }
    )

  } catch (error: any) {
    console.error('[BizTalk Test] ❌ Error sending test message:', error)
    return NextResponse.json(
      errorResponse(error?.message || 'Failed to send test message', 500),
      { status: 500 }
    )
  }
}
