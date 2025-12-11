'use client'

import React from 'react'
import { Box, Typography, Button } from '@mui/material'
import { useRouter, useSearchParams } from 'next/navigation'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

export default function PaymentFailPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const paymentKey = searchParams?.get('paymentKey')
    const orderId = searchParams?.get('orderId')
    const code = searchParams?.get('code')
    const message = searchParams?.get('message')

    const errorMessage = message || code || '결제에 실패했습니다.'

    return (
        <Box className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
            <Box className="text-center mb-8 max-w-md">
                {/* Error Icon */}
                <ErrorOutlineIcon
                    sx={{
                        fontSize: 80,
                        color: '#ef4444',
                        marginBottom: 2
                    }}
                />

                {/* Error Message */}
                <Typography
                    variant="h4"
                    className="font-bold text-black mb-3"
                    sx={{ fontSize: '1.75rem', fontWeight: 700 }}
                >
                    결제에 실패했습니다
                </Typography>

                <Typography
                    variant="body1"
                    className="text-gray-600 mb-6"
                    sx={{ fontSize: '1rem' }}
                >
                    {errorMessage}
                </Typography>

                {/* Error Details */}
                {(code || orderId) && (
                    <Box className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                        {code && (
                            <Typography variant="body2" className="text-gray-600 mb-2">
                                오류 코드: {code}
                            </Typography>
                        )}
                        {orderId && (
                            <Typography variant="body2" className="text-gray-600">
                                주문 번호: {orderId}
                            </Typography>
                        )}
                    </Box>
                )}

                {/* Action Buttons */}
                <Box className="flex flex-col gap-3">
                    <Button
                        variant="contained"
                        onClick={() => {
                            // Retry payment if orderId exists
                            if (orderId) {
                                router.push(`/payment/test?orderId=${orderId}`)
                            } else {
                                router.push('/')
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
                        다시 시도하기
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

                {/* Help Text */}
                <Typography
                    variant="body2"
                    className="text-gray-500 mt-6"
                    sx={{ fontSize: '0.875rem' }}
                >
                    문제가 계속되면 고객센터로 문의해주세요.
                </Typography>
            </Box>
        </Box>
    )
}

