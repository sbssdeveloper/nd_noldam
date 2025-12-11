import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/utils/auth'
import { prisma } from '@/utils/prisma'
import { successResponse, errorResponse } from '@/utils/general'

/**
 * Get payment by orderId
 * GET /api/payments?orderId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const payload = await verifyToken(request)
    if (!payload || (!payload.uid && !payload.userId)) {
      return NextResponse.json(errorResponse('Unauthorized', 401), { status: 401 })
    }

    const userId = parseInt((payload.uid || payload.userId) as string)
    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json(errorResponse('Invalid user', 401), { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const paymentId = searchParams.get('paymentId')

    if (!orderId && !paymentId) {
      return NextResponse.json(
        errorResponse('Order ID or Payment ID is required', 400),
        { status: 400 }
      )
    }

    const payment = await prisma.payment.findUnique({
      where: orderId ? { orderId } : { id: parseInt(paymentId!) },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true
              }
            },
            meeting: {
              select: {
                id: true,
                meetingName: true
              }
            }
          }
        }
      }
    })

    if (!payment) {
      return NextResponse.json(errorResponse('Payment not found', 404), { status: 404 })
    }

    // Check if user has permission (must be payment owner)
    const isOwner = payment.participants.some(p => p.userId === userId)
    if (!isOwner) {
      return NextResponse.json(
        errorResponse('You do not have permission to view this payment', 403),
        { status: 403 }
      )
    }

    return NextResponse.json(
      successResponse(payment, 'Payment retrieved successfully'),
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Get payment error:', error)
    return NextResponse.json(
      errorResponse(error.message || 'Failed to get payment', 500),
      { status: 500 }
    )
  }
}

