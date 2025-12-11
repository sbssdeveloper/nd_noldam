'use client'

import React from 'react'
import { Box, Typography, Button, Divider, IconButton, TextField } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { fetchMeetingDetail, clearMeetingDetail } from '@/store/slices/meetingDetailSlice'
import { meetingsApi } from '@/services/meetingsApi'
import { getCommunityBadgeDisplay } from '@/utils/badgeUtils'
import { NavigateBefore } from '@mui/icons-material';
import PageLoader from '@/components/PageLoader'

const cancelMeetingConfirmPage = () => {
    const router = useRouter()
    const { navigate } = useNavigation()
    const searchParams = useSearchParams()
    const meetingId = searchParams?.get('id')
    const isReadOnly = searchParams?.get('readonly') === '1'
    const dispatch = useAppDispatch()

    const { meetingData, loading } = useAppSelector((state) => state.meetingDetailReducer)
    const { user, token, isAuthenticated } = useAppSelector((state: any) => state.authReducer || {})

    const [joinStatus, setJoinStatus] = React.useState<any>(null)
    const [isLeaving, setIsLeaving] = React.useState(false)
    const [loadingJoinStatus, setLoadingJoinStatus] = React.useState(true)
    const [showAllMembers, setShowAllMembers] = React.useState(false)
    const [showCancelReasons, setShowCancelReasons] = React.useState(false)
    const [selectedReasons, setSelectedReasons] = React.useState<Set<number>>(new Set([0, 4]))
    const [otherReason, setOtherReason] = React.useState('')
    const [showUnderReview, setShowUnderReview] = React.useState(false)
    const [showCannotCancel, setShowCannotCancel] = React.useState(false)

    const goToProfile = React.useCallback((targetUserId?: number | null) => {
        if (!targetUserId) return
        navigate(`/profile?userId=${targetUserId}`)
    }, [navigate])

    // Fetch meeting data
    React.useEffect(() => {
        if (!meetingId) return

        dispatch(fetchMeetingDetail(Number(meetingId)))

        return () => {
            dispatch(clearMeetingDetail())
        }
    }, [meetingId, dispatch])

    // Check join status
    React.useEffect(() => {
        const checkJoinStatus = async () => {
            if (!meetingData?.id || !isAuthenticated || !token) {
                setLoadingJoinStatus(false)
                return
            }

            try {
                setLoadingJoinStatus(true)
                const data = await meetingsApi.checkJoinStatus(meetingData.id)
                if (data && data.success) {
                    setJoinStatus(data)
                }
            } catch (error) {
                // Error checking join status
            } finally {
                setLoadingJoinStatus(false)
            }
        }

        checkJoinStatus()
    }, [meetingData?.id, isAuthenticated, token])

    // Calculate if cancellation is allowed (1 day before meeting, up to 4:59 PM)
    const canCancel = React.useMemo(() => {
        if (!meetingData?.meetingTime) return false

        const meetingTime = new Date(meetingData.meetingTime)
        const cancelDeadline = new Date(meetingTime.getTime() - 24 * 60 * 60 * 1000)

        const now = new Date()
        return now <= cancelDeadline
    }, [meetingData?.meetingTime])

    // Format date helpers
    const formatMeetingDate = (dateString: string) => {
        const date = new Date(dateString)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = date.getHours()
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const ampm = hours >= 12 ? '오후' : '오전'
        const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
        const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]

        return {
            full: `${year} / ${month} / ${day} (${dayOfWeek}) 1회`,
            time: `${displayHours}:${minutes} (${ampm})`
        }
    }

    const formatPaymentDate = (dateString: string) => {
        if (!dateString) return '참여 완료'
        const date = new Date(dateString)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()
        return `${year}년 ${month}월 ${day}일 참여 완료`
    }

    // Handle leave meeting
    const handleLeaveMeeting = async (showModalAfterSuccess = false) => {
        if (isReadOnly) return
        if (!meetingId || !isAuthenticated) return

        try {
            setIsLeaving(true)
            const success = await meetingsApi.leaveMeeting(Number(meetingId))
            if (success) {
                if (showModalAfterSuccess) {
                    setShowCancelReasons(false)
                    setShowUnderReview(true)
                } else {
                    router.back()
                }
            } else {
                alert('모임 취소에 실패했습니다.')
            }
        } catch (error) {
            alert('모임 취소 중 오류가 발생했습니다.')
        } finally {
            setIsLeaving(false)
        }
    }

    // Redirect if user hasn't joined
    React.useEffect(() => {
        if (!loadingJoinStatus && joinStatus && !joinStatus.alreadyJoined && meetingId) {
            router.push(`/meeting/item-detail/${meetingId}`)
        }
    }, [loadingJoinStatus, joinStatus, meetingId, router])

    // Show loading state
    if (loading || loadingJoinStatus || !meetingData) {
        return <PageLoader />
    }

    // Show loading if user hasn't joined (while redirecting)
    if (!joinStatus?.alreadyJoined) {
        return <PageLoader />
    }

    const dateInfo = formatMeetingDate(meetingData.meetingTime)
    const participantCount = meetingData.participants?.length || 0
    const participantRecord = meetingData.participants?.find((p: any) => p.userId === user?.id)
    const paymentDate = participantRecord?.joinedOn || meetingData.createdAt

    // Handle cancel button click - different behavior based on deadline
    const handleCancelClick = () => {
        if (isReadOnly) return
        if (canCancel) {
            setShowCancelReasons(true)
        } else {
            setShowCannotCancel(true)
        }
    }

    return (
        <Box>
            <Box className='fixed inset-0 bg-gray-100 flex flex-col' style={{ zIndex: 70 }}>
                {/* Header */}
                <Box className='flex items-center justify-between px-2 py-3 border-b border-gray-200'>
                    <Box className='flex items-center' onClick={() => router.back()}>
                        <IconButton className='p-0 mr-1'>
                            <i className='ri-arrow-left-s-line text-2xl' />
                        </IconButton>
                        <Typography variant='subtitle1' className='font-semibold text-gray-800'>모임 내역</Typography>
                    </Box>
                </Box>

                {/* Content */}
                <Box className='bg-gray-100 flex-1 overflow-y-auto px-4 py-4'>
                    {/* Ticket card */}
                    <Box className='bg-white rounded-xl p-3 m-6 flex items-center justify-between'>
                        <Box className='flex flex-col gap-5 justify-between'>
                            <Box>
                                <img src="/images/custom/nd-logo.png" alt="ticket" className='w-12 ' />
                                <Typography variant='subtitle2' className='text-gray-900 font-semibold'>{meetingData.meetingName}</Typography>
                            </Box>
                            <Box>
                                <Typography fontSize={10} className='text-gray-500 block mt-2'>{dateInfo.full}</Typography>
                                <Typography fontSize={10} className='text-gray-500 block'>{dateInfo.time}</Typography>
                                <Typography fontSize={10} className='text-gray-500 block'>참가비 : 무료</Typography>
                            </Box>
                        </Box>
                        {/* Fake barcode */}
                        <Box className='w-20 h-32 rounded-md flex items-center justify-center'>
                            <Box className='w-12 space-y-1'>
                                {Array.from({ length: 16 }).map((_, i) => (
                                    <Box key={i} className='h-1 bg-gray-300 rounded' />
                                ))}
                            </Box>
                        </Box>
                    </Box>

                    <Box className="p-4 my-2 bg-white rounded-lg">
                        {/* Title under card */}
                        <Typography variant='subtitle1' className='text-black font-semibold mt-6'>{meetingData.meetingName}</Typography>
                        <Divider className='my-3' />

                        {/* Payment meta */}
                        <Box className='space-y-1'>
                            <Typography variant='body2' className='text-gray-700'>{formatPaymentDate(paymentDate)}</Typography>
                            <Typography variant='body2' className='text-gray-700'>참가비 : 무료</Typography>
                        </Box>
                        <Divider className='mt-3' />

                        {/* Amount rows */}
                        <Box className='mt-4'>
                            <Box className='flex items-center justify-between py-2'>
                                <Typography variant='body2' className='text-gray-700'>참가비</Typography>
                                <Typography variant='body2' className='text-gray-700'>무료</Typography>
                            </Box>
                            <Box className='flex items-center justify-between py-2'>
                                <Typography variant='subtitle2' className='text-black font-semibold'>총 금액</Typography>
                                <Typography variant='subtitle2' className='text-black font-semibold'>무료</Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Members Section - Always visible */}
                    <Box className='bg-white rounded-lg p-4 mb-4'>
                        <Typography variant='subtitle2' className='text-gray-900 font-medium mb-2'>멤버 {participantCount}</Typography>
                        <Divider className='my-2' />
                        <Box className='space-y-3'>
                            {(showAllMembers
                                ? (meetingData.participants || [])
                                : (meetingData.participants || []).slice(0, 3)
                            ).map((participant: any, index: number) => (
                                <Box
                                    key={participant.id ?? `participant-${participant.user?.id ?? index}`}
                                    className='flex items-center gap-3 cursor-pointer'
                                    onClick={() => goToProfile(participant.user?.id)}
                                >
                                    <Box className='w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden'>
                                        {participant.user?.profileImage ? (
                                            <img
                                                src={participant.user.profileImage}
                                                alt={participant.user.nickname || 'User'}
                                                className='w-full h-full object-cover'
                                            />
                                        ) : (
                                            <i className='ri-user-line text-gray-500' />
                                        )}
                                    </Box>
                                    <Box className='flex-1 min-w-0'>
                                        <Box className='flex items-center gap-1 min-w-0'>
                                            <Typography
                                                variant='body2'
                                                className='font-semibold text-black truncate hover:underline'
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    goToProfile(participant.user?.id)
                                                }}
                                            >
                                                {participant.user?.nickname || 'User Name'}
                                            </Typography>
                                            {(() => {
                                                const badgeDisplay = getCommunityBadgeDisplay(participant.user?.activeCommunityBadge)
                                                if (!badgeDisplay) return null
                                                return (
                                                    <img
                                                        src={badgeDisplay.image}
                                                        alt={badgeDisplay.label}
                                                        width={20}
                                                        height={20}
                                                        className='flex-shrink-0 object-contain'
                                                        title={`커뮤니티 등급: ${badgeDisplay.label}`}
                                                    />
                                                )
                                            })()}
                                        </Box>
                                        {participant.user?.statusMessage && (
                                            <Typography
                                                variant='caption'
                                                className='text-gray-500 truncate block'
                                                sx={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    maxWidth: '100%'
                                                }}
                                            >
                                                {participant.user.statusMessage}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                        {participantCount > 3 && (
                            <Button
                                variant='text'
                                size='small'
                                className='mt-3 w-full'
                                onClick={() => setShowAllMembers(!showAllMembers)}
                                sx={{
                                    borderColor: '#E5E7EB',
                                    color: '#000',
                                    '&:hover': { borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' }
                                }}
                            >
                                {showAllMembers ? '멤버 접기' : '멤버 더보기'}
                            </Button>
                        )}
                    </Box>

                    {/* Schedule Section */}
                    <Box className='bg-white rounded-lg p-4 mb-4'>
                        <Typography variant='subtitle2' className='text-gray-900 font-medium mb-2'>일정</Typography>
                        <Divider className='my-2' />
                        <Box className='space-y-4'>
                            <Box className='flex items-center gap-4'>
                                <Box className='flex flex-col items-center'>
                                    <Typography variant='h6' className='text-red-500 font-medium'>
                                        {new Date(meetingData.meetingTime).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                                    </Typography>
                                    <Typography variant='h3' className='text-gray-900 font-bold'>
                                        {new Date(meetingData.meetingTime).getDate()}
                                    </Typography>
                                </Box>
                                <Box className='flex-1'>
                                    <Typography variant='body2' className='text-gray-900 font-medium'>{meetingData.meetingName}</Typography>
                                    <Typography variant='caption' className='text-orange-500'>모집중</Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Box>

                    {/* Bottom actions */}
                    <Box className='flex gap-3 mt-6'>
                        <Button
                            fullWidth
                            variant='contained'
                            onClick={() => window.open('https://support.thenoldam.com/')}
                            disabled={isReadOnly}
                            sx={{
                                backgroundColor: '#E5E7EB',
                                color: '#111827',
                                boxShadow: 'none',
                                opacity: isReadOnly ? 0.6 : 1,
                                cursor: isReadOnly ? 'not-allowed' : 'pointer',
                                '&:hover': { backgroundColor: '#D1D5DB' }
                            }}
                        >
                            문의하기
                        </Button>
                        <Button
                            fullWidth
                            variant='contained'
                            onClick={handleCancelClick}
                            disabled={isReadOnly || isLeaving}
                            sx={{
                                backgroundColor: '#111827',
                                color: '#fff',
                                boxShadow: 'none',
                                opacity: isReadOnly ? 0.6 : 1,
                                cursor: isReadOnly ? 'not-allowed' : 'pointer',
                                '&:hover': { backgroundColor: '#0A0F1A' }
                            }}
                        >
                            취소하기
                        </Button>
                    </Box>
                </Box>
            </Box>

            {/* Cancel Reasons Modal */}
            {showCancelReasons && (
                <Box className='fixed inset-0 bg-white flex flex-col' style={{ zIndex: 80 }}>
                    {/* Header */}
                    <Box className='flex items-center justify-between px-2 py-3 border-b border-gray-200'>
                        <Box className='flex items-center'>
                            <IconButton onClick={() => { setShowCancelReasons(false) }} className='p-0 mr-1'>
                                <i className='ri-arrow-left-s-line text-2xl' />
                            </IconButton>
                            <Typography variant='subtitle1' className='font-semibold text-gray-800'>모임 취소하기</Typography>
                        </Box>
                    </Box>

                    {/* Content */}
                    <Box className='flex-1 overflow-y-auto px-4 py-4'>
                        <Typography variant='h5' className='text-gray-900 ml-4 font-bold'>취소하신다니 아쉬워요</Typography>
                        <Typography variant='body2' className='text-gray-600 mt-1 ml-4'>취소 사유에 가능한 모두 체크해주세요</Typography>

                        {/* Reasons list */}
                        <Box className='mt-4 space-y-2'>
                            {[
                                '일정에 참여할 수 없게 되었어요',
                                '마음이 바뀌었어요',
                                '모임을 착각했어요',
                                '모임 참여 비용이 너무 비싸요',
                            ].map((label, idx) => {
                                const checked = selectedReasons.has(idx)
                                return (
                                    <Box key={idx} onClick={() => {
                                        const next = new Set(selectedReasons)
                                        if (checked) next.delete(idx); else next.add(idx)
                                        setSelectedReasons(next)
                                    }} className={`flex items-center justify-start border rounded px-3 py-3 cursor-pointer ${checked ? 'bg-blue-50 border-blue-200' : 'border-none'}`}>
                                        <Box className={`w-5 h-5 rounded-full border-2 mr-2 flex items-center justify-center ${checked ? 'border-blue-600' : 'border-gray-300'}`}>
                                            <i className={`ri-check-line ${checked ? 'text-blue-600' : 'text-transparent'} text-sm`} />
                                        </Box>
                                        <Typography variant='body2' className={`${checked ? 'text-blue-700' : 'text-gray-800'}`}>{label}</Typography>
                                    </Box>
                                )
                            })}
                        </Box>

                        {/* Other reason as a checkbox with conditional input */}
                        <Box className='mt-2'>
                            <Box onClick={() => {
                                const next = new Set(selectedReasons)
                                if (next.has(5)) next.delete(5); else next.add(5)
                                setSelectedReasons(next)
                            }} className={`flex items-center justify-start border rounded px-3 py-3 cursor-pointer ${selectedReasons.has(5) ? 'bg-blue-50 border-blue-200' : 'border-none'}`}>
                                <Box className={`w-5 h-5 border-2 rounded-full mr-2 flex items-center justify-center ${selectedReasons.has(5) ? 'border-blue-600' : 'border-gray-300'}`}>
                                    <i className={`ri-check-line ${selectedReasons.has(5) ? 'text-blue-600' : 'text-transparent'} text-sm`} />
                                </Box>
                                <Typography variant='body2' className={`${selectedReasons.has(5) ? 'text-blue-700' : 'text-gray-800'}`}>기타 사유 (작성해주세요)</Typography>
                            </Box>
                            {selectedReasons.has(5) && (
                                <Box className='mt-2'>
                                    <TextField
                                        value={otherReason}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtherReason(e.target.value)}
                                        fullWidth
                                        placeholder=''
                                        size='small'
                                        InputProps={{ className: 'bg-white' }}
                                    />
                                </Box>
                            )}
                        </Box>

                        {/* Note */}
                        <Typography variant='caption' className='text-gray-500 block text-center mt-6'>검토 후 취소 처리가 진행돼요</Typography>

                        {/* Bottom actions */}
                        <Box className='flex gap-3 mt-6'>
                            <Button
                                fullWidth
                                variant='contained'
                                onClick={() => setShowCancelReasons(false)}
                                sx={{ backgroundColor: '#E5E7EB', color: '#111827', boxShadow: 'none', '&:hover': { backgroundColor: '#D1D5DB' } }}
                            >
                                돌아가기
                            </Button>
                            <Button
                                fullWidth
                                variant='contained'
                                onClick={() => handleLeaveMeeting(true)}
                                disabled={isReadOnly || isLeaving}
                                sx={{ backgroundColor: '#111827', color: '#fff', boxShadow: 'none', '&:hover': { backgroundColor: '#0A0F1A' } }}
                            >
                                {isLeaving ? '처리중...' : '취소하기'}
                            </Button>
                        </Box>
                    </Box>
                </Box>
            )}

            {/* Under Review Modal */}
            {showUnderReview && (
                <Box className='fixed inset-0 bg-white flex flex-col' style={{ zIndex: 90 }}>
                    {/* Header */}
                    <Box className='flex items-center justify-between px-2 py-3 border-b border-gray-200'>
                        <Box className='flex items-center'>
                            <IconButton onClick={() => { setShowUnderReview(false) }} className='p-0 mr-1'>
                                <i className='ri-arrow-left-s-line text-2xl' />
                            </IconButton>
                            <Typography variant='subtitle1' className='font-semibold text-gray-800'>모임 내역</Typography>
                        </Box>
                    </Box>

                    {/* Content */}
                    <Box className='flex-1 overflow-y-auto px-4 py-4'>
                        {/* Ticket card */}
                        <Box className='bg-gray-100 rounded-xl p-3 m-6 flex items-center justify-between'>
                            <Box className='flex flex-col gap-5 justify-between'>
                                <Box>
                                    <img src="/images/custom/nd-logo.png" alt="ticket" className='w-12 ' />
                                    <Typography variant='subtitle2' className='text-gray-900 font-semibold'>{meetingData.meetingName}</Typography>
                                </Box>
                                <Box>
                                    <Typography fontSize={10} className='text-gray-500 block mt-2'>{dateInfo.full}</Typography>
                                    <Typography fontSize={10} className='text-gray-500 block'>{dateInfo.time}</Typography>
                                    <Typography fontSize={10} className='text-gray-500 block'>참가비 : 무료</Typography>
                                </Box>
                            </Box>
                            {/* Fake barcode */}
                            <Box className='w-20 h-32 rounded-md flex items-center justify-center'>
                                <Box className='w-12 space-y-1'>
                                    {Array.from({ length: 16 }).map((_, i) => (
                                        <Box key={i} className='h-1 bg-gray-300 rounded' />
                                    ))}
                                </Box>
                            </Box>
                        </Box>

                        {/* Title under card */}
                        <Typography variant='subtitle1' className='text-black font-semibold mt-6'>{meetingData.meetingName}</Typography>
                        <Divider className='my-3' />

                        {/* Payment meta */}
                        <Box className='space-y-1'>
                            <Typography variant='body2' className='text-gray-700'>{formatPaymentDate(paymentDate)}</Typography>
                            <Typography variant='body2' className='text-gray-700'>참가비 : 무료</Typography>
                        </Box>

                        {/* Amount rows */}
                        <Box className='mt-4'>
                            <Divider />
                            <Box className='flex items-center justify-between py-2'>
                                <Typography variant='body2' className='text-gray-700'>참가비</Typography>
                                <Typography variant='body2' className='text-gray-700'>무료</Typography>
                            </Box>
                            <Box className='flex items-center justify-between py-2'>
                                <Typography variant='subtitle2' className='text-black font-semibold'>총 금액</Typography>
                                <Typography variant='subtitle2' className='text-black font-semibold'>무료</Typography>
                            </Box>
                            <Divider />
                        </Box>

                        {/* Review note */}
                        <Box className='mt-4 text-center'>
                            <Typography variant='body2' className='text-gray-700'>취소 검토 중이에요</Typography>
                        </Box>

                        {/* Bottom actions */}
                        <Box className='flex gap-3 mt-8'>
                            <Button
                                fullWidth
                                variant='contained'
                                onClick={() => navigate(`/meeting/item-detail/${meetingId}`)}
                                disabled={isReadOnly}
                                sx={{ backgroundColor: '#E5E7EB', color: '#111827', boxShadow: 'none', '&:hover': { backgroundColor: '#D1D5DB' } }}
                            >
                                돌아가기
                            </Button>
                            <Button
                                fullWidth
                                variant='contained'
                                onClick={() => {
                                    // TODO: Implement restore meeting functionality
                                    setShowUnderReview(false)
                                    router.push(`/meeting/item-detail/${meetingId}`)
                                }}
                                disabled={isReadOnly}
                                sx={{ backgroundColor: '#111827', color: '#fff', boxShadow: 'none', '&:hover': { backgroundColor: '#0A0F1A' } }}
                            >
                                복구하기
                            </Button>
                        </Box>
                    </Box>
                </Box>
            )}

            {showCannotCancel && (
                <Box className='fixed inset-0 bg-white flex flex-col' style={{ zIndex: 85 }}>
                    <Box className='flex items-center justify-between px-2 py-3 border-b border-gray-200'>
                        <Box className='flex items-center'>
                            <IconButton onClick={() => { setShowCannotCancel(false); if (!showCancelReasons) router.back() }} className='p-0 mr-1'>
                                <i className='ri-arrow-left-s-line text-2xl' />
                            </IconButton>
                            <Typography variant='subtitle1' className='font-semibold text-gray-800'>모임 내역</Typography>
                        </Box>
                    </Box>

                    <Box className='flex-1 overflow-y-auto px-4 py-4'>
                        <Box className='bg-gray-100 rounded-xl p-3 m-6 flex items-center justify-between'>
                            <Box className='flex flex-col gap-5 justify-between'>
                                <Box>
                                    <img src="/images/custom/nd-logo.png" alt="ticket" className='w-12 ' />
                                    <Typography variant='subtitle2' className='text-gray-900 font-semibold'>{meetingData.meetingName}</Typography>
                                </Box>
                                <Box>
                                    <Typography fontSize={10} className='text-gray-500 block mt-2'>{dateInfo.full}</Typography>
                                    <Typography fontSize={10} className='text-gray-500 block'>{dateInfo.time}</Typography>
                                    <Typography fontSize={10} className='text-gray-500 block'>참가비 : 무료</Typography>
                                </Box>
                            </Box>
                            <Box className='w-20 h-32 rounded-md flex items-center justify-center'>
                                <Box className='w-12 space-y-1'>
                                    {Array.from({ length: 16 }).map((_, i) => (
                                        <Box key={i} className='h-1 bg-gray-300 rounded' />
                                    ))}
                                </Box>
                            </Box>
                        </Box>

                        <Typography variant='subtitle1' className='text-black font-semibold mt-6'>{meetingData.meetingName}</Typography>
                        <Divider className='my-3' />

                        <Box className='space-y-1'>
                            <Typography variant='body2' className='text-gray-700'>{formatPaymentDate(paymentDate)}</Typography>
                            <Typography variant='body2' className='text-gray-700'>참가비 : 무료</Typography>
                        </Box>

                        <Box className='mt-4'>
                            <Divider />
                            <Box className='flex items-center justify-between py-2'>
                                <Typography variant='body2' className='text-gray-700'>참가비</Typography>
                                <Typography variant='body2' className='text-gray-700'>무료</Typography>
                            </Box>
                            <Box className='flex items-center justify-between py-2'>
                                <Typography variant='subtitle2' className='text-black font-semibold'>총 금액</Typography>
                                <Typography variant='subtitle2' className='text-black font-semibold'>무료</Typography>
                            </Box>
                            <Divider />
                        </Box>

                        <Box className='mt-4 text-center'>
                            <Typography variant='body2' className='text-gray-700'>모임일로부터 1일 전에는 취소가 불가능해요</Typography>
                        </Box>

                        <Box className='flex justify-center gap-3 mt-8'>
                            <Button
                                variant='contained'
                                className='w-1/2'
                                onClick={() => { window.open('https://support.thenoldam.com/') }}
                                disabled={isReadOnly}
                                sx={{ backgroundColor: '#E5E7EB', color: '#111827', boxShadow: 'none', '&:hover': { backgroundColor: '#D1D5DB' } }}
                            >
                                문의하기
                            </Button>
                        </Box>
                    </Box>
                </Box>
            )}
        </Box>
    )
}

export default cancelMeetingConfirmPage
