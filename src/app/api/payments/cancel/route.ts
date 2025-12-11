/**
 * Cancel Payment API
 * 
 * POST /api/payments/cancel
 * 
 * Cancels/refunds a payment through Toss Payments.
 * 
 * Request Body:
 * - paymentId: number (required)
 * - cancelReason: string (required)
 * - cancelAmount: number (optional, defaults to full amount)
 * 
 * Response:
 * - paymentId: number
 * - status: string
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/utils/auth'
import { prisma } from '@/utils/prisma'
import { cancelPayment } from '@/lib/payments/toss'
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
    const { paymentId, cancelReason, cancelAmount } = body

    if (!paymentId || !cancelReason) {
      return NextResponse.json(
        errorResponse('Payment ID and cancel reason are required', 400),
        { status: 400 }
      )
    }

    // Find payment in database
    const payment = await prisma.payment.findUnique({
      where: { id: parseInt(paymentId) },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true
              }
            }
          }
        }
      }
    })

    if (!payment) {
      return NextResponse.json(errorResponse('Payment not found', 404), { status: 404 })
    }

    // Check if payment can be canceled
    if (payment.status === 'canceled') {
      return NextResponse.json(
        errorResponse('Payment is already canceled', 400),
        { status: 400 }
      )
    }

    if (payment.status !== 'completed') {
      return NextResponse.json(
        errorResponse('Only completed payments can be canceled', 400),
        { status: 400 }
      )
    }

    // Check if user has permission (must be payment owner or admin)
    const isOwner = payment.participants.some(p => p.userId === userId)
    if (!isOwner) {
      return NextResponse.json(
        errorResponse('You do not have permission to cancel this payment', 403),
        { status: 403 }
      )
    }

    if (!payment.paymentKey) {
      return NextResponse.json(
        errorResponse('Payment key not found', 400),
        { status: 400 }
      )
    }

    // Calculate cancel amount (default to full amount if not specified)
    const cancelAmountValue = cancelAmount
      ? Math.round(parseFloat(cancelAmount))
      : Math.round(parseFloat(payment.amount.toString()))

    if (cancelAmountValue <= 0) {
      return NextResponse.json(
        errorResponse('Cancel amount must be greater than 0', 400),
        { status: 400 }
      )
    }

    // Cancel payment with Toss
    let cancelResult
    try {
      cancelResult = await cancelPayment(payment.paymentKey, {
        cancelReason,
        cancelAmount: cancelAmountValue
      })
    } catch (tossError: any) {
      console.error('Toss payment cancellation error:', tossError)
      return NextResponse.json(
        errorResponse(tossError.message || 'Failed to cancel payment with Toss Payments', 500),
        { status: 500 }
      )
    }

    // Update payment status in database
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'canceled',
        tossStatus: cancelResult.status || 'CANCELED',
        failureReason: cancelReason
      }
    })

    // Update participants' payment status
    if (payment.participants.length > 0) {
      await Promise.all(
        payment.participants.map(participant =>
          prisma.meetingParticipant.update({
            where: { id: participant.id },
            data: {
              paymentStatus: 'pending',
              paymentId: null
            }
          })
        )
      )
    }

    return NextResponse.json(
      successResponse(
        {
          paymentId: updatedPayment.id,
          status: updatedPayment.status,
          cancelAmount: cancelAmountValue
        },
        'Payment canceled successfully'
      ),
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Payment cancellation error:', error)
    return NextResponse.json(
      errorResponse(error.message || 'Failed to cancel payment', 500),
      { status: 500 }
    )
  }
}
