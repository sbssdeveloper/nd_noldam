'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Alert,
    CircularProgress
} from '@mui/material'
import { useRouter, useParams } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import CreditCardIcon from '@mui/icons-material/CreditCard'

export default function MeetingPaymentPage() {
    const router = useRouter()
    const params = useParams()
    const { token, isAuthenticated } = useAppSelector((state: any) => state.authReducer || {})
    const meetingId = params?.meetingId ? params.meetingId as string : null

    const [meetingData, setMeetingData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [paymentLoading, setPaymentLoading] = useState(false)
    const [paymentInitiated, setPaymentInitiated] = useState(false) // Track if payment window was opened
    const [error, setError] = useState<string | null>(null)

    // Get client key from environment variables
    const clientKey = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq'

    // Fetch meeting data to get fee dynamically
    useEffect(() => {
        const fetchMeetingData = async () => {
            if (!meetingId || !token) {
                setError('모임 ID 또는 인증 정보가 없습니다.')
                setLoading(false)
                return
            }

            try {
                const response = await fetch(`/api/meetings/${meetingId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                if (!response.ok) {
                    throw new Error('모임 정보를 가져올 수 없습니다.')
                }

                const data = await response.json()
                const meeting = data.data || data

                if (!meeting) {
                    throw new Error('모임 정보를 찾을 수 없습니다.')
                }

                if (!meeting.hasFee) {
                    setError('이 모임은 참가비가 없습니다.')
                    setLoading(false)
                    return
                }

                if (!meeting.fee || parseFloat(meeting.fee.toString()) < 1000) {
                    setError('유효한 참가비 정보가 없습니다.')
                    setLoading(false)
                    return
                }

                setMeetingData(meeting)
            } catch (err: any) {
                console.error('Meeting fetch error:', err)
                setError(err.message || '모임 정보를 불러오는데 실패했습니다.')
            } finally {
                setLoading(false)
            }
        }

        if (isAuthenticated && token) {
            fetchMeetingData()
        } else {
            setError('로그인이 필요합니다.')
            setLoading(false)
        }
    }, [meetingId, token, isAuthenticated])

    // Payment flow: Use frontend SDK directly (like test page), then create payment record after success
    // This avoids duplicate payment creation issue
    const handleOpenPaymentWindow = useCallback(async () => {
        // Prevent multiple clicks
        if (paymentLoading || paymentInitiated) {
            return
        }

        if (!meetingData || !meetingData.fee || !token) {
            setError('결제 정보가 없습니다.')
            return
        }

        if (!meetingId) {
            setError('모임 ID가 없습니다.')
            return
        }

        const amountValue = parseFloat(meetingData.fee.toString())
        if (isNaN(amountValue) || amountValue < 1000) {
            setError('금액은 최소 1,000원 이상이어야 합니다.')
            return
        }

        const parsedMeetingId = parseInt(meetingId)
        if (isNaN(parsedMeetingId) || parsedMeetingId <= 0) {
            setError('유효하지 않은 모임 ID입니다.')
            return
        }

        // Disable button immediately to prevent multiple clicks
        setPaymentLoading(true)
        setPaymentInitiated(true)
        setError(null)

        try {
            // Load Toss Payments SDK script if needed
            if (!(window as any).TossPayments) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script')
                    script.src = 'https://js.tosspayments.com/v1/payment'
                    script.onload = resolve
                    script.onerror = () => reject(new Error('Failed to load Toss Payments SDK'))
                    document.body.appendChild(script)
                })
            }

            // Initialize Toss Payments
            const tossPayments = (window as any).TossPayments(clientKey)

            // Generate order ID (same format as API)
            const orderId = `ORDER-${parsedMeetingId}-${Date.now()}`

            // Call requestPayment directly (like test page)
            // Payment record will be created after success via payment confirmation
            // Note: Toss will append paymentKey, orderId, amount as query params automatically
            await tossPayments.requestPayment('CARD', {
                amount: amountValue,
                orderId: orderId,
                orderName: (meetingData.meetingName || '모임 참가비').trim().substring(0, 100),
                successUrl: `${window.location.origin}/payment/success?meetingId=${parsedMeetingId}`,
                failUrl: `${window.location.origin}/payment/fail?meetingId=${parsedMeetingId}`
            })

            // Payment window opened - will redirect, so button stays disabled
            // Note: If user closes the payment window, they can refresh the page to try again

        } catch (err: any) {
            console.error('[Meeting Payment] ❌ Payment window error:', err)
            setError(err.message || '결제 창을 열 수 없습니다.')
            // Re-enable button on error so user can try again
            setPaymentLoading(false)
            setPaymentInitiated(false)
        }
    }, [meetingData, meetingId, clientKey, token, paymentLoading, paymentInitiated])

    if (!isAuthenticated) {
        return (
            <Box className="min-h-screen bg-white flex items-center justify-center px-4">
                <Box className="text-center">
                    <Typography variant="h6" className="text-gray-600 mb-4">
                        로그인이 필요합니다.
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={() => router.push('/login')}
                        className="bg-black text-white"
                    >
                        로그인하기
                    </Button>
                </Box>
            </Box>
        )
    }

    if (loading) {
        return (
            <Box className="min-h-screen bg-gray-50 flex items-center justify-center">
                <CircularProgress />
            </Box>
        )
    }

    if (error && !meetingData) {
        return (
            <Box className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <Box className="text-center max-w-md">
                    <Typography variant="h6" className="text-red-600 mb-4">
                        {error}
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={() => router.back()}
                        className="bg-black text-white"
                    >
                        돌아가기
                    </Button>
                </Box>
            </Box>
        )
    }

    if (!meetingData) {
        return (
            <Box className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <Typography variant="body1" className="text-gray-600">
                    모임 정보를 찾을 수 없습니다.
                </Typography>
            </Box>
        )
    }

    const feeAmount = parseFloat(meetingData.fee.toString())

    return (
        <Box className="min-h-screen bg-gray-50 py-8 px-4">
            <Box className="max-w-2xl mx-auto">
                {/* Header */}
                <Box className="text-center mb-8">
                    <CreditCardIcon
                        sx={{
                            fontSize: 60,
                            color: '#6b7280',
                            marginBottom: 2
                        }}
                    />
                    <Typography
                        variant="h4"
                        className="font-bold text-black mb-2"
                        sx={{ fontSize: '1.75rem', fontWeight: 700 }}
                    >
                        모임 참가비 결제
                    </Typography>
                    <Typography variant="body1" className="text-gray-600">
                        {meetingData.meetingName}
                    </Typography>
                </Box>

                {/* Meeting Info Card */}
                <Card className="mb-6" sx={{ boxShadow: 2 }}>
                    <CardContent className="p-6">
                        <Typography variant="h6" className="font-bold mb-4">
                            결제 정보
                        </Typography>

                        <Box className="space-y-3">
                            <Box className="flex justify-between">
                                <Typography variant="body2" className="text-gray-600">
                                    모임명
                                </Typography>
                                <Typography variant="body2" className="text-gray-900 font-medium">
                                    {meetingData.meetingName}
                                </Typography>
                            </Box>

                            <Box className="flex justify-between">
                                <Typography variant="body2" className="text-gray-600">
                                    참가비
                                </Typography>
                                <Typography variant="body2" className="text-gray-900 font-bold">
                                    {feeAmount.toLocaleString()}원
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                {/* Error Display */}
                {error && (
                    <Alert severity="error" className="mb-6">
                        {error}
                    </Alert>
                )}

                {/* Payment Button */}
                <Card sx={{ boxShadow: 2 }}>
                    <CardContent className="p-6">
                        <Button
                            variant="contained"
                            onClick={handleOpenPaymentWindow}
                            disabled={paymentLoading || paymentInitiated || !meetingData || !feeAmount}
                            className="bg-black text-white"
                            fullWidth
                            sx={{
                                padding: '12px 24px',
                                borderRadius: '8px',
                                textTransform: 'none',
                                fontSize: '1rem',
                                fontWeight: 600,
                                '&:disabled': {
                                    backgroundColor: '#9ca3af',
                                    color: '#ffffff'
                                }
                            }}
                        >
                            {paymentLoading || paymentInitiated ? (
                                <>
                                    <CircularProgress size={24} color="inherit" sx={{ marginRight: 1 }} />
                                    결제 창 열기 중...
                                </>
                            ) : (
                                `${feeAmount.toLocaleString()}원 결제하기`
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Back Button */}
                <Box className="mt-6 text-center">
                    <Button
                        variant="outlined"
                        onClick={() => router.back()}
                        className="border-gray-300 text-gray-700"
                        sx={{
                            padding: '12px 24px',
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontSize: '1rem'
                        }}
                    >
                        돌아가기
                    </Button>
                </Box>
            </Box>
        </Box>
    )
}

