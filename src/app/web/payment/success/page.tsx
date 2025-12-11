'use client'

import React from 'react'
import { Box, Typography, Button } from '@mui/material'
import PageLoader from '@/components/PageLoader'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import { paymentsApi } from '@/services/paymentsApi'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

export default function PaymentSuccessPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { token } = useAppSelector((state: any) => state.authReducer || {})
    const [loading, setLoading] = React.useState(true)
    const [paymentData, setPaymentData] = React.useState<any>(null)
    const [error, setError] = React.useState<string | null>(null)

    const paymentKey = searchParams?.get('paymentKey')
    const orderId = searchParams?.get('orderId')
    const amountFromUrl = searchParams?.get('amount')
    const meetingIdFromUrl = searchParams?.get('meetingId')

    React.useEffect(() => {
        const confirmPayment = async () => {
            if (!paymentKey || !orderId || !token) {
                setError('결제 정보가 없습니다.')
                setLoading(false)
                return
            }

            try {
                // Try to get payment from database (may not exist for frontend-only flow)
                let dbAmount = 0
                let meetingId: number | undefined = meetingIdFromUrl ? parseInt(meetingIdFromUrl) : undefined

                try {
                    const paymentResponse = await fetch(`/api/payments?orderId=${orderId}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })

                    if (paymentResponse.ok) {
                        const paymentInfo = await paymentResponse.json()
                        if (paymentInfo.success && paymentInfo.data) {
                            dbAmount = parseFloat(paymentInfo.data.amount?.toString() || '0')
                            // Get meeting ID from payment participants if exists
                            if (paymentInfo.data.participants?.[0]?.meetingId) {
                                meetingId = paymentInfo.data.participants[0].meetingId
                            }
                        }
                    }
                } catch (fetchError) {
                    // Payment may not exist in DB yet (frontend-only flow)
                    console.log('[Payment Success] Payment not found in DB, will be created during confirmation')
                }

                // Use amount from URL (as per Toss documentation)
                // Backend will verify it matches database amount (if payment exists)
                const amount = amountFromUrl ? parseFloat(amountFromUrl) : dbAmount

                // Confirm payment with Toss
                // Backend will verify amount matches original payment request
                const result = await paymentsApi.confirmPayment(
                    {
                        paymentKey,
                        orderId,
                        amount
                    },
                    token
                )

                if (result.success) {
                    const confirmedMeetingId = meetingId || (result.data as any)?.meetingId
                    setPaymentData({
                        ...result.data,
                        meetingId: confirmedMeetingId
                    })

                    // Automatically redirect to join-meeting-confirm page after successful payment
                    if (confirmedMeetingId) {
                        // Small delay to ensure state is set, then redirect
                        setTimeout(() => {
                            router.push(`/meeting/join-meeting-confirm?meetingId=${confirmedMeetingId}`)
                        }, 500)
                        return
                    }
                } else {
                    setError(result.error || '결제 확인에 실패했습니다.')
                }
            } catch (err: any) {
                console.error('Payment confirmation error:', err)
                setError(err.message || '결제 확인 중 오류가 발생했습니다.')
            } finally {
                setLoading(false)
            }
        }

        confirmPayment()
    }, [paymentKey, orderId, amountFromUrl, token])

    if (loading) {
        return <PageLoader />
    }

    if (error) {
        return (
            <Box className="min-h-screen bg-white flex items-center justify-center px-4">
                <Box className="text-center max-w-md">
                    <Typography variant="h6" className="text-red-600 mb-4">
                        {error}
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={() => router.push('/')}
                        className="bg-black text-white"
                    >
                        홈으로 돌아가기
                    </Button>
                </Box>
            </Box>
        )
    }

    return (
        <Box className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
            <Box className="text-center mb-8 max-w-md">
                {/* Success Icon */}
                <CheckCircleIcon
                    sx={{
                        fontSize: 80,
                        color: '#10b981',
                        marginBottom: 2
                    }}
                />

                {/* Success Message */}
                <Typography
                    variant="h4"
                    className="font-bold text-black mb-3"
                    sx={{ fontSize: '1.75rem', fontWeight: 700 }}
                >
                    결제가 완료되었습니다
                </Typography>

                <Typography
                    variant="body1"
                    className="text-gray-600 mb-6"
                    sx={{ fontSize: '1rem' }}
                >
                    결제가 성공적으로 처리되었습니다.
                </Typography>

                {/* Payment Details */}
                {paymentData && (
                    <Box className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                        <Typography variant="body2" className="text-gray-600 mb-2">
                            결제 방법: {paymentData.paymentMethod || '카드'}
                        </Typography>
                        {paymentData.approvedAt && (
                            <Typography variant="body2" className="text-gray-600">
                                결제 시간: {new Date(paymentData.approvedAt).toLocaleString('ko-KR')}
                            </Typography>
                        )}
                    </Box>
                )}

                {/* Action Buttons */}
                <Box className="flex flex-col gap-3">
                    <Button
                        variant="contained"
                        onClick={() => {
                            // If payment is for a meeting, redirect to meeting confirmation
                            if (paymentData?.meetingId) {
                                router.push(`/meeting/join-meeting-confirm?meetingId=${paymentData.meetingId}`)
                            } else {
                                router.push('/profile')
                            }
                        }}
                        className="bg-black text-white"
                        fullWidth
                        sx={{
                            padding: '12px 24px',
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontSize: '1rem',
                            fontWeight: 600
                        }}
                    >
                        {paymentData?.meetingId ? '모임 확인하기' : '내 모임 확인하기'}
                    </Button>

                    <Button
                        variant="outlined"
                        onClick={() => router.push('/')}
                        className="border-gray-300 text-gray-700"
                        fullWidth
                        sx={{
                            padding: '12px 24px',
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontSize: '1rem'
                        }}
                    >
                        홈으로 돌아가기
                    </Button>
                </Box>
            </Box>
        </Box>
    )
}

