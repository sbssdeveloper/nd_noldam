'use client'

import { Box, Typography, IconButton, CircularProgress } from '@mui/material'
import { useRouter, useSearchParams } from 'next/navigation'
import React from 'react'
import { meetingsApi, type MeetingSnapshot, type Meeting } from '@/services/meetingsApi'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { likePost as togglePostLike } from '@/store/slices/postSlice'
import PageLoader from '@/components/PageLoader'


const SnapFlowPage = () => {

    const router = useRouter()
    const searchParams = useSearchParams()
    const meetingIdParam = searchParams.get('meetingId')
    const meetingId = meetingIdParam ? parseInt(meetingIdParam, 10) : null

    const [snapshots, setSnapshots] = React.useState<MeetingSnapshot[]>([])
    const [meetingInfo, setMeetingInfo] = React.useState<Meeting | null>(null)
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [likePendingMap, setLikePendingMap] = React.useState<Record<number, boolean>>({})

    const dispatch = useAppDispatch()
    const { isAuthenticated } = useAppSelector((state: any) => state.authReducer || {})

    const hostDisplayName = React.useMemo(() => {
        if (!meetingInfo?.user) return null
        const user = meetingInfo.user as any
        if (user.nickname && typeof user.nickname === 'string' && user.nickname.trim().length > 0) {
            return user.nickname as string
        }
        return meetingInfo.user.name ?? null
    }, [meetingInfo?.user])

    React.useEffect(() => {
        if (!meetingId || Number.isNaN(meetingId)) {
            setError('잘못된 모임 정보입니다.')
            return
        }

        let cancelled = false
        const fetchData = async () => {
            try {
                setLoading(true)
                setError(null)
                const [snapData, meetingDetail] = await Promise.all([
                    meetingsApi.getMeetingSnapshots(meetingId, 50),
                    meetingsApi.getMeetingDetails(meetingId)
                ])
                if (!cancelled) {
                    const uniqueSnapshots: MeetingSnapshot[] = []
                    const seenPosts = new Set<number>()
                    for (const snap of snapData || []) {
                        if (snap && typeof snap.postId === 'number' && !seenPosts.has(snap.postId)) {
                            uniqueSnapshots.push(snap)
                            seenPosts.add(snap.postId)
                        }
                    }
                    setSnapshots(uniqueSnapshots)
                    setMeetingInfo(meetingDetail)
                }
            } catch (err) {
                if (!cancelled) {
                    setError('스냅 데이터를 불러오지 못했습니다.')
                    setSnapshots([])
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        fetchData()

        return () => {
            cancelled = true
        }
    }, [meetingId])

    const handleLikeClick = React.useCallback(async (event: React.MouseEvent, snap: MeetingSnapshot) => {
        event.stopPropagation()
        if (!isAuthenticated) {
            return
        }

        let alreadyPending = false
        setLikePendingMap((prev) => {
            if (prev[snap.postId]) {
                alreadyPending = true
                return prev
            }
            return { ...prev, [snap.postId]: true }
        })

        if (alreadyPending) {
            return
        }

        try {
            const result = await dispatch(togglePostLike({ postId: snap.postId.toString() })).unwrap()
            setSnapshots((prev) =>
                prev.map((item) =>
                    item.postId === snap.postId
                        ? {
                            ...item,
                            isLiked: result.liked,
                            likeCount: result.likeCount
                        }
                        : item
                )
            )
        } catch (err) {
            // No-op: global slices handle errors; keep UI unchanged on failure
        } finally {
            setLikePendingMap((prev) => {
                const { [snap.postId]: _removed, ...rest } = prev
                return rest
            })
        }
    }, [dispatch, isAuthenticated])

    return (
        <Box className='fixed inset-0 bg-white flex flex-col' style={{ zIndex: 80 }}>
            {/* Header */}
            <Box className='flex items-center justify-between px-2 py-3 border-b border-gray-200'>
                <Box className='flex items-center' onClick={() => router.back()}>
                    <IconButton className='p-0 mr-1'>
                        <i className='ri-arrow-left-s-line text-2xl' />
                    </IconButton>
                    <Typography variant='subtitle1' className='font-semibold text-gray-800'>모임 스냅 모아보기</Typography>
                </Box>
            </Box>

            {/* Content */}
            <Box className='flex-1 overflow-y-auto py-4'>
                {/* Top info row */}
                <Box className='flex items-center gap-3 pb-6 mb-2 px-3'>
                    <Box className='w-24 h-16 rounded-md bg-gray-200 overflow-hidden'>
                        {meetingInfo?.meetingBackground ? (
                            <img
                                src={meetingInfo.meetingBackground}
                                alt={meetingInfo.meetingName}
                                className='w-full h-full object-cover'
                            />
                        ) : null}
                    </Box>
                    <Box className='flex-1 min-w-0'>
                        <Typography variant='body1' className='text-gray-900 font-semibold truncate'>
                            {meetingInfo?.meetingName || '모임 정보'}
                        </Typography>
                        {hostDisplayName && (
                            <Typography variant='caption' className='text-gray-500'>
                                {hostDisplayName}
                            </Typography>
                        )}
                    </Box>
                </Box>

                {loading ? (
                    <PageLoader />
                ) : error ? (
                    <Box className='flex justify-center items-center py-10 px-3 text-center'>
                        <Typography variant='body2' className='text-red-500'>{error}</Typography>
                    </Box>
                ) : snapshots.length === 0 ? (
                    <Box className='flex justify-center items-center py-10 px-3 text-center'>
                        <Typography variant='body2' className='text-gray-500'>아직 모임을 태그한 게시물이 없습니다.</Typography>
                    </Box>
                ) : (
                    <Box className='grid grid-cols-2'>
                        {snapshots.map((snap) => {
                            const iconColor = snap.isLiked ? '#ef4444' : '#ffffff'
                            const isPending = Boolean(likePendingMap[snap.postId])
                            const likeCount = snap.likeCount ?? 0

                            return (
                                <Box
                                    key={`snap-flow-${snap.postId}-${snap.imageUrl}`}
                                    className='relative cursor-pointer overflow-hidden bg-gray-100'
                                    style={{ width: '100%', height: '124px' }}
                                    onClick={() => router.push(`/post/${snap.postId}`)}
                                >
                                    <img
                                        src={snap.imageUrl}
                                        alt='meeting snap'
                                        className='w-full h-full object-cover'
                                    />
                                    {/* <IconButton
                                        size='small'
                                        className='absolute top-2 right-2'
                                        onClick={(event) => handleLikeClick(event, snap)}
                                        disabled={!isAuthenticated || isPending}
                                        sx={{
                                            backgroundColor: 'rgba(0,0,0,0.45)',
                                            color: iconColor,
                                            '&:hover': {
                                                backgroundColor: 'rgba(0,0,0,0.6)'
                                            },
                                            '&.Mui-disabled': {
                                                backgroundColor: 'rgba(0,0,0,0.35)',
                                                color: iconColor,
                                                opacity: 0.8
                                            }
                                        }}
                                    > */}
                                    {/* <Box className='absolute bottom-2 right-2 bg-black/60 font-bold text-white text-[11px] rounded-full px-2 py-[2px] flex items-center gap-1'>
                                            <i className={`ri-heart-${snap.isLiked ? 'fill' : 'line'} text-lg`} />
                                            <span>{likeCount}</span>
                                        </Box> */}

                                    {/* </IconButton> */}
                                    <Box className='absolute bottom-2 right-2 bg-black/60 font-bold text-white text-[11px] rounded-full px-2 py-[2px] flex items-center gap-1'>
                                        <i className={`ri-heart-${snap.isLiked ? 'fill text-red-500' : 'line'} text-lg`} />
                                        <span>{likeCount}</span>
                                    </Box>
                                    {/* {likeCount > 0 && (
                                        <Box className='absolute bottom-2 left-2 bg-black/60 text-white text-[11px] rounded-full px-2 py-[2px] flex items-center gap-1'>
                                            <i className='ri-heart-fill text-[12px]' />
                                            
                                        </Box>
                                    )} */}
                                </Box>
                            )
                        })}
                    </Box>
                )}
            </Box>
        </Box>
    )
}

export default SnapFlowPage
