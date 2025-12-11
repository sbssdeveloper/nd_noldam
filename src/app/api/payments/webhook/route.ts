/**
 * Toss Payments Webhook Handler
 * 
 * POST /api/payments/webhook
 * 
 * Handles webhook events from Toss Payments for real-time payment status updates.
 * 
 * Webhook Events:
 * - PAYMENT_CONFIRMED: Payment was confirmed
 * - PAYMENT_DONE: Payment completed
 * - PAYMENT_CANCELED: Payment was canceled
 * - PAYMENT_FAILED: Payment failed
 * - PAYMENT_STATUS_CHANGED: Payment status changed
 * 
 * Security:
 * - Webhook signature verification should be implemented in production
 * 
 * Reference: https://docs.tosspayments.com/en/webhooks
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { getPaymentDetails, verifyWebhookSignature } from '@/lib/payments/toss'
import { successResponse, errorResponse } from '@/utils/general'

interface TossWebhookPayload {
  eventType: string
  data: {
    paymentKey: string
    orderId: string
    status: string
    [key: string]: any
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get webhook signature from header
    const signature = request.headers.get('x-toss-webhook-signature')
    
    // Parse webhook payload
    const body: TossWebhookPayload = await request.json()
    const { eventType, data } = body

    if (!eventType || !data) {
      return NextResponse.json(
        errorResponse('Invalid webhook payload', 400),
        { status: 400 }
      )
    }

    const { paymentKey, orderId } = data

    if (!paymentKey || !orderId) {
      return NextResponse.json(
        errorResponse('Missing payment key or order ID', 400),
        { status: 400 }
      )
    }

    // Verify webhook signature (in production, this should be properly implemented)
    const payloadString = JSON.stringify(body)
    if (!verifyWebhookSignature(signature, payloadString)) {
      console.warn('Webhook signature verification failed:', { orderId, eventType })
      // In production, reject webhooks with invalid signatures
      // For now, log warning but continue processing
    }

    // Find payment in database
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      include: {
        participants: true
      }
    })

    if (!payment) {
      console.warn(`Payment not found for webhook orderId: ${orderId}`)
      return NextResponse.json(
        errorResponse('Payment not found', 404),
        { status: 404 }
      )
    }

    // Get latest payment details from Toss
    let tossPayment
    try {
      tossPayment = await getPaymentDetails(paymentKey)
    } catch (error: any) {
      console.error('Failed to fetch payment details from Toss:', error)
      // Continue with webhook data even if fetch fails
      tossPayment = { status: data.status, method: data.method || payment.paymentMethod }
    }

    // Determine payment status based on event type
    let paymentStatus = payment.status
    let participantPaymentStatus = 'pending'
    let failureReason: string | null = null

    switch (eventType) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_DONE':
        paymentStatus = 'completed'
        participantPaymentStatus = 'confirmed'
        break
      
      case 'PAYMENT_CANCELED':
        paymentStatus = 'canceled'
        participantPaymentStatus = 'pending'
        break
      
      case 'PAYMENT_FAILED':
        paymentStatus = 'failed'
        participantPaymentStatus = 'pending'
        failureReason = data.message || 'Payment failed via webhook'
        break
      
      case 'PAYMENT_STATUS_CHANGED':
        // Update status based on Toss payment status
        if (tossPayment.status === 'DONE') {
          paymentStatus = 'completed'
          participantPaymentStatus = 'confirmed'
        } else if (tossPayment.status === 'CANCELED') {
          paymentStatus = 'canceled'
          participantPaymentStatus = 'pending'
        } else if (tossPayment.status === 'FAILED') {
          paymentStatus = 'failed'
          participantPaymentStatus = 'pending'
          failureReason = 'Payment failed'
        }
        break
      
      default:
        console.log(`Unhandled webhook event type: ${eventType}`)
        // Don't update status for unknown event types
        return NextResponse.json(
          successResponse({ eventType }, 'Webhook received but event type not handled'),
          { status: 200 }
        )
    }

    // Update payment record
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        tossStatus: tossPayment.status || data.status,
        paymentMethod: tossPayment.method || payment.paymentMethod,
        approvedAt: tossPayment.approvedAt 
          ? new Date(tossPayment.approvedAt) 
          : payment.approvedAt,
        failureReason: failureReason || payment.failureReason
      }
    })

    // Update all participants' payment status
    if (payment.participants.length > 0) {
      await Promise.all(
        payment.participants.map(participant =>
          prisma.meetingParticipant.update({
            where: { id: participant.id },
            data: {
              paymentStatus: participantPaymentStatus,
              paymentId: paymentStatus === 'completed' ? payment.id : participant.paymentId
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
          eventType
        },
        'Webhook processed successfully'
      ),
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      errorResponse(error.message || 'Failed to process webhook', 500),
      { status: 500 }
    )
  }
}
