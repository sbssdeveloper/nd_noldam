'use client'

import React from 'react'
import { Box } from '@mui/material'

interface PaymentSkeletonLoaderProps {
    show?: boolean
    contained?: boolean // If true, use relative positioning instead of fixed
}

const PaymentSkeletonLoader: React.FC<PaymentSkeletonLoaderProps> = ({ show = true, contained = false }) => {
    if (!show) return null

    return (
        <Box
            className={contained ? "relative bg-white flex items-center justify-center" : "fixed inset-0 bg-white flex items-center justify-center"}
            sx={{
                zIndex: contained ? 1 : 9999,
                width: contained ? '100%' : 'auto',
                height: contained ? '100%' : 'auto',
                animation: 'fadeIn 0.2s ease-in',
                '@keyframes fadeIn': {
                    from: { opacity: 0 },
                    to: { opacity: 1 }
                }
            }}
        >
            {/* Single Skeleton - Full Screen SVG Based */}
            <Box
                sx={{
                    width: '100%',
                    height: contained ? '100%' : '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <Box className="relative size-full">
                    <svg
                        className="block size-full"
                        fill="none"
                        preserveAspectRatio="none"
                        viewBox="0 0 159 283"
                    >
                        <defs>
                            <linearGradient id="skeletonGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#000000" stopOpacity="0.02" />
                                <stop offset="50%" stopColor="#000000" stopOpacity="0.44" />
                                <stop offset="100%" stopColor="#000000" stopOpacity="0.02" />
                                <animate
                                    attributeName="y1"
                                    values="100%;-100%"
                                    dur="0.8s"
                                    repeatCount="indefinite"
                                />
                                <animate
                                    attributeName="y2"
                                    values="200%;0%"
                                    dur="0.8s"
                                    repeatCount="indefinite"
                                />
                            </linearGradient>
                        </defs>
                        <g>
                            <path
                                d="M159 276.291C159 279.996 156.634 283 153.716 283H5.28399C2.36572 283 2.12772e-08 279.996 0 276.291V74.4095H159V276.291ZM153.716 0C156.634 9.82351e-08 159 3.00375 159 6.70905V67.0905H0V6.70905C6.80871e-07 3.00375 2.36572 9.82351e-08 5.28399 0H153.716Z"
                                fill="url(#skeletonGradient)"
                            />
                            <path
                                d="M0 74.4095H159C156.388 71.6834 156.499 70.0745 159 67.0905H0C2.55969 70.1821 2.72822 71.8001 0 74.4095Z"
                                fill="url(#skeletonGradient)"
                            />
                        </g>
                    </svg>
                </Box>
            </Box>
        </Box>
    )
}

export default PaymentSkeletonLoader

