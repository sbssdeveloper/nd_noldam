'use client'

import React from 'react'
import { Box, IconButton, Typography, Button, Avatar, CircularProgress, Rating, Modal, TextField } from '@mui/material'
import PageLoader from '@/components/PageLoader'
import { useRouter, usePathname, useParams, useSearchParams } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import { useChat } from '@/components/layout/ChatContext'
import type { MeetingDetail } from '@/services/types/frontend'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import YouTubePlayer from '@/components/YouTubePlayer'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchMeetingDetail, clearMeetingDetail } from '@/store/slices/meetingDetailSlice'
import { fetchMeetingReviews, clearMeetingReviews } from '@/store/slices/meetingReviewsSlice'
import type { MeetingReview } from '@/services/meetingsApi'
import { meetingsApi, type MeetingSnapshot } from '@/services/meetingsApi'
import { PostAddOutlined, FeedbackOutlined } from '@mui/icons-material'
import AccessAlarmsIcon from '@mui/icons-material/AccessAlarms';
import { userApi } from '@/services/userApi'
import { getCommunityBadgeDisplay } from '@/utils/badgeUtils'
import PaymentSkeletonLoader from '@/components/PaymentSkeletonLoader'

const SnapshotsCarousel = React.memo(function SnapshotsCarousel({
    snapshots,
    snapshotsLoading,
    snapshotsError,
    onNavigate,
}: {
    snapshots: MeetingSnapshot[]
    snapshotsLoading: boolean
    snapshotsError: string | null
    onNavigate: (postId: number) => void
}) {
    if (snapshotsLoading) {
        return (
            <Box className='flex items-center justify-center h-36'>
                <CircularProgress size={28} />
            </Box>
        )
    }

    if (snapshotsError) {
        return (
            <Box className='flex items-center justify-center h-24'>
                <Typography variant='body2' className='text-red-500'>{snapshotsError}</Typography>
            </Box>
        )
    }

    if (!snapshots.length) {
        return (
            <Box className='flex items-center justify-center h-24 bg-gray-50 rounded-lg'>
                <Typography variant='body2' className='text-gray-500'>아직 모임을 태그한 게시물이 없습니다.</Typography>
            </Box>
        )
    }

    return (
        <Box className='flex items-center gap-3 overflow-x-auto no-scrollbar px-1'
            sx={{ scrollSnapType: 'x mandatory' }}>
            {snapshots.slice(0, 10).map((snap) => (
                <Box
                    key={`meeting-snap-${snap.postId}-${snap.imageUrl}`}
                    className='relative flex-shrink-0 bg-gray-200 rounded-xl overflow-hidden cursor-pointer'
                    sx={{ width: 220, height: 220, scrollSnapAlign: 'start' }}
                    onClick={() => onNavigate(snap.postId)}
                >
                    <img
                        src={snap.imageUrl}
                        alt='meeting snap'
                        className='w-full h-full object-cover'
                        loading='lazy'
                        decoding='async'
                    />
                </Box>
            ))}
        </Box>
    )
})


// EXACT SAME METHOD AS ADD-MEETING: Just remove editor controls, keep iframe as-is
const cleanHTML = (html: string): string => {
    if (!html) return ''

    let cleaned = html

    // Remove buttons (close buttons from editor)
    cleaned = cleaned.replace(/<button[^>]*>.*?<\/button>/gi, '')

    // Remove inputs
    cleaned = cleaned.replace(/<input[^>]*>/gi, '')

    // Remove editor attributes (keep the elements, just clean attributes)
    cleaned = cleaned.replace(/contenteditable="[^"]*"/gi, '')
    cleaned = cleaned.replace(/data-image-id="[^"]*"/gi, '')
    cleaned = cleaned.replace(/data-color-picker="[^"]*"/gi, '')
    cleaned = cleaned.replace(/data-color-button="[^"]*"/gi, '')
    cleaned = cleaned.replace(/data-selected="[^"]*"/gi, '')

    // Remove close icons
    cleaned = cleaned.replace(/<i[^>]*ri-close[^>]*><\/i>/gi, '')
    cleaned = cleaned.replace(/<i[^>]*ri-delete[^>]*><\/i>/gi, '')
    cleaned = cleaned.replace(/<i[^>]*ri-remove[^>]*><\/i>/gi, '')

    // That's it! Keep images, iframes, text - everything else AS-IS
    // The iframe from add-meeting already has: src="https://www.youtube.com/embed/VIDEO_ID?rel=0&modestbranding=1&controls=1&enablejsapi=1"
    // We keep it exactly as saved - no modification!

    return cleaned
}

