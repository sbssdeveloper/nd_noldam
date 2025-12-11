/**
 * Confirm Payment API
 * 
 * POST /api/payments/confirm
 * 
 * Confirms a payment after the user completes payment in the Toss Payments window.
 * 
 * IMPORTANT: Verifies that the amount matches the original payment request
 * to prevent malicious amount manipulation on the client side.
 * 
 * Request Body:
 * - paymentKey: string (from successUrl query parameter)
 * - orderId: string (from successUrl query parameter)
 * - amount: number (from successUrl query parameter)
 * 
 * Response:
 * - paymentId: number
 * - status: string
 * - paymentMethod: string
 * - approvedAt: string
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/utils/auth'
import { prisma } from '@/utils/prisma'
import { confirmPayment } from '@/lib/payments/toss'
import { successResponse, errorResponse } from '@/utils/general'
import { sendMeetingJoinedNotification } from '@/lib/sms/biztalk'

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
    const { paymentKey, orderId, amount } = body

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json(
        errorResponse('Payment key, order ID, and amount are required', 400),
        { status: 400 }
      )
    }

    // Find payment in database
    let payment = await prisma.payment.findUnique({
      where: { orderId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                phoneNumber: true
              }
            },
            meeting: {
              select: {
                id: true,
                meetingName: true,
                userId: true
              }
            }
          }
        }
      }
    })

    // If payment doesn't exist in DB (frontend-only flow), create it after confirming with Toss
    // We'll create it below after getting payment details from Toss
    let shouldCreatePayment = !payment

    // If payment doesn't exist, we'll create it after confirming with Toss
    // For now, validate amount if payment exists
    if (payment) {
      // CRITICAL: Verify amount matches original payment request
      // This prevents malicious amount manipulation on the client side
      const originalAmount = parseFloat(payment.amount.toString())
      const receivedAmount = parseFloat(amount)

      if (Math.abs(originalAmount - receivedAmount) > 0.01) {
        // Allow small floating point differences (0.01 KRW)
        console.error('Amount mismatch detected:', {
          originalAmount,
          receivedAmount,
          orderId,
          paymentId: payment.id
        })
        
        return NextResponse.json(
          errorResponse('Payment amount mismatch. Please contact support.', 400),
          { status: 400 }
        )
      }

      // Check if payment is already confirmed
      if (payment.status === 'completed') {
        return NextResponse.json(
          successResponse(
            {
              paymentId: payment.id,
              status: payment.status,
              paymentMethod: payment.paymentMethod,
              approvedAt: payment.approvedAt,
              alreadyConfirmed: true
            },
            'Payment already confirmed'
          ),
          { status: 200 }
        )
      }
    }

    // Confirm payment with Toss
    let tossPayment
    try {
      // Use amount from request (for new payments) or existing payment amount
      const amountToConfirm = payment ? Math.round(parseFloat(payment.amount.toString())) : Math.round(parseFloat(amount))
      
      tossPayment = await confirmPayment({
        paymentKey,
        orderId,
        amount: amountToConfirm
      })
    } catch (tossError: any) {
      console.error('Toss payment confirmation error:', tossError)
      return NextResponse.json(
        errorResponse(tossError.message || 'Failed to confirm payment with Toss Payments', 500),
        { status: 500 }
      )
    }

    // Create payment record if it doesn't exist (frontend-only flow)
    if (shouldCreatePayment) {
      try {
        // Get user info
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

        // Extract meetingId from orderId format: ORDER-{meetingId}-{timestamp}
        const orderIdParts = orderId.split('-')
        const extractedMeetingId = orderIdParts.length >= 2 ? parseInt(orderIdParts[1]) : null

        payment = await prisma.payment.create({
          data: {
            type: 'meeting_fee',
            refNo: orderId,
            orderId: orderId,
            paymentKey: paymentKey,
            status: tossPayment.status === 'DONE' ? 'completed' : 'pending',
            amount: parseFloat(amount),
            tossStatus: tossPayment.status,
            paymentMethod: tossPayment.method || undefined,
            approvedAt: tossPayment.approvedAt ? new Date(tossPayment.approvedAt) : undefined,
            customerName: user?.nickname || undefined,
            customerEmail: user?.profile?.email || undefined,
            customerPhone: user?.phoneNumber || undefined
          },
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
                    meetingName: true,
                    userId: true
                  }
                }
              }
            }
          }
        })

        // Link payment to participant if meetingId exists
        if (extractedMeetingId && extractedMeetingId > 0) {
          const participant = await prisma.meetingParticipant.findFirst({
            where: {
              meetingId: extractedMeetingId,
              userId: userId,
              paymentStatus: 'pending'
            }
          })

          if (participant) {
            await prisma.meetingParticipant.update({
              where: { id: participant.id },
              data: {
                paymentId: payment.id,
                paymentStatus: tossPayment.status === 'DONE' ? 'confirmed' : 'pending'
              }
            })
            console.log('[Payment Confirm API] Created and linked payment to participant:', participant.id)
          }
        }
      } catch (createError: any) {
        console.error('[Payment Confirm API] Error creating payment record:', createError)
        // Continue even if creation fails - payment is already confirmed with Toss
      }
    }

    // Update payment status in database (if payment exists)
    if (payment) {
      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: tossPayment.status === 'DONE' ? 'completed' : payment.status,
          tossStatus: tossPayment.status,
          paymentMethod: tossPayment.method || payment.paymentMethod,
          approvedAt: tossPayment.approvedAt ? new Date(tossPayment.approvedAt) : payment.approvedAt
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  nickname: true,
                  phoneNumber: true
                }
              },
              meeting: {
                select: {
                  id: true,
                  meetingName: true,
                  userId: true
                }
              }
            }
          }
        }
      })
    }

    // Update participant payment status
    let meetingId: number | undefined
    if (payment && tossPayment.status === 'DONE' && payment.participants.length > 0) {
      await Promise.all(
        payment.participants.map(participant =>
          prisma.meetingParticipant.update({
            where: { id: participant.id },
            data: {
              paymentStatus: 'confirmed',
              paymentId: payment.id
            }
          })
        )
      )
      // Get meeting ID from first participant
      if (payment.participants[0]?.meetingId) {
        meetingId = payment.participants[0].meetingId
      }

      // Send KakaoTalk notification when payment is confirmed
      try {
        await Promise.all(
          payment.participants.map(async (participant) => {
            const participantUser = participant.user
            if (participantUser?.phoneNumber) {
              // Use approvedAt if available, otherwise use current date
              const paymentDate = payment.approvedAt || payment.date || new Date()
              await sendMeetingJoinedNotification({
                recipientPhone: participantUser.phoneNumber,
                participantName: participantUser.nickname || '회원',
                meetingName: participant.meeting?.meetingName || '모임',
                paymentDate: paymentDate,
                paymentAmount: parseFloat(payment.amount.toString()),
                paymentMethod: payment.paymentMethod || '카드',
                meetingId: participant.meetingId || meetingId
              })
              console.log('[Payment Confirm] KakaoTalk notification sent to participant:', participant.id)
            }
          })
        )
      } catch (kakaoError: any) {
        console.error('[Payment Confirm] Failed to send KakaoTalk notification:', kakaoError)
        // Don't fail payment confirmation if notification fails
      }
    }

    if (!payment) {
      return NextResponse.json(
        errorResponse('Payment record not found after creation', 500),
        { status: 500 }
      )
    }

    return NextResponse.json(
      successResponse(
        {
          paymentId: payment.id,
          status: payment.status,
          paymentMethod: payment.paymentMethod,
          approvedAt: payment.approvedAt,
          meetingId: meetingId
        },
        'Payment confirmed successfully'
      ),
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Payment confirmation error:', error)
    return NextResponse.json(
      errorResponse(error.message || 'Failed to confirm payment', 500),
      { status: 500 }
    )
  }
}
