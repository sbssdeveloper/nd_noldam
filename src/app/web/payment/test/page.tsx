'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
    Box,
    Typography,
    Button,
    TextField,
    Card,
    CardContent,
    Alert,
    CircularProgress
} from '@mui/material'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import CreditCardIcon from '@mui/icons-material/CreditCard'

export default function PaymentTestPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { token } = useAppSelector((state: any) => state.authReducer || {})

    // Get meetingId from URL if provided
    const urlMeetingId = searchParams?.get('meetingId')
    const [meetingId, setMeetingId] = useState(urlMeetingId || '0')
    const [amount, setAmount] = useState('15000')
    const [orderName, setOrderName] = useState('테스트 결제')
    const [customerName, setCustomerName] = useState('홍길동')
    const [customerEmail, setCustomerEmail] = useState('test@example.com')
    const [customerPhone, setCustomerPhone] = useState('01012345678')
    const [loading, setLoading] = useState(false)
    const [paymentData, setPaymentData] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    // Get client key from environment variables
    // All keys should be configured in .env file
    const clientKey = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq'


    // Validate client key format
    // Accept: test_ck_ (test keys from Toss dashboard), test_gck_docs (practice key), live_ck_
    useEffect(() => {
        const isValidClientKey = clientKey.startsWith('test_ck_') ||
            clientKey.startsWith('test_gck_') ||
            clientKey.startsWith('test_gsk_docs') ||  // Practice/documentation key
            clientKey.startsWith('live_ck_')

        if (!isValidClientKey) {
            console.error('[Test Page] ❌ ERROR: Invalid client key format!')
            console.error('[Test Page] Client key should start with: test_ck_, test_gck_, test_gsk_docs, or live_ck_')
            console.error('[Test Page] You provided:', clientKey.substring(0, 20) + '...')
        } else {
            console.log('[Test Page] ✅ Using client key:', clientKey.substring(0, 20) + '...')
            if (clientKey.startsWith('test_ck_')) {
                console.log('[Test Page] ℹ️ Using test key from Toss documentation')
            } else if (clientKey.startsWith('test_gck_') || clientKey.startsWith('test_gsk_docs')) {
                console.log('[Test Page] ℹ️ Using practice/documentation key - for site verification only')
            }
        }
    }, [clientKey])

    // Frontend-only payment flow using practice key (test_gck_docs)
    // NO API calls, NO SDK package, NO customer fields - only script tag
    const handleOpenPaymentWindow = useCallback(async () => {
        if (!amount || !orderName) {
            setError('금액과 주문명을 입력해주세요.')
            return
        }

        const amountValue = parseInt(amount)
        if (!amountValue || amountValue < 1000) {
            setError('금액은 최소 1,000원 이상이어야 합니다.')
            return
        }

        setLoading(true)
        setError(null)

        try {
            // Load script if needed
            if (!(window as any).TossPayments) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script')
                    script.src = 'https://js.tosspayments.com/v1/payment'
                    script.onload = resolve
                    script.onerror = () => reject(new Error('Failed to load Toss Payments SDK'))
                    document.body.appendChild(script)
                })
            }

            // Initialize with practice key (NO new, NO create - just call directly)
            const tossPayments = (window as any).TossPayments(clientKey)

            // Generate simple order ID
            const orderId = meetingId && meetingId !== '0'
                ? `ORDER-${meetingId}-${Date.now()}`
                : `ORDER-TEST-${Date.now()}`

            // Call requestPayment with minimal params ONLY
            // Version 1 SDK: amount is a number (not an object)
            // NO customer fields, NO extra options - test_gck_docs only supports basic params
            await tossPayments.requestPayment('CARD', {
                amount: amountValue,
                orderId: orderId,
                orderName: orderName.trim(),
                successUrl: window.location.origin + '/payment/success',
                failUrl: window.location.origin + '/payment/fail'
            })

            // Payment window opened - will redirect, so loading state cleared by redirect

        } catch (err: any) {
            console.error('[Test Page] ❌ Payment window error:', err)
            setError(err.message || '결제 창을 열 수 없습니다.')
            setLoading(false)
        }
    }, [amount, orderName, meetingId, clientKey])

    const handlePaymentSuccess = (paymentKey: string, orderId: string) => {
        console.log('Payment success:', { paymentKey, orderId })
        // Redirect will be handled by Toss widget
    }

    const handlePaymentFail = (error: any) => {
        console.error('Payment failed:', error)
        setError(error.message || '결제에 실패했습니다.')
    }

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
                        Toss Payments 테스트
                    </Typography>
                    <Typography variant="body1" className="text-gray-600">
                        결제를 테스트해보세요
                    </Typography>
                </Box>

                {/* Payment Form */}
                <Card className="mb-6" sx={{ boxShadow: 2 }}>
                    <CardContent className="p-6">
                        <Typography variant="h6" className="font-bold mb-4">
                            결제 정보 입력
                        </Typography>

                        <Box className="space-y-4">
                            <TextField
                                label="모임 ID (선택사항, 테스트는 0)"
                                type="number"
                                value={meetingId}
                                onChange={(e) => setMeetingId(e.target.value)}
                                fullWidth
                                helperText="실제 모임 결제를 테스트하려면 모임 ID를 입력하세요. 테스트 결제는 0을 사용하세요."
                                inputProps={{ min: 0 }}
                            />

                            <TextField
                                label="금액 (원)"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                fullWidth
                                required
                                helperText="최소 금액: 1,000원 (Toss Payments 최소 요구사항)"
                                inputProps={{ min: 1000, step: 1000 }}
                            />

                            <TextField
                                label="주문명"
                                value={orderName}
                                onChange={(e) => setOrderName(e.target.value)}
                                fullWidth
                                required
                            />

                            {/* Customer fields are collected but not used in test_gck_docs flow
                                They are kept for UI consistency but won't be sent to Toss */}
                            <TextField
                                label="고객명 (선택사항)"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                fullWidth
                                disabled
                                helperText="테스트 키에서는 사용되지 않습니다"
                            />

                            <TextField
                                label="이메일 (선택사항)"
                                type="email"
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                fullWidth
                                disabled
                                helperText="테스트 키에서는 사용되지 않습니다"
                            />

                            <TextField
                                label="전화번호 (선택사항)"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                fullWidth
                                placeholder="01012345678"
                                disabled
                                helperText="테스트 키에서는 사용되지 않습니다"
                            />

                            {error && (
                                <Alert severity="error" className="mt-4">
                                    {error}
                                </Alert>
                            )}

                            <Button
                                variant="contained"
                                onClick={handleOpenPaymentWindow}
                                disabled={loading || !amount || !orderName}
                                className="bg-black text-white"
                                fullWidth
                                sx={{
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    textTransform: 'none',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    marginTop: 2
                                }}
                            >
                                {loading ? <CircularProgress size={24} color="inherit" /> : '결제 창 열기'}
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    )
}

