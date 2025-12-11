/**
 * Create Payment Request API
 * 
 * POST /api/payments/create
 * 
 * Creates a payment request with Toss Payments and saves it to the database.
 * 
 * Request Body:
 * - meetingId: number (optional, 0 for test payments)
 * - amount: number (required, minimum 1000 KRW)
 * - orderName: string (optional, defaults to meeting name or "테스트 결제")
 * 
 * Response:
 * - paymentId: number
 * - paymentKey: string (for opening payment window)
 * - orderId: string
 * - amount: number
 * - status: string
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/utils/auth'
import { prisma } from '@/utils/prisma'
import { createPaymentRequest } from '@/lib/payments/toss'
import { successResponse, errorResponse } from '@/utils/general'

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const payload = await verifyToken(request)
    if (!payload || (!payload.uid && !payload.userId)) {
      return NextResponse.json(errorResponse('Unauthorized', 401), { status: 401 })
    }

    const userId = parseInt((payload.uid || payload.userId) as string)
    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json(errorResponse('Invalid user', 401), { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { meetingId, amount, orderName } = body

    // Validate amount
    const amountValue = parseFloat(amount)
    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      return NextResponse.json(
        errorResponse('Valid amount is required (must be greater than 0)', 400),
        { status: 400 }
      )
    }

    if (amountValue < 1000) {
      return NextResponse.json(
        errorResponse('Amount must be at least 1,000 KRW (Toss Payments minimum)', 400),
        { status: 400 }
      )
    }

    // Fetch user information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        nickname: true,
        phoneNumber: true,
        profile: {
          select: {
            email: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(errorResponse('User not found', 404), { status: 404 })
    }

    // Fetch meeting information (if provided)
    let meeting = null
    if (meetingId && meetingId !== 0) {
      meeting = await prisma.meeting.findUnique({
        where: { id: parseInt(meetingId) },
        select: {
          id: true,
          meetingName: true,
          fee: true
        }
      })

      if (!meeting) {
        return NextResponse.json(errorResponse('Meeting not found', 404), { status: 404 })
      }
    }

    // Generate unique order ID
    // Format: ORDER-{meetingId}-{userId}-{timestamp} or ORDER-TEST-{userId}-{timestamp}
    const orderId = meetingId && meetingId !== 0
      ? `ORDER-${meetingId}-${userId}-${Date.now()}`
      : `ORDER-TEST-${userId}-${Date.now()}`

    // Determine base URL
    const protocol = request.headers.get('x-forwarded-proto') ||
                     (process.env.NODE_ENV === 'production' ? 'https' : 'http')
    const host = request.headers.get('host') || 'localhost:3000'
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`

    // Validate Toss Payments configuration
    const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json(
        errorResponse('Payment service is not configured. Please set TOSS_PAYMENTS_SECRET_KEY in environment variables.', 500),
        { status: 500 }
      )
    }

    // Format phone number for Toss (optional field)
    let formattedPhone: string | undefined
    if (user.phoneNumber) {
      const digitsOnly = user.phoneNumber.replace(/\D/g, '')
      if (digitsOnly.length >= 10 && digitsOnly.length <= 11) {
        formattedPhone = digitsOnly
      }
    }

    // Sanitize orderName - remove emojis and ensure it's within Toss limits
    // Toss requires orderName to be max 100 characters and may have issues with emojis
    const rawOrderName = orderName || meeting?.meetingName || '테스트 결제'
    // Remove emojis and other non-printable characters, keep only printable characters
    const sanitizedOrderName = rawOrderName
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
      .replace(/[\u{1FA00}-\u{1FAFF}]/gu, '') // Remove extended emojis
      .replace(/[\u{2600}-\u{26FF}]/gu, '') // Remove misc symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, '') // Remove dingbats
      .trim()
      .substring(0, 100) // Max 100 characters for Toss
    
    // Fallback if orderName becomes empty after sanitization
    const finalOrderName = sanitizedOrderName || '결제'

    // Create payment request with Toss
    const paymentRequestData = {
      amount: Math.round(amountValue),
      orderId,
      orderName: finalOrderName,
      successUrl: `${baseUrl}/payment/success?paymentKey={paymentKey}&orderId={orderId}&amount={amount}`,
      failUrl: `${baseUrl}/payment/fail?paymentKey={paymentKey}&orderId={orderId}&code={code}&message={message}`,
      customerName: user.nickname || undefined,
      customerEmail: user.profile?.email || undefined,
      customerMobilePhone: formattedPhone
    }

    console.log('[Payment Create API] Payment request data:', JSON.stringify(paymentRequestData, null, 2))
    console.log('[Payment Create API] Base URL:', baseUrl)
    console.log('[Payment Create API] Secret key configured:', secretKey ? `${secretKey.substring(0, 10)}...` : 'NOT SET')

    let tossPayment
    try {
      console.log('[Payment Create API] Calling Toss Payments API...')
      tossPayment = await createPaymentRequest(paymentRequestData)
      console.log('[Payment Create API] ✅ Toss payment created successfully:', {
        paymentKey: tossPayment.paymentKey,
        orderId: tossPayment.orderId,
        status: tossPayment.status
      })
    } catch (tossError: any) {
      console.error('[Payment Create API] ❌ Toss payment creation failed:', {
        message: tossError.message,
        code: (tossError as any).code,
        status: (tossError as any).status
      })
      
      // Provide more helpful error message for COMMON_ERROR
      let errorMessage = tossError.message || 'Failed to create payment request with Toss Payments'
      if (errorMessage.includes('COMMON_ERROR') || errorMessage.includes('처리 중 오류가 발생했습니다')) {
        errorMessage = '결제 요청 처리 중 오류가 발생했습니다. 다음을 확인해주세요:\n' +
          '1. TOSS_PAYMENTS_SECRET_KEY가 올바른지 확인\n' +
          '2. successUrl과 failUrl이 올바른지 확인\n' +
          '3. 테스트 키인 경우 test_sk_ 또는 test_gsk_로 시작하는지 확인\n' +
          '4. 서버 로그에서 상세 오류 메시지 확인'
      }
      
      return NextResponse.json(
        errorResponse(errorMessage, 500),
        { status: 500 }
      )
    }

    // Save payment to database
    let payment
    try {
      payment = await prisma.payment.create({
        data: {
          type: 'meeting_fee',
          refNo: orderId,
          orderId: orderId,
          paymentKey: tossPayment.paymentKey,
          status: 'pending',
          amount: amountValue,
          tossStatus: tossPayment.status,
          customerName: user.nickname || undefined,
          customerEmail: user.profile?.email || undefined,
          customerPhone: user.phoneNumber || undefined
        }
      })
    } catch (dbError: any) {
      // Payment was created with Toss but failed to save to database
      // Log error but don't fail the request - payment can still be processed
      console.error('Failed to save payment to database:', dbError)
      
      return NextResponse.json(
        errorResponse('Payment was created but failed to save to database. Please contact support.', 500),
        { status: 500 }
      )
    }

    // If this is a meeting payment, link it to the participant
    if (meetingId && meetingId !== 0) {
      try {
        // Find the participant for this meeting and user with pending payment status
        const participant = await prisma.meetingParticipant.findFirst({
          where: {
            meetingId: parseInt(meetingId),
            userId: userId,
            paymentStatus: 'pending'
          }
        })

        if (participant) {
          // Link payment to participant
          await prisma.meetingParticipant.update({
            where: { id: participant.id },
            data: { paymentId: payment.id }
          })
          console.log('[Payment Create API] Linked payment to participant:', participant.id)
        } else {
          console.warn('[Payment Create API] No pending participant found for meeting:', meetingId, 'user:', userId)
        }
      } catch (participantError: any) {
        // Log error but don't fail payment creation
        console.error('[Payment Create API] Error linking payment to participant:', participantError)
      }
    }

    // Return success response
    return NextResponse.json(
      successResponse(
        {
          paymentId: payment.id,
          paymentKey: tossPayment.paymentKey,
          orderId: orderId,
          amount: tossPayment.totalAmount,
          status: tossPayment.status,
          meetingId: meetingId && meetingId !== 0 ? parseInt(meetingId) : undefined
        },
        'Payment request created successfully'
      ),
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Payment creation error:', error)
    
    return NextResponse.json(
      errorResponse(error.message || 'Failed to create payment request', 500),
      { status: 500 }
    )
  }
}