const ItemDetailPage = () => {
    const router = useRouter()
    const { navigate } = useNavigation()
    const pathname = usePathname()
    const params = useParams()
    const searchParams = useSearchParams()
    const { setChatView } = useChat()
    const dispatch = useAppDispatch()
    const [showBooking, setShowBooking] = React.useState(false)
    const [currentReview, setCurrentReview] = React.useState(0)
    const [visibleReviewsCount, setVisibleReviewsCount] = React.useState(3)
    const [joinStatus, setJoinStatus] = React.useState<any>(null)
    const [isJoining, setIsJoining] = React.useState(false)
    const [showReviewModal, setShowReviewModal] = React.useState(false)
    const [reviewTitle, setReviewTitle] = React.useState('')
    const [reviewContent, setReviewContent] = React.useState('')
    const [reviewRating, setReviewRating] = React.useState<number | null>(null)
    const [showFollowDialog, setShowFollowDialog] = React.useState(false)
    const [isFollowing, setIsFollowing] = React.useState<boolean>(false)
    const [followLoading, setFollowLoading] = React.useState(false)
    const [checkingFollowStatus, setCheckingFollowStatus] = React.useState(true)
    const [isLiked, setIsLiked] = React.useState<boolean>(false)
    const [likesCount, setLikesCount] = React.useState<number>(0)
    const [likeLoading, setLikeLoading] = React.useState(false)
    const [meetingSnapshots, setMeetingSnapshots] = React.useState<MeetingSnapshot[]>([])
    const [snapshotsLoading, setSnapshotsLoading] = React.useState(false)
    const [snapshotsError, setSnapshotsError] = React.useState<string | null>(null)

    const [paymentLoading, setPaymentLoading] = React.useState(false) // Loading state for payment window

    // Navigation helper
    const goToProfile = React.useCallback((targetUserId?: number | null) => {
        if (!targetUserId) return
        navigate(`/profile?userId=${targetUserId}`)
    }, [navigate])

    // Get data from Redux - single API call now includes category and activity names
    const { meetingData, loading } = useAppSelector(
        (state) => state.meetingDetailReducer
    )

    // Get reviews data from Redux
    const { reviews = [], averageRating = 0, loading: reviewsLoading = false } = useAppSelector(
        (state) => state.meetingReviewsReducer || {}
    )

    // Debug logging
    React.useEffect(() => {
        // Debug logging
    }, [reviews, averageRating, reviewsLoading])

    // Get current user
    const { user, token, isAuthenticated } = useAppSelector((state: any) => state.authReducer || {})

    // Clean description HTML - preserve original order and add click handler to "Follow this host"
    const cleanedDescription = React.useMemo(() => {
        if (!meetingData?.description) return ''
        let cleaned = cleanHTML(meetingData.description)

        // Add click handler to "Follow this host" text - always show "Follow this host" text
        if (cleaned.includes('호스트 팔로우하기')) {
            // Replace "Follow this host" with a clickable version (always shows "Follow this host")
            cleaned = cleaned.replace(
                /호스트 팔로우하기/g,
                `<span data-follow-host="true" style="cursor: pointer; text-decoration: underline; color: #000; font-weight: bold;">호스트 팔로우하기</span>`
            )
        }

        return cleaned
    }, [meetingData?.description])


    const parseCarouselFromHTML = (html: string) => {
        // Match carousel structure (adjust regex based on your HTML structure)
        const carouselRegex = /<div[^>]*class="[^"]*carousel[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
        const match = carouselRegex.exec(html);

        if (match) {
            // Extract images from the carousel HTML
            const imageMatches = [...match[1].matchAll(/<img[^>]*src="([^"]+)"[^>]*>/gi)];
            const images = imageMatches.map(m => m[1]);

            return {
                hasCarousel: true,
                carouselImages: images,
                remainingHTML: html.replace(carouselRegex, '') // Remove carousel from HTML
            };
        }

        return { hasCarousel: false, carouselImages: [], remainingHTML: html };
    };

    const DescriptionCarousel = React.memo(function DescriptionCarousel({
        images,
        title
    }: {
        images: string[]
        title?: string
    }) {
        return (
            <Box className='mb-6'>
                {title && (
                    <Typography variant="h6" className="font-bold text-gray-900 mb-3">
                        {title}
                    </Typography>
                )}
                <Box
                    className='flex items-center gap-3 overflow-x-auto no-scrollbar px-1'
                    sx={{ scrollSnapType: 'x mandatory' }}
                >
                    {images.map((imageUrl, index) => (
                        <Box
                            key={`desc-carousel-${index}-${imageUrl}`}
                            className='relative flex-shrink-0 bg-gray-200 rounded-xl overflow-hidden cursor-pointer'
                            sx={{ width: '100%', height: 22, scrollSnapAlign: 'start' }}
                        >
                            <img
                                src={imageUrl}
                                alt={`carousel item ${index + 1}`}
                                className='w-full h-full object-cover'
                                loading='lazy'
                                decoding='async'
                            />
                        </Box>
                    ))}
                </Box>
            </Box>
        );
    });

    // Memoize the content rendering to prevent continuous re-renders
    const renderContent = React.useMemo(() => {


        if (!cleanedDescription) return null;
        // Parse carousel from HTML
        const carouselData = parseCarouselFromHTML(cleanedDescription);
        const htmlToRender = carouselData.remainingHTML;

        let parts: JSX.Element[] = [];

        // Add carousel component if found
        if (carouselData.hasCarousel && carouselData.carouselImages.length > 0) {
            parts.push(
                <DescriptionCarousel
                    key="desc-carousel"
                    images={carouselData.carouselImages}
                    title="오스트 팔로우하기"
                />
            );
        }


        let lastIndex = 0;
        let keyCounter = 0;

        try {
            // Regex to find YouTube embeds
            const youtubeRegex = /<div[^>]*class="[^"]*youtube-wrapper[^"]*"[^>]*data-youtube-embed="([^"]+)"[^>]*>[\s\S]*?<\/div>|<iframe[^>]*src="https?:\/\/www\.youtube\.com\/embed\/([^?"]+)[^"]*"[^>]*>[\s\S]*?<\/iframe>/gi;

            let match;
            while ((match = youtubeRegex.exec(cleanedDescription)) !== null) {
                // Add HTML content before this video
                if (match.index > lastIndex) {
                    const htmlBefore = cleanedDescription.substring(lastIndex, match.index);
                    if (htmlBefore.trim()) {
                        parts.push(
                            <Box
                                key={`html-${keyCounter++}`}
                                className="text-gray-800 leading-relaxed"
                                sx={{
                                    '& *': { maxWidth: '100%', wordBreak: 'break-word' },
                                    '& img': {
                                        width: '100%',
                                        height: 'auto',
                                        borderRadius: '12px',
                                        marginTop: '16px',
                                        marginBottom: '16px',
                                        display: 'block',
                                        objectFit: 'contain',
                                        maxHeight: '400px'
                                    },
                                    '& button': { display: 'none !important' },
                                    '& input': { display: 'none !important' },
                                    '& p': { marginBottom: '8px' },
                                    '& h1, & h2, & h3': {
                                        marginTop: '16px',
                                        marginBottom: '8px',
                                        fontWeight: 'bold'
                                    }
                                }}
                                dangerouslySetInnerHTML={{ __html: htmlBefore }}
                            />
                        );
                    }
                }

                // Add YouTube video component
                const videoId = match[1] || match[2];
                if (videoId) {
                    parts.push(
                        <Box key={`video-${keyCounter++}`} sx={{ my: 2 }}>
                            <YouTubePlayer url={`https://youtu.be/${videoId}`} />
                        </Box>
                    );
                }

                lastIndex = match.index + match[0].length;
            }

            // Add remaining HTML after last video
            if (lastIndex < cleanedDescription.length) {
                const htmlAfter = cleanedDescription.substring(lastIndex);
                if (htmlAfter.trim()) {
                    parts.push(
                        <Box
                            key={`html-${keyCounter++}`}
                            className="text-gray-800 leading-relaxed"
                            sx={{
                                '& *': { maxWidth: '100%', wordBreak: 'break-word' },
                                '& img': {
                                    width: '100%',
                                    height: 'auto',
                                    borderRadius: '12px',
                                    marginTop: '16px',
                                    marginBottom: '16px',
                                    display: 'block',
                                    objectFit: 'contain',
                                    maxHeight: '400px'
                                },
                                '& button': { display: 'none !important' },
                                '& input': { display: 'none !important' },
                                '& p': { marginBottom: '8px' },
                                '& h1, & h2, & h3': {
                                    marginTop: '16px',
                                    marginBottom: '8px',
                                    fontWeight: 'bold'
                                }
                            }}
                            dangerouslySetInnerHTML={{ __html: htmlAfter }}
                        />
                    );
                }
            }

            // If no videos found, return original HTML
            if (parts.length === 0) {
                return (
                    <Box
                        className="text-gray-800 mb-6 leading-relaxed"
                        sx={{
                            '& *': { maxWidth: '100%', wordBreak: 'break-word' },
                            '& img': {
                                width: '100%',
                                height: 'auto',
                                borderRadius: '12px',
                                marginTop: '16px',
                                marginBottom: '16px',
                                display: 'block',
                                objectFit: 'contain',
                                maxHeight: '400px'
                            },
                            '& iframe': {
                                width: '100%',
                                aspectRatio: '16/9',
                                borderRadius: '12px',
                                marginTop: '16px',
                                marginBottom: '16px',
                                border: 'none'
                            },
                            '& button': { display: 'none !important' },
                            '& input': { display: 'none !important' },
                            '& p': { marginBottom: '8px' },
                            '& h1, & h2, & h3': {
                                marginTop: '16px',
                                marginBottom: '8px',
                                fontWeight: 'bold'
                            }
                        }}
                        dangerouslySetInnerHTML={{ __html: cleanedDescription }}
                    />
                );
            }

            return <Box className="mb-6">{parts}</Box>;

        } catch (error) {
            // Error parsing description
            // Fallback to original rendering
            return (
                <Box
                    className="text-gray-800 mb-6 leading-relaxed"
                    sx={{
                        '& *': { maxWidth: '100%', wordBreak: 'break-word' },
                        '& img': {
                            width: '100%',
                            height: 'auto',
                            borderRadius: '12px',
                            marginTop: '16px',
                            marginBottom: '16px',
                            display: 'block',
                            objectFit: 'contain',
                            maxHeight: '400px'
                        },
                        '& iframe': {
                            width: '100%',
                            aspectRatio: '16/9',
                            borderRadius: '12px',
                            marginTop: '16px',
                            marginBottom: '16px',
                            border: 'none'
                        },
                        '& button': { display: 'none !important' },
                        '& input': { display: 'none !important' },
                        '& p': { marginBottom: '8px' },
                        '& h1, & h2, & h3': {
                            marginTop: '16px',
                            marginBottom: '8px',
                            fontWeight: 'bold'
                        }
                    }}
                    dangerouslySetInnerHTML={{ __html: cleanedDescription }}
                />
            );
        }
    }, [cleanedDescription]);

    // Fetch meeting data using Redux - ONLY when meetingId changes
    React.useEffect(() => {
        const meetingId = params?.id
        if (!meetingId) {
            return
        }

        // Fetch data using Redux thunk
        dispatch(fetchMeetingDetail(Number(meetingId)))
        dispatch(fetchMeetingReviews({ meetingId: Number(meetingId) }))

        // Cleanup on unmount
        return () => {
            dispatch(clearMeetingDetail())
            dispatch(clearMeetingReviews())
        }
    }, [params?.id, dispatch])

    // Check if user can join this meeting
    React.useEffect(() => {
        const checkJoinStatus = async () => {
            if (!meetingData?.id || !isAuthenticated || !token) return

            try {
                const data = await meetingsApi.checkJoinStatus(meetingData.id)
                if (data && data.success) {
                    setJoinStatus(data)
                }
            } catch (error) {
                // Error checking join status
            }
        }

        checkJoinStatus()
    }, [meetingData?.id, isAuthenticated, token])

    // Check follow status for the host
    React.useEffect(() => {
        const checkFollowStatus = async () => {
            if (!meetingData?.user?.id || !isAuthenticated || !user) {
                setCheckingFollowStatus(false)
                return
            }

            // Don't check if it's the current user's own meeting
            if (Number(user.id) === meetingData.user.id) {
                setCheckingFollowStatus(false)
                setIsFollowing(false)
                return
            }

            try {
                const status = await userApi.getFollowStatus(meetingData.user.id)
                setIsFollowing(status || false)
            } catch (error) {
                // Error checking follow status
                setIsFollowing(false)
            } finally {
                setCheckingFollowStatus(false)
            }
        }

        checkFollowStatus()
    }, [meetingData?.user?.id, isAuthenticated, user])

    // Initialize and update like status from meeting data
    React.useEffect(() => {
        if (meetingData) {
            setLikesCount((meetingData as any).likesCount || 0)
            setIsLiked((meetingData as any).isLiked || false)
        }
    }, [meetingData])

    // Fetch like status when meeting loads (for authenticated users)
    React.useEffect(() => {
        const fetchLikeStatus = async () => {
            if (!meetingData?.id || !isAuthenticated || !token) return

            try {
                const status = await meetingsApi.getLikeStatus(meetingData.id)
                if (status) {
                    setLikesCount(status.likeCount)
                    setIsLiked(status.liked)
                }
            } catch (error) {
                // Error fetching like status
            }
        }

        fetchLikeStatus()
    }, [meetingData?.id, isAuthenticated, token])

    // Handle like toggle
    const handleLikeToggle = async () => {
        if (!meetingData?.id || !isAuthenticated || likeLoading) return

        // Optimistic update
        const previousLiked = isLiked
        const previousCount = likesCount
        setIsLiked(!isLiked)
        setLikesCount(isLiked ? likesCount - 1 : likesCount + 1)
        setLikeLoading(true)

        try {
            const result = await meetingsApi.toggleLike(meetingData.id)
            if (result) {
                setIsLiked(result.liked)
                setLikesCount(result.likeCount)
            } else {
                // Revert on error
                setIsLiked(previousLiked)
                setLikesCount(previousCount)
            }
        } catch (error) {
            // Revert on error
            setIsLiked(previousLiked)
            setLikesCount(previousCount)
        } finally {
            setLikeLoading(false)
        }
    }

    // Add click handler to "Follow this host" text after content is rendered
    React.useEffect(() => {
        if (!meetingData || !isAuthenticated || checkingFollowStatus) return

        const handleFollowClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (target.getAttribute('data-follow-host') === 'true' || target.closest('[data-follow-host="true"]')) {
                e.preventDefault()
                e.stopPropagation()
                if (isAuthenticated) {
                    setShowFollowDialog(true)
                } else {
                    alert('로그인이 필요합니다.')
                    navigate('/login')
                }
            }
        }

        document.addEventListener('click', handleFollowClick)
        return () => {
            document.removeEventListener('click', handleFollowClick)
        }
    }, [meetingData, isAuthenticated, checkingFollowStatus, navigate])

    // Hide footer navbar - run once on mount
    React.useEffect(() => {
        setChatView('search')
        return () => setChatView(null)
    }, []) // ✅ FIX: Empty array - run once only

    // Auto-slide for reviews
    React.useEffect(() => {
        if (!reviews || reviews.length === 0) {
            setCurrentReview(0)
            return
        }

        const interval = setInterval(() => {
            setCurrentReview((prev) => (prev + 1) % reviews.length)
        }, 2500)

        return () => clearInterval(interval)
    }, [reviews?.length]) // Watch reviews.length instead of static array

    // Open the modal if URL has ?booking=1
    React.useEffect(() => {
        if (searchParams?.get('booking') === '1') {
            setShowBooking(true)
        }
    }, [searchParams])

    // Lock page scroll while booking overlay is open
    React.useEffect(() => {
        if (showBooking) {
            const prevHtml = document.documentElement.style.overflow
            const prevBody = document.body.style.overflow
            document.documentElement.style.overflow = 'hidden'
            document.body.style.overflow = 'hidden'
            return () => {
                document.documentElement.style.overflow = prevHtml
                document.body.style.overflow = prevBody
            }
        }
    }, [showBooking])

    const handleBack = React.useCallback(() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back()
        } else {
            navigate('/feed/trending-feeds/lifestyle')
        }
    }, [router])

    const openBooking = React.useCallback(() => {
        // Check if user is authenticated
        if (!isAuthenticated) {
            alert('로그인이 필요합니다.')
            navigate('/login')
            return
        }

        // Check join status
        if (joinStatus?.isOwner) {
            alert('본인이 생성한 모임에는 참여할 수 없습니다.')
            return
        }

        if (joinStatus?.alreadyJoined) {
            alert('이미 참여한 모임입니다.')
            return
        }

        if (joinStatus?.isFull) {
            alert('모임 정원이 마감되었습니다.')
            return
        }

        setShowBooking(true)
        if (pathname) {
            const url = `${pathname}?booking=1`
            navigate(url)
        }
    }, [pathname, router, isAuthenticated, joinStatus])

    const closeBooking = React.useCallback(() => {
        setShowBooking(false)
        router.back()
    }, [router])

    const openReviewModal = React.useCallback(() => {
        setShowReviewModal(true)
    }, [])

    const closeReviewModal = React.useCallback(() => {
        setShowReviewModal(false)
        setReviewTitle('')
        setReviewContent('')
        setReviewRating(null)
    }, [])

    const openFollowDialog = React.useCallback(() => {
        if (!isAuthenticated) {
            alert('로그인이 필요합니다.')
            navigate('/login')
            return
        }
        setShowFollowDialog(true)
    }, [isAuthenticated, navigate])

    const closeFollowDialog = React.useCallback(() => {
        setShowFollowDialog(false)
    }, [])

    const handleFollowToggle = React.useCallback(async () => {
        if (!meetingData?.user?.id || followLoading || !isAuthenticated) return

        setFollowLoading(true)
        try {
            let result
            if (isFollowing) {
                result = await userApi.unfollowUser(meetingData.user.id)
                if (result) {
                    setIsFollowing(false)
                    closeFollowDialog()
                } else {
                    alert('팔로우 취소에 실패했습니다.')
                }
            } else {
                result = await userApi.followUser(meetingData.user.id)
                if (result) {
                    setIsFollowing(true)
                    closeFollowDialog()
                } else {
                    alert('팔로우에 실패했습니다.')
                }
            }
        } catch (error) {
            alert(isFollowing ? '팔로우 취소 중 오류가 발생했습니다.' : '팔로우 중 오류가 발생했습니다.')
        } finally {
            setFollowLoading(false)
        }
    }, [meetingData?.user?.id, isFollowing, followLoading, isAuthenticated, closeFollowDialog])

    const handleReviewSubmit = React.useCallback(async () => {
        if (!meetingData?.id || !token || !reviewRating || !reviewContent.trim()) {
            alert('모든 필수 항목을 입력해주세요.')
            return
        }

        try {
            const response = await fetch(`/api/meetings/${meetingData.id}/reviews`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: reviewTitle.trim() || null,
                    content: reviewContent.trim(),
                    rating: reviewRating
                })
            })

            const data = await response.json()

            if (data.success) {
                alert('리뷰가 성공적으로 제출되었습니다.')
                closeReviewModal()
                // Refresh reviews after successful submission
                if (meetingData?.id) {
                    dispatch(fetchMeetingReviews({ meetingId: meetingData.id }))
                }
            } else {
                alert(data.error || '리뷰 제출에 실패했습니다.')
            }
        } catch (error) {
            // Error submitting review
            alert('리뷰 제출 중 오류가 발생했습니다.')
        }
    }, [meetingData?.id, token, reviewTitle, reviewContent, reviewRating, closeReviewModal, dispatch])

    const computeJoinState = React.useCallback(() => {
        if (!meetingData) {
            return { isPast: false, isFull: false, isJoinClosed: false, availableSeats: 0 }
        }

        const now = new Date()
        const meetingTime = new Date(meetingData.meetingTime)
        const currentParticipants = meetingData.participants?.length || 0
        const maxParticipants = meetingData.maxNum || 0
        const availableSeats = maxParticipants - currentParticipants
        const isPast = meetingTime < now
        const isFull = availableSeats <= 0

        return { isPast, isFull, isJoinClosed: isPast || isFull, availableSeats }
    }, [meetingData])

    const handleJoinMeeting = async () => {
        if (!meetingData?.id || isJoining) return

        // If not authenticated, send to login
        if (!token || !isAuthenticated) {
            navigate('/login')
            return
        }

        // If payment is pending, open payment window directly
        if (paymentPending) {
            await openPaymentWindowDirectly()
            return
        }

        setIsJoining(true)
        try {
            const data = await meetingsApi.joinMeeting(meetingData.id)

            if (data.success) {
                // Refresh join status to update local state
                try {
                    const updatedStatus = await meetingsApi.checkJoinStatus(meetingData.id)
                    if (updatedStatus?.success) {
                        setJoinStatus(updatedStatus)
                    }
                } catch (statusError) {
                    // Ignore status check error, continue with payment
                }

                // If payment is pending (from API response), open payment window
                if (data.paymentPending || (meetingData.hasFee && meetingData.fee)) {
                    // Open payment window directly instead of redirecting to payment page
                    await openPaymentWindowDirectly()
                } else {
                    // Free meeting - go to confirmation page
                    navigate(`/meeting/join-meeting-confirm?meetingId=${meetingData.id}`)
                }
            } else {
                // If error is "already joined" but payment is pending, open payment window
                if ((data as any).alreadyJoined && (data.paymentPending || paymentPending)) {
                    await openPaymentWindowDirectly()
                } else {
                    alert(data.error || '모임 참여에 실패했습니다.')
                }
            }
        } catch (error: any) {
            // Error joining meeting - check if it's a 401 and payment is pending
            console.error('[Join Meeting] Error:', error)
            if (error?.status === 401 && paymentPending) {
                // If auth fails but payment is pending, still try to open payment window
                await openPaymentWindowDirectly()
            } else {
                alert('모임 참여 중 오류가 발생했습니다.')
            }
        } finally {
            setIsJoining(false)
        }
    }

    // Open Toss Payments window directly (skip payment page)
    const openPaymentWindowDirectly = React.useCallback(async () => {
        if (!meetingData?.fee || !meetingData?.id || !token) {
            alert('결제 정보가 없습니다.')
            return
        }

        const amountValue = parseFloat(meetingData.fee.toString())
        if (isNaN(amountValue) || amountValue < 1000) {
            alert('금액은 최소 1,000원 이상이어야 합니다.')
            return
        }

        const parsedMeetingId = parseInt(meetingData.id.toString())
        if (isNaN(parsedMeetingId) || parsedMeetingId <= 0) {
            alert('유효하지 않은 모임 ID입니다.')
            return
        }

        // Show loading overlay immediately
        setPaymentLoading(true)

        try {
            // Get client key from environment variables
            const clientKey = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq'

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

            // Open payment window directly
            // Note: Loading overlay will remain until payment window opens (which redirects)
            await tossPayments.requestPayment('CARD', {
                amount: amountValue,
                orderId: orderId,
                orderName: (meetingData.meetingName || '모임 참가비').trim().substring(0, 100),
                successUrl: `${window.location.origin}/payment/success?meetingId=${parsedMeetingId}`,
                failUrl: `${window.location.origin}/payment/fail?meetingId=${parsedMeetingId}`
            })

            // Payment window opened - loading will continue until redirect
            // If user closes payment window, we'll hide loading after a timeout
            setTimeout(() => {
                setPaymentLoading(false)
            }, 5000) // Hide after 5 seconds if still visible (user might have closed payment window)

        } catch (err: any) {
            console.error('[Meeting Payment] ❌ Payment window error:', err)
            setPaymentLoading(false) // Hide loading on error
            alert(err.message || '결제 창을 열 수 없습니다.')
        }
    }, [meetingData, token])

    // Helper functions for formatting
    const formatMeetingDate = (dateString: string) => {
        const date = new Date(dateString)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()
        const hours = date.getHours()
        const minutes = date.getMinutes()
        return `${year}년 ${String(month).padStart(2, '0')}월 ${String(day).padStart(2, '0')}일 ${String(hours).padStart(2, '0')}시 ${String(minutes).padStart(2, '0')}분`
    }

    const formatReviewDate = (dateString: string) => {
        const date = new Date(dateString)
        const month = date.getMonth() + 1
        const day = date.getDate()
        return `${month}월 ${day}일`
    }

    const renderStars = (rating: number) => {
        const stars = []
        const fullStars = Math.floor(rating)
        const hasHalfStar = rating % 1 !== 0

        for (let i = 0; i < fullStars; i++) {
            stars.push(<i key={i} className="ri-star-fill text-sm" />)
        }

        if (hasHalfStar) {
            stars.push(<i key="half" className="ri-star-half-line text-sm" />)
        }

        const emptyStars = 5 - Math.ceil(rating)
        for (let i = 0; i < emptyStars; i++) {
            stars.push(<i key={`empty-${i}`} className="ri-star-line text-sm" />)
        }

        return stars
    }

    const { isPast, isFull, isJoinClosed, availableSeats } = computeJoinState()
    const isParticipant = !!joinStatus?.alreadyJoined
    const paymentPending = joinStatus?.paymentStatus === 'pending' && meetingData?.hasFee
    // Participants can always click the CTA (to cancel), even if meeting is full
    const isCtaClickable = !isJoinClosed || isParticipant
    const meetingTimeDate = meetingData ? new Date(meetingData.meetingTime) : null

    const handlePrimaryCtaClick = React.useCallback(async () => {
        if (!meetingData) return

        const { isPast, isFull } = computeJoinState()

        // If payment is pending, open payment window directly
        if (paymentPending) {
            await openPaymentWindowDirectly()
            return
        }

        // If meeting time has passed, participants cannot cancel (readonly mode)
        if (isPast) {
            if (isParticipant) {
                router.push(`/meeting/cancel-meeting-confirm?id=${meetingData.id}&readonly=1`)
            }
            return
        }

        // If participant, allow cancellation even if meeting is full
        if (isParticipant) {
            router.push(`/meeting/cancel-meeting-confirm?id=${meetingData.id}`)
        } else {
            // Non-participants cannot join if meeting is full or past
            if (isFull) {
                return
            }

            // If meeting has fee, open payment window directly instead of booking modal
            if (meetingData.hasFee && meetingData.fee) {
                // First join the meeting, then open payment
                if (!isJoining) {
                    setIsJoining(true)
                    try {
                        const data = await meetingsApi.joinMeeting(meetingData.id)
                        if (data.success) {
                            // If payment is pending, open payment window
                            if (data.paymentPending) {
                                // Refresh join status to update local state
                                const updatedStatus = await meetingsApi.checkJoinStatus(meetingData.id)
                                if (updatedStatus?.success) {
                                    setJoinStatus(updatedStatus)
                                }
                                await openPaymentWindowDirectly()
                            } else {
                                await openPaymentWindowDirectly()
                            }
                        } else {
                            // If error is "already joined" but payment is pending, open payment window
                            if ((data as any).alreadyJoined && data.paymentPending) {
                                await openPaymentWindowDirectly()
                            } else {
                                alert(data.error || '모임 참여에 실패했습니다.')
                            }
                        }
                    } catch (error: any) {
                        // If error but payment is already pending, still try to open payment window
                        if (paymentPending) {
                            await openPaymentWindowDirectly()
                        } else {
                            alert('모임 참여 중 오류가 발생했습니다.')
                        }
                    } finally {
                        setIsJoining(false)
                    }
                }
            } else {
                openBooking()
            }
        }
    }, [meetingData, computeJoinState, isParticipant, paymentPending, router, navigate, openBooking, isJoining, setIsJoining, openPaymentWindowDirectly])

    React.useEffect(() => {
        if (averageRating) {
            setReviewRating(averageRating)
        }
    }, [averageRating])

    React.useEffect(() => {
        if (!meetingData?.id) {
            setMeetingSnapshots([])
            return
        }

        let cancelled = false

        const loadSnapshots = async () => {
            try {
                setSnapshotsLoading(true)
                setSnapshotsError(null)
                const snapshots = await meetingsApi.getMeetingSnapshots(Number(meetingData.id), 10)
                if (!cancelled) {
                    setMeetingSnapshots(Array.isArray(snapshots) ? snapshots : [])
                }
            } catch (error) {
                if (!cancelled) {
                    setSnapshotsError('스냅 데이터를 불러오지 못했습니다.')
                    setMeetingSnapshots([])
                }
            } finally {
                if (!cancelled) {
                    setSnapshotsLoading(false)
                }
            }
        }

        loadSnapshots()

        return () => {
            cancelled = true
        }
    }, [meetingData?.id])

    React.useEffect(() => {
        if (!isAuthenticated || !meetingData?.user?.id || !user?.id) return

        const checkFollowStatus = async () => {
            if (!meetingData?.user?.id || !isAuthenticated || !user) {
                setCheckingFollowStatus(false)
                return
            }

            // Don't check if it's the current user's own meeting
            if (Number(user.id) === meetingData.user.id) {
                setCheckingFollowStatus(false)
                setIsFollowing(false)
                return
            }

            try {
                const status = await userApi.getFollowStatus(meetingData.user.id)
                setIsFollowing(status || false)
            } catch (error) {
                // Error checking follow status
                setIsFollowing(false)
            } finally {
                setCheckingFollowStatus(false)
            }
        }

        checkFollowStatus()
    }, [meetingData?.user?.id, isAuthenticated, user])

    // Show loading state - same style as profile page
    if (loading) {
        return (
            <Box className="flex justify-center py-8">
                <CircularProgress />
            </Box>
        )
    }

    // Show error if no data
    if (!meetingData || !meetingData.user) {
        return (
            <Box className="relative min-h-screen bg-white flex items-center justify-center">
                <Typography variant="body1" className="text-gray-600">모임 정보를 찾을 수 없습니다.</Typography>
            </Box>
        )
    }

    return (
        <Box className="relative min-h-screen bg-white">
            {/* HERO: height adjusts to image */}
            <Box className="relative overflow-hidden">
                {/* Image */}
                <img
                    src={meetingData.meetingBackground}
                    alt={meetingData.meetingName}
                    className="w-full h-auto object-cover min-h-[70vh]"
                />

                {/* Dark overlay for readability (non-interactive), only on hero */}
                <Box className="absolute inset-0 bg-black/45 pointer-events-none" />

                {/* Back arrow on image */}
                <Box className='flex items-center justify-between'>
                    <IconButton
                        onClick={handleBack}
                        className="
                            absolute top-6 left-3 
                            flex flex-row items-center p-[6px] gap-[4px] 
                            w-[36px] h-[36px] 
                            bg-[#1A1A1A] 
                            rounded-full 
                            shadow-[inset_3px_3px_0.5px_-3.5px_rgba(255,255,255,0.5),inset_2px_2px_1px_-2px_#B3B3B3,inset_-2px_-2px_1px_-2px_#B3B3B3,inset_0px_0px_0px_1px_#999999,inset_0px_0px_22px_rgba(242,242,242,0.5)] 
                            backdrop-blur-[6px] 
                            z-30
                        "
                    >
                        <i className="ri-arrow-left-s-line text-lg text-white" />
                    </IconButton>
                    <IconButton
                        className="
                            absolute top-6 right-3 
                            flex flex-row items-center p-[6px] gap-[4px] 
                            w-[36px] h-[36px] 
                            bg-[#1A1A1A] 
                            rounded-full 
                            shadow-[inset_3px_3px_0.5px_-3.5px_rgba(255,255,255,0.5),inset_2px_2px_1px_-2px_#B3B3B3,inset_-2px_-2px_1px_-2px_#B3B3B3,inset_0px_0px_0px_1px_#999999,inset_0px_0px_22px_rgba(242,242,242,0.5)] 
                            backdrop-blur-[6px] 
                            z-30
                        "
                    >
                        <MoreHorizIcon className="text-white" fontSize="small" />
                    </IconButton>

                </Box>


                {/* Foreground hero content (positioned at bottom) */}
                <Box className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center text-center px-4 pb-20">
                    <Box className="w-full max-w-sm mx-auto">
                        {/* Instructor pill */}
                        <Box className="inline-flex items-center bg-black/50 backdrop-blur-sm border rounded-full border-white/50 px-3 py-2 mb-3">
                            <Box onClick={() => goToProfile(meetingData.user.id)} className="flex items-center cursor-pointer">
                                <Avatar
                                    src={meetingData.user.profileImage || undefined}
                                    className="w-5 h-5 bg-gray-600 mr-2"
                                />
                                <Typography variant="body2" className="text-white mr-1">
                                    {meetingData.user.nickname}
                                </Typography>
                                {(() => {
                                    const badgeDisplay = getCommunityBadgeDisplay(meetingData.user.activeCommunityBadge)
                                    if (!badgeDisplay) return null
                                    return (
                                        <img
                                            src={badgeDisplay.image}
                                            alt={badgeDisplay.label}
                                            className="w-4 h-4 object-contain"
                                            title={`커뮤니티 등급: ${badgeDisplay.label}`}
                                        />
                                    )
                                })()}
                            </Box>
                        </Box>

                        {/* Title */}
                        <Typography
                            variant="h3"
                            className="text-white font-extrabold leading-tight mb-2"
                            sx={{
                                textShadow: '0 2px 6px rgba(0,0,0,0.5)',
                                wordWrap: 'break-word',
                                overflowWrap: 'break-word',
                                wordBreak: 'break-word',
                                hyphens: 'auto'
                            }}
                            align="center"
                        >
                            {meetingData.meetingName}
                        </Typography>

                        {/* Details small lines */}
                        <Typography
                            variant="body2"
                            className="text-white/90 mb-1"
                            sx={{
                                textShadow: '0 1px 4px rgba(0,0,0,0.4)',
                                wordWrap: 'break-word',
                                overflowWrap: 'break-word'
                            }}
                        >
                            {meetingData.user.city || meetingData.user.province} · {meetingData.categoryNames.join(', ')} · {meetingData.participants.length}명 참여중
                        </Typography>
                        <Typography
                            variant="body2"
                            className="text-white/90 mb-4"
                            sx={{
                                textShadow: '0 1px 4px rgba(0,0,0,0.4)',
                                wordWrap: 'break-word',
                                overflowWrap: 'break-word'
                            }}
                        >
                            {meetingData.duration}분
                        </Typography>

                        {/* Date pill */}
                        <Box className="bg-gray-500 rounded-xl px-3 py-2 inline-flex items-center">
                            <i className="ri-calendar-line text-white text-sm mr-2" />
                            <Typography variant="body2" className="text-white">{formatMeetingDate(meetingData.meetingTime)}</Typography>
                        </Box>
                    </Box>
                </Box>
                <Box
                    className="absolute bottom-6 left-3 flex flex-col items-center 
                    py-[6px] w-[50px] h-50px] px-[12px]
                    bg-[#1A1A1A] rounded-full 
                    shadow-[inset_3px_3px_0.5px_-3.5px_rgba(255,255,255,0.5),inset_2px_2px_1px_-2px_#B3B3B3,inset_-2px_-2px_1px_-2px_#B3B3B3,inset_0px_0px_0px_1px_#999999,inset_0px_0px_22px_rgba(242,242,242,0.5)]
                    backdrop-blur-[6px] z-30"
                >
                    <IconButton
                        onClick={isAuthenticated ? handleLikeToggle : undefined}
                        disabled={likeLoading || !isAuthenticated}
                        sx={{
                            cursor: isAuthenticated ? 'pointer' : 'default',
                            '&:hover': isAuthenticated ? { opacity: 0.8 } : {}, padding: 0
                        }}
                    >
                        <i className={`ri-heart-${isLiked ? 'fill bg-red-500' : 'line'} text-lg text-white`} />
                    </IconButton>
                    <Typography className="text-white text-xs">{likesCount ?? 0}</Typography>
                </Box>

            </Box>

            {/* DETAILS: completely below the fold (not visible initially) */}
            <Box className="relative z-10 bg-white rounded-t-2xl pt-5 pb-28 px-4">
                <Box className="max-w-md mx-auto">
                    {/* Rich Description Content with YouTube videos in original positions */}
                    {renderContent}


                    {/* 별점 & 후기 */}
                    <Box>
                        {(() => {
                            const meetingStartTime = new Date(meetingData.meetingTime)
                            const meetingEndTime = new Date(meetingStartTime.getTime() + (meetingData.duration * 60 * 1000)) // duration in minutes to milliseconds
                            const currentTime = new Date()

                            return currentTime >= meetingEndTime
                            // const status = meetingData.status

                            // return status === 'completed'
                        })() && (
                                <>
                                    {/* Only show Ratings & Reviews section if there is at least one review */}
                                    {!reviewsLoading && reviews && reviews.length > 0 && (
                                        <Box className="border-t border-gray-200 pt-5 mb-6">
                                            <Typography variant="h6" className="font-bold text-gray-900 mb-2">별점 & 후기</Typography>
                                            <Box className="flex items-center justify-between mb-3">
                                                <Typography variant="h3" className="font-bold text-gray-900">
                                                    {averageRating.toFixed(1)}
                                                </Typography>
                                                <Box className="text-right">
                                                    <Box className="flex items-center justify-end text-black-800 mb-1">
                                                        {renderStars(averageRating)}
                                                    </Box>
                                                    <Typography variant="caption" className="text-gray-600">
                                                        {reviews?.length} Ratings
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            <Box className="space-y-3">
                                                {reviews.slice(0, visibleReviewsCount).map((review: MeetingReview, index: number) => (
                                                    <Box key={review.id}>
                                                        <Box className="bg-gray-100 rounded-xl p-3">
                                                            <Typography variant="subtitle2" className="text-gray-900 mb-1">
                                                                {review.title || '제목 없음'}
                                                            </Typography>

                                                            <Box className="flex justify-start gap-3 items-center mb-2">
                                                                <Box className="flex items-center text-black-800">
                                                                    {renderStars(review.rating)}
                                                                </Box>
                                                                <Typography variant="caption" className="text-gray-500">
                                                                    {formatReviewDate(review.createdAt)} ·{' '}
                                                                    <span
                                                                        className="cursor-pointer hover:underline"
                                                                        onClick={() => goToProfile(review.user.id)}
                                                                    >
                                                                        {review.user.nickname}
                                                                    </span>
                                                                </Typography>
                                                            </Box>
                                                            <Typography variant="body2" className="text-gray-700">
                                                                {review.content}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </Box>

                                            {reviews.length > 3 && (
                                                <Box className="mt-4 flex justify-end">
                                                    <Button
                                                        className='border border-none underline text-gray-800
                                            '
                                                        variant="outlined"
                                                        onClick={() => {
                                                            if (visibleReviewsCount === 3) {
                                                                setVisibleReviewsCount(reviews.length)
                                                            } else {
                                                                setVisibleReviewsCount(3)
                                                            }
                                                        }}

                                                    >
                                                        {visibleReviewsCount === 3
                                                            ? `더보기 (${reviews.length - 3}개 더)`
                                                            : '접기'}
                                                    </Button>
                                                </Box>
                                            )}
                                        </Box>
                                    )}

                                </>
                            )}
                    </Box>

                    {isAuthenticated && joinStatus?.alreadyJoined && (
                        <Box className='mb-2'>
                            {(() => {
                                const meetingStartTime = new Date(meetingData.meetingTime)
                                const meetingEndTime = new Date(meetingStartTime.getTime() + (meetingData.duration * 60 * 1000)) // duration in minutes to milliseconds
                                const currentTime = new Date()

                                return currentTime >= meetingEndTime
                                // const status = meetingData.status

                                // return status === 'completed'
                            })() ? (
                                // Meeting has ended - show rating and review options
                                <>
                                    {/* <Box className='flex flex-col items-center justify-center gap-2 mt-4'>
                                        <Typography className='text-black font-semibold font-size-[17px] font-weight-600'>
                                            Tap to Rate
                                        </Typography>
                                        <Rating
                                            name="size-large"
                                            defaultValue={0}

                                            sx={{
                                                gap: 2,
                                                '& .MuiRating-iconEmpty': {
                                                    color: '#007aff'
                                                },
                                                '& .MuiRating-iconFilled': {
                                                    color: '#2D63FF'
                                                },
                                                '& .MuiRating-iconHover': {
                                                    color: 'primary.dark'
                                                }
                                            }}
                                        />
                                    </Box> */}

                                    <Box className='flex items-center justify-center gap-2 mt-4'>
                                        <Button
                                            onClick={openReviewModal}
                                            className='text-sm gap-0.5 px-10'
                                            sx={{ backgroundColor: '#7f7f7f', textTransform: 'none', borderRadius: '37px' }}
                                        >
                                            <PostAddOutlined className='text-white' />
                                            <Typography className='text-white font-weight-600 font-semibold text-[17px]'>리뷰 작성</Typography>
                                        </Button>
                                        <Button className='text-sm gap-0.5 px-10'
                                            onClick={() => window.open('https://support.thenoldam.com/')}
                                            sx={{ backgroundColor: '#7f7f7f', textTransform: 'none', borderRadius: '37px' }}>
                                            <FeedbackOutlined className='text-white' />
                                            <Typography className='text-white font-weight-600 font-semibold text-[17px]'>모임 지원</Typography></Button>
                                    </Box>
                                </>
                            ) : (
                                // Meeting hasn't started yet - show message
                                <Box className='text-center'>
                                    {/* <Typography variant="body2" className="text-gray-500" sx={{ fontSize: '12px' }}>
                                        아직 모임이 시작되지 않았습니다.
                                    </Typography> */}
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* snap flow designs */}
                    <Box className='pt-5 mb-2'>
                        <Box className='flex items-center justify-between'>
                            <Typography variant="h6" className="font-bold text-gray-900 mb-3">스냅 ({Math.min(meetingSnapshots.length, 10)})</Typography>
                            <Typography
                                variant="body2"
                                className={`text-gray-800 ${meetingSnapshots.length > 0 ? 'cursor-pointer' : 'opacity-50 cursor-default'}`}
                                onClick={() => {
                                    if (!meetingData?.id || meetingSnapshots.length === 0) return
                                    navigate(`/web/meeting/snap-flow?meetingId=${meetingData.id}`)
                                }}
                            >
                                더보기
                            </Typography>
                        </Box>
                        <SnapshotsCarousel
                            snapshots={meetingSnapshots}
                            snapshotsLoading={snapshotsLoading}
                            snapshotsError={snapshotsError}
                            onNavigate={(postId) => navigate(`/post/${postId}`)}
                        />
                    </Box>




                    {/* 정보 테이블 */}
                    <Box className="border-t border-gray-200 pt-5 mb-2">
                        <Typography variant="h6" className="font-bold text-gray-900 mb-3">정보</Typography>
                        <Box className="divide-y divide-gray-200 rounded-lg overflow-hidden bg-white">
                            {[
                                ['이름', meetingData.meetingName],
                                ['강사', meetingData.user.nickname],
                                ['카테고리', meetingData.categoryNames.join(', ')],
                                ['장소', `${meetingData.roadNameAddress} ${meetingData.detailedAddress}`.trim()],
                                ['인원', `${meetingData.minNum}명~${meetingData.maxNum}명`],
                                ['소요시간', `${meetingData.duration}분`],
                                ['참가비', meetingData.hasFee ? `${Number(meetingData.fee).toLocaleString()}원` : '무료'],
                                ['일시', formatMeetingDate(meetingData.meetingTime)]
                            ].map(([label, value], idx) => (
                                <Box key={idx} className="flex items-center justify-between py-3 px-2">
                                    <Typography variant="body2" className="text-gray-800 w-1/2">{label}</Typography>
                                    <Typography variant="body2" className="text-gray-400 w-1/2">{value}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* Fixed Bottom CTA pill (visible while scrolling) */}
            {!showBooking && meetingData && (
                <Box className="fixed gap-2 left-0 right-0 bottom-4 z-[60] flex justify-center px-4 pointer-events-none">
                    <Box
                        className={isCtaClickable ? "pointer-events-auto cursor-pointer" : "pointer-events-auto cursor-not-allowed"}
                        onClick={handlePrimaryCtaClick}
                        sx={{
                            width: '100%',
                            maxWidth: 420,
                            backgroundColor: isCtaClickable ? 'rgba(215,215,215)' : 'rgba(200,200,200)',
                            borderRadius: '28px',
                            boxShadow: '0 6px 18px rgba(0,0,0,0.15)',
                            padding: '10px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            opacity: isCtaClickable && !isParticipant ? 1 : 0.7,
                            '&:hover': {
                                backgroundColor: isCtaClickable ? 'rgba(255,255,255,1)' : 'rgba(200,200,200)'
                            }
                        }}
                    >
                        {/* Left side - Image and Title */}
                        <Box className="flex items-center min-w-0 flex-1">
                            {meetingData.user.profileImage ? (
                                <img
                                    src={meetingData.meetingBackground || undefined}
                                    alt={meetingData.meetingName}
                                    height={22}
                                    width={22}
                                    className="object-cover rounded-full flex-shrink-0"
                                    style={{ marginRight: '8px' }}
                                />
                            ) : (
                                <Box className="object-cover rounded-full flex-shrink-0 w-6 h-6 bg-gray-200">as</Box>
                            )}
                            <Box>
                                {/* Dynamic status message based on meeting state */}
                                {(() => {
                                    if (!meetingTimeDate) return null

                                    const isOneSeatLeft = availableSeats === 1 && !isPast
                                    const isTwoSeatLeft = availableSeats === 2 && !isPast
                                    const isThreeSeatLeft = availableSeats === 3 && !isPast

                                    const formatKoreanDate = (date: Date): string => {
                                        const year = date.getFullYear()
                                        const month = date.getMonth() + 1
                                        const day = date.getDate()
                                        return `${year}년 ${month}월 ${day}일`
                                    }

                                    if (isPast || isFull) {
                                        return (
                                            <Typography className='flex items-center gap-1 text-gray-500 text-[10px] leading-[1]'>
                                                매진된 소셜링이에요
                                            </Typography>
                                        )
                                    }

                                    if (isOneSeatLeft) {
                                        return (
                                            <Typography className='flex items-center gap-1 text-red-700 text-[11px]'>
                                                <AccessAlarmsIcon className='text-red-700 text-[10px]' />
                                                1자리 남았어요!
                                            </Typography>
                                        )
                                    }

                                    if (isTwoSeatLeft) {
                                        return (
                                            <Typography className='flex items-center gap-1 text-red-700 text-[11px]'>
                                                <AccessAlarmsIcon className='text-red-700 text-[10px]' />
                                                2자리 남았어요!
                                            </Typography>
                                        )
                                    }

                                    if (isThreeSeatLeft) {
                                        return (
                                            <Typography className='flex items-center gap-1 text-red-700 text-[11px]'>
                                                <AccessAlarmsIcon className='text-red-700 text-[10px]' />
                                                3자리 남았어요!
                                            </Typography>
                                        )
                                    }

                                    if (!isPast) {
                                        return (
                                            <Typography className='flex items-center gap-1 text-gray-500 text-[11px]'>
                                                <AccessAlarmsIcon className='text-gray-500 text-[10px]' />
                                                {formatKoreanDate(meetingTimeDate)}에 열릴 예정이에요
                                            </Typography>
                                        )
                                    }

                                    return null
                                })()}

                                <Typography
                                    variant="body2"
                                    className="font-bold leading-[1.2]"
                                    sx={{
                                        fontSize: '13px',
                                        color: '#111',
                                        maxWidth: '100%',
                                        wordBreak: 'break-word',
                                        lineHeight: '1.2'
                                    }}
                                >
                                    {meetingData.meetingName}
                                </Typography>
                            </Box>

                        </Box>

                        {/* Right side - Participate text */}
                        <Typography
                            variant="body2"
                            className="font-light"
                            sx={{
                                fontSize: '13px',
                                color: isCtaClickable ? '#111' : '#999',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                opacity: isCtaClickable && !isParticipant ? 1 : 0.6,
                                cursor: isCtaClickable ? 'pointer' : 'not-allowed'
                            }}
                        >
                            {paymentPending ? '결제하기' : isParticipant ? '참여 요청 완료' : '참여하기'}
                        </Typography>
                    </Box>
                </Box>
            )}

            {/* Booking overlay modal */}
            {
                showBooking && (
                    <Box className="fixed inset-0 z-50 flex items-center justify-center">
                        {/* Blurred blue-tinted background within overlay */}
                        <Box className="absolute inset-0 overflow-hidden">
                            <img src={meetingData.meetingBackground} alt="bg" className="w-full h-full object-cover  scale-110" />
                            <Box className="absolute inset-0 bg-black/50" />
                        </Box>

                        {/* Overlay content wrapper */}
                        <Box className="relative z-50 w-11/12 bg-white/50 border border-white/50 border-2 backdrop-blur-sm p-4 rounded-xl max-w-sm">
                            {/* Header (outside card) */}
                            <Box className="flex items-center justify-between mb-3">
                                <Box className="flex items-center">
                                    <Typography variant="h6" className="text-white font-bold">모임 신청</Typography>
                                </Box>
                                <IconButton onClick={closeBooking} className="bg-white/90 hover:bg-white shadow">
                                    <i className="ri-close-line" />
                                </IconButton>
                            </Box>

                            {/* Card (white) */}
                            <Box className="bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[70vh] flex flex-col">
                                {/* Scrollable content area */}
                                <Box className="overflow-y-auto px-4">
                                    {/* Title row */}
                                    <Box className="  py-4 flex items-center">
                                        <Avatar
                                            src={meetingData.meetingBackground || undefined}
                                            className="w-10 h-10 rounded bg-gray-200 mr-3"
                                        />
                                        <Box>
                                            <Typography variant="body2" className="text-gray-900 font-medium">{meetingData.meetingName}</Typography>
                                            <Box className="flex items-center text-gray-700 text-xs mt-1">
                                                <span>{meetingData.user.nickname}</span>
                                                {(() => {
                                                    const badgeDisplay = getCommunityBadgeDisplay(meetingData.user.activeCommunityBadge)
                                                    if (!badgeDisplay) return null
                                                    return (
                                                        <img
                                                            src={badgeDisplay.image}
                                                            alt={badgeDisplay.label}
                                                            className="w-4 h-4 ml-2 object-contain"
                                                            title={`커뮤니티 등급: ${badgeDisplay.label}`}
                                                        />
                                                    )
                                                })()}
                                            </Box>
                                        </Box>
                                    </Box>
                                    <Box className="border-t border-gray-300" />

                                    {/* Date section */}
                                    <Box className="  py-3">
                                        <Typography variant="subtitle2" className="text-gray-900 font-bold mb-1">{formatMeetingDate(meetingData.meetingTime)} 모임 참여</Typography>
                                        <Typography fontSize={10} className="text-gray-500">결제가 확인되면 알림으로 상세 내용을 보내드려요</Typography>
                                    </Box>
                                    <Box className="" />

                                    {/* Price section */}
                                    <Box className="  py-3">
                                        <Typography variant="subtitle2" className="text-gray-900 font-bold mb-1">
                                            {meetingData.hasFee ? (
                                                `${Number(meetingData.fee).toLocaleString()}원`
                                            ) : (
                                                <>무료</>
                                            )}
                                        </Typography>
                                        <Typography fontSize={10} className="text-gray-500">
                                            {/* {meetingData.hasFee
                                                ? '모임 참여를 위한 참가비입니다.'
                                                :  */}
                                            지금은 무료이므로 더 자세히 알아보고, 더 많이 보고, 더 많이 포함할 수 있습니다.
                                            {/* } */}
                                        </Typography>
                                    </Box>
                                    <Box className="border-t border-gray-300" />

                                    {/* Notes list */}
                                    <Box className="  py-3 text-gray-700">
                                        <Typography fontSize={10} className="text-gray-800 leading-snug">
                                            모임일 기준 4일 전까지 취소가 가능하고,
                                        </Typography>
                                        <Typography fontSize={10} className="text-gray-800 mb-2 leading-snug">
                                            모임일 기준 3일부터는 취소가 제한될 수 있어요.
                                        </Typography>
                                        <ol className="list-decimal pl-5 space-y-2 text-gray-700" style={{ fontSize: '10px' }}>
                                            <li>모임 시작 전 부득이하게 참여가 어려워진 경우, 반드시 호스트에게 미리 알려주세요.</li>
                                            <li>무단으로 불참하거나, 함께하는 멤버들에게 피해를 주는 경우 이용 제재를 받게 돼요.</li>
                                        </ol>
                                    </Box>
                                    <Box className="border-t border-gray-300" />

                                </Box>
                            </Box>

                            {/* CTA outside card */}
                            <Box className="mt-3 text-center">
                                <Button
                                    variant="contained"
                                    className='rounded-full text-sm px-8'
                                    sx={{ backgroundColor: '#2D63FF', textTransform: 'none' }}
                                    onClick={handleJoinMeeting}
                                    disabled={isJoining}
                                >
                                    {isJoining ? '처리중...' : '신청하기'}
                                </Button>
                                <Typography variant="caption" className="block text-center text-black mt-2 drop-shadow">버튼을 눌러 예약 확정</Typography>
                            </Box>
                        </Box>
                    </Box>
                )
            }

            {/* Follow Dialog */}
            <Modal
                open={showFollowDialog}
                onClose={closeFollowDialog}
                className="flex items-center justify-center"
            >
                <Box className="bg-white rounded-2xl p-6 w-11/12 max-w-sm mx-auto shadow-2xl">
                    <Box className="text-center">
                        <Typography variant="h6" className="font-bold text-gray-900 mb-4">
                            {isFollowing ? '호스트 팔로우 취소' : '호스트 팔로우'}
                        </Typography>
                        <Typography variant="body2" className="text-gray-700 mb-6">
                            {isFollowing
                                ? `${meetingData?.user?.nickname || '호스트'}님의 팔로우를 취소하시겠습니까?`
                                : `${meetingData?.user?.nickname || '호스트'}님을 팔로우하시겠습니까?`}
                        </Typography>
                        <Box className="flex gap-3">
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={closeFollowDialog}
                                disabled={followLoading}
                                sx={{
                                    borderRadius: '12px',
                                    textTransform: 'none',
                                    borderColor: '#e0e0e0',
                                    color: '#666',
                                    '&:hover': {
                                        borderColor: '#ccc',
                                        backgroundColor: '#f5f5f5'
                                    }
                                }}
                            >
                                취소
                            </Button>
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={handleFollowToggle}
                                disabled={followLoading}
                                sx={{
                                    borderRadius: '12px',
                                    textTransform: 'none',
                                    backgroundColor: isFollowing ? '#ef4444' : '#2D63FF',
                                    '&:hover': {
                                        backgroundColor: isFollowing ? '#dc2626' : '#1e4ed8'
                                    },
                                    '&:disabled': {
                                        backgroundColor: '#e0e0e0',
                                        color: '#999'
                                    }
                                }}
                            >
                                {followLoading ? '처리중...' : (isFollowing ? '팔로우 취소' : '팔로우')}
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </Modal>

            {/* Review Modal */}
            <Modal
                open={showReviewModal}
                onClose={closeReviewModal}
                className="flex items-center justify-center"
            >
                <Box className="bg-gray-200 rounded-2xl p-6 w-11/12 max-w-md mx-auto shadow-2xl">
                    {/* Modal Header */}
                    <Box className="flex items-center justify-between mb-6">
                        <Typography variant="h4" className="font-bold text-gray-900">
                            리뷰 작성
                        </Typography>
                        <IconButton onClick={closeReviewModal} size="small">
                            <i className="ri-close-line text-lg" />
                        </IconButton>
                    </Box>

                    {/* Form Fields */}
                    <Box className="space-y-4">
                        {/* Rating Field */}
                        <Box>
                            <Typography variant="body2" className="text-gray-700 mb-2">
                                별점 *
                            </Typography>

                            <Rating
                                name="size-large"
                                value={reviewRating}
                                onChange={(event, newValue) => {
                                    setReviewRating(newValue)
                                }}
                                sx={{
                                    gap: 2,
                                    '& .MuiRating-iconEmpty': {
                                        color: '#007aff'
                                    },
                                    '& .MuiRating-iconFilled': {
                                        color: '#2D63FF'
                                    },
                                    '& .MuiRating-iconHover': {
                                        color: 'primary.dark'
                                    }
                                }}
                            />
                        </Box>

                        <TextField
                            fullWidth
                            label="제목"
                            variant="outlined"
                            value={reviewTitle}
                            onChange={(e) => setReviewTitle(e.target.value)}
                            placeholder="리뷰 제목을 입력하세요 (선택사항)"
                            sx={{
                                color: '#7f7f7f',
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                },
                                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#7f7f7f',
                                }
                            }}
                        />

                        <TextField
                            fullWidth
                            label="내용"
                            variant="outlined"
                            multiline
                            rows={4}
                            value={reviewContent}
                            onChange={(e) => setReviewContent(e.target.value)}
                            placeholder="리뷰 내용을 입력하세요 *"

                            sx={{

                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                },
                                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#7f7f7f',
                                }
                            }}
                        />
                    </Box>

                    {/* Action Buttons */}
                    <Box className="flex gap-3 mt-6">
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={closeReviewModal}
                            sx={{
                                borderRadius: '12px',
                                textTransform: 'none',
                                borderColor: '#e0e0e0',
                                color: '#666',
                                '&:hover': {
                                    borderColor: '#ccc',
                                    backgroundColor: '#f5f5f5'
                                }
                            }}
                        >
                            취소
                        </Button>
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleReviewSubmit}
                            disabled={!reviewRating || !reviewContent.trim()}
                            sx={{
                                borderRadius: '12px',
                                textTransform: 'none',
                                backgroundColor: '#2D63FF',
                                '&:hover': {
                                    backgroundColor: '#1e4ed8'
                                },
                                '&:disabled': {
                                    backgroundColor: '#e0e0e0',
                                    color: '#999'
                                }
                            }}
                        >
                            제출
                        </Button>
                    </Box>
                </Box>
            </Modal>
            {/* Payment Loading Overlay - Skeleton Animation */}
            <PaymentSkeletonLoader show={paymentLoading} />
        </Box >
    )
}

export default ItemDetailPage
