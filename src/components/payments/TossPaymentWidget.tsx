/**
 * Toss Payments Widget Component
 * 
 * A React component that integrates Toss Payments SDK to open payment windows.
 * 
 * Usage:
 * <TossPaymentWidget
 *   clientKey="test_ck_..."
 *   paymentKey="payment_key_from_api"
 *   orderId="ORDER-123"
 *   amount={15000}
 *   orderName="테스트 결제"
 *   onSuccess={(paymentKey, orderId) => {...}}
 *   onFail={(error) => {...}}
 * />
 * 
 * Reference: https://docs.tosspayments.com/en/integration
 */

'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Box, Button, CircularProgress, Typography } from '@mui/material'

interface TossPaymentWidgetProps {
    clientKey: string
    paymentKey: string
    orderId: string
    amount: number
    orderName: string
    customerName?: string
    customerEmail?: string
    customerPhone?: string
    onSuccess?: (paymentKey: string, orderId: string) => void
    onFail?: (error: any) => void
}

declare global {
    interface Window {
        TossPayments: any
    }
}

export default function TossPaymentWidget({
    clientKey,
    paymentKey,
    orderId,
    amount,
    orderName,
    customerName,
    customerEmail,
    customerPhone,
    onSuccess,
    onFail
}: TossPaymentWidgetProps) {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const scriptLoadedRef = useRef(false)

    useEffect(() => {
        // Load Toss Payments SDK script
        if (scriptLoadedRef.current) {
            initializeWidget()
            return
        }

        const script = document.createElement('script')
        script.src = 'https://js.tosspayments.com/v1/payment'
        script.async = true

        script.onload = () => {
            scriptLoadedRef.current = true
            initializeWidget()
        }

        script.onerror = () => {
            setError('결제 위젯을 불러오는데 실패했습니다.')
            setLoading(false)
        }

        document.body.appendChild(script)

        return () => {
            // Cleanup script on unmount
            if (document.body.contains(script)) {
                document.body.removeChild(script)
            }
        }
    }, [clientKey, paymentKey, orderId, amount, orderName])

    const initializeWidget = () => {
        if (!window.TossPayments) {
            setError('Toss Payments SDK를 불러올 수 없습니다.')
            setLoading(false)
            return
        }

        try {
            // Initialize Toss Payments with client key
            const widget = new window.TossPayments(clientKey)

            // Get base URL
            const baseUrl = window.location.origin
            const successUrl = `${baseUrl}/payment/success?paymentKey={paymentKey}&orderId={orderId}&amount={amount}`
            const failUrl = `${baseUrl}/payment/fail?paymentKey={paymentKey}&orderId={orderId}&code={code}&message={message}`

            // Build payment request parameters
            const paymentParams: any = {
                amount: amount,
                orderId: orderId,
                orderName: orderName,
                successUrl: successUrl,
                failUrl: failUrl
            }

            // Add optional customer fields
            if (customerName) {
                paymentParams.customerName = customerName
            }
            if (customerEmail) {
                paymentParams.customerEmail = customerEmail
            }
            if (customerPhone) {
                paymentParams.customerMobilePhone = customerPhone
            }

            // Request payment (opens payment window)
            widget
                .requestPayment('CARD', paymentParams)
                .then(() => {
                    // Payment window opened successfully
                    setLoading(false)
                })
                .catch((err: any) => {
                    console.error('Payment request error:', err)
                    setError(err.message || '결제 요청에 실패했습니다.')
                    setLoading(false)
                    if (onFail) {
                        onFail(err)
                    }
                })
        } catch (err: any) {
            console.error('Widget initialization error:', err)
            setError(err.message || '결제 위젯 초기화에 실패했습니다.')
            setLoading(false)
            if (onFail) {
                onFail(err)
            }
        }
    }

    if (loading) {
        return (
            <Box className="flex flex-col items-center justify-center p-8">
                <CircularProgress />
                <Typography className="mt-4 text-gray-600">
                    결제 위젯을 불러오는 중...
                </Typography>
            </Box>
        )
    }

    if (error) {
        return (
            <Box className="flex flex-col items-center justify-center p-8">
                <Typography className="text-red-600 mb-4">{error}</Typography>
                <Button
                    variant="contained"
                    onClick={() => window.location.reload()}
                    className="bg-black text-white"
                >
                    다시 시도
                </Button>
            </Box>
        )
    }

    return (
        <Box className="w-full">
            <Typography className="text-center text-gray-600 mb-4">
                결제 창이 곧 열립니다...
            </Typography>
        </Box>
    )
}
