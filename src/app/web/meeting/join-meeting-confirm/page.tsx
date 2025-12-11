'use client'

import React from 'react'
import { Box, Typography, Button } from '@mui/material'
import { useRouter, useSearchParams } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import { useAppSelector } from '@/store/hooks'
import PaymentSkeletonLoader from '@/components/PaymentSkeletonLoader'
import PageLoader from '@/components/PageLoader'

export default function JoinMeetingConfirm() {
    const router = useRouter()
    const { navigate } = useNavigation()
    const searchParams = useSearchParams()
    const [meetingData, setMeetingData] = React.useState<any>(null)
    const [loading, setLoading] = React.useState(true)
    const [showSkeleton, setShowSkeleton] = React.useState(true)
    const { token } = useAppSelector((state: any) => state.authReducer || {})

    const meetingId = searchParams?.get('meetingId')

    // Show skeleton for 30 seconds, then show ticket card
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setShowSkeleton(false)
        }, 2000) // 30 seconds

        return () => clearTimeout(timer)
    }, [])

    // Fetch meeting data
    React.useEffect(() => {
        const fetchMeetingData = async () => {
            if (!meetingId || !token) return

            try {
                const response = await fetch(`/api/meetings/${meetingId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                const data = await response.json()
                setMeetingData(data)
            } catch (error) {
                // Error fetching meeting
            } finally {
                setLoading(false)
            }
        }

        fetchMeetingData()
    }, [meetingId, token])

    const formatMeetingDate = (dateString: string) => {
        const date = new Date(dateString)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()
        const hours = date.getHours()
        const minutes = date.getMinutes()
        return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}(${['일', '월', '화', '수', '목', '금', '토'][date.getDay()]}) 1회`
    }

    const formatMeetingTime = (dateString: string) => {
        const date = new Date(dateString)
        const hours = date.getHours()
        const minutes = date.getMinutes()
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }

    if (loading) {
        return <PageLoader />
    }

    if (!meetingData) {
        return (
            <Box className='min-h-screen bg-white flex items-center justify-center px-4'>
                <Typography variant='body1' className='text-gray-600'>
                    모임 정보를 찾을 수 없습니다.
                </Typography>
            </Box>
        )
    }

    return (
        <Box className='min-h-screen bg-white flex flex-col items-center justify-center px-4'>
            {/* Main Title - Exact spacing from original */}
            <Box className='text-center mb-20'>
                <Typography
                    variant='h4'
                    className='font-bold text-black mb-3'
                    sx={{ fontSize: '1.75rem', fontWeight: 700 }}
                >
                    티켓을 발급했어요
                </Typography>
                <Typography
                    variant='body1'
                    className='text-black'
                    sx={{ fontSize: '1rem', fontWeight: 400 }}
                >
                    MY에서 모임을 취소 및 변경할 수 있어요
                </Typography>
            </Box>

            {/* Ticket Card - Show skeleton or actual card */}
            {showSkeleton ? (
                <Box className='mb-20 w-full max-w-sm' sx={{ height: '200px', overflow: 'hidden' }}>
                    <PaymentSkeletonLoader show={true} contained={true} />
                </Box>
            ) : (
                <Box className='bg-gray-100 rounded-lg p-4 mb-20 w-full max-w-sm flex items-center justify-between'>
                    {/* Left Side - Content */}
                    <Box className='flex flex-col gap-5 flex-1'>
                        {/* Logo - Using actual image like host-meeting-detail */}
                        <Box>
                            <img src="/images/custom/nd-logo.png" alt="ticket" className='w-12 mb-2' />
                            <Typography
                                variant='subtitle1'
                                className='text-black font-bold'
                                sx={{
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    lineHeight: 1.2,
                                    wordWrap: 'break-word',
                                    overflowWrap: 'break-word'
                                }}
                            >
                                {meetingData.meetingName}
                            </Typography>
                        </Box>

                        {/* Event Details - Exact spacing from original */}
                        <Box className='space-y-1'>
                            <Typography
                                variant='body2'
                                className='text-black'
                                sx={{ fontSize: '0.7rem', fontWeight: 400 }}
                            >
                                {formatMeetingDate(meetingData.meetingTime)}
                            </Typography>
                            <Typography
                                variant='body2'
                                className='text-black'
                                sx={{ fontSize: '0.7rem', fontWeight: 400 }}
                            >
                                {formatMeetingTime(meetingData.meetingTime)}(오전)-{formatMeetingTime(new Date(new Date(meetingData.meetingTime).getTime() + meetingData.duration * 60000).toISOString())}(오후)
                            </Typography>
                            <Typography
                                variant='body2'
                                className='text-black'
                                sx={{ fontSize: '0.7rem', fontWeight: 400 }}
                            >
                                결제금액:{meetingData.hasFee ? `${Number(meetingData.fee).toLocaleString()}원` : '0원'}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Right Side - Barcode */}
                    <Box className='w-20 h-32 rounded-md flex items-center justify-center'>
                        <Box className='w-12 space-y-1'>
                            {Array.from({ length: 16 }).map((_, i) => (
                                <Box key={i} className='h-1 bg-gray-300 rounded' />
                            ))}
                        </Box>
                    </Box>
                </Box>
            )}

            {/* Confirmation Button - Exact spacing from original */}
            <Button
                variant='contained'
                className='w-full max-w-sm'
                onClick={() => navigate('/profile')}
                sx={{
                    backgroundColor: '#6B7280',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    fontWeight: 700,
                    padding: '12px 24px',
                    borderRadius: '8px',
                    textTransform: 'none',
                    boxShadow: 'none',
                    '&:hover': {
                        backgroundColor: '#4B5563',
                        boxShadow: 'none'
                    }
                }}
            >
                확인
            </Button>
        </Box>
    )
}
