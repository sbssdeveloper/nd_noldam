'use client'

import React from 'react'
import { Box, IconButton, Typography, Button, Avatar, CircularProgress, TextField, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material'
import PageLoader from '@/components/PageLoader'
import { useRouter, usePathname, useParams, useSearchParams } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import { useChat } from '@/components/layout/ChatContext'
import YouTubePlayer from '@/components/YouTubePlayer'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchMeetingDetail, clearMeetingDetail } from '@/store/slices/meetingDetailSlice'
import { fetchMeetingReviews, clearMeetingReviews } from '@/store/slices/meetingReviewsSlice'
import type { MeetingReview, MeetingSnapshot } from '@/services/meetingsApi'
import { meetingsApi } from '@/services/meetingsApi'
import { getCommunityBadgeDisplay } from '@/utils/badgeUtils'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ModeEditOutlinedIcon from '@mui/icons-material/ModeEditOutlined';

// const STATIC_REVIEWS = [
//     {
//         title: "Title",
//         rating: 4.5,
//         date: "11월 13일",
//         user: "USER_Name",
//         body: "body"
//     },
//     {
//         title: "Title",
//         rating: 4.5,
//         date: "11월 13일",
//         user: "USER_Name",
//         body: "body"
//     },
//     {
//         title: "Title",
//         rating: 4.5,
//         date: "11월 13일",
//         user: "USER_Name",
//         body: "body"
//     },
//     {
//         title: "Title",
//         rating: 4.5,
//         date: "11월 13일",
//         user: "USER_Name",
//         body: "body"
//     }
// ]

// Removed hook call from module level - will be moved inside component

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

    return cleaned
}

const ItemDetailHostPage = () => {
    const router = useRouter()
    const { navigate } = useNavigation()
    const pathname = usePathname()
    const params = useParams()
    const searchParams = useSearchParams()
    const { setChatView } = useChat()
    const dispatch = useAppDispatch()
    const [visibleReviewsCount, setVisibleReviewsCount] = React.useState(3)
    const [showMeetingDetails, setShowMeetingDetails] = React.useState(false)
    const [showCreatePost, setShowCreatePost] = React.useState(false)
    const [postText, setPostText] = React.useState('')
    const [showOptions, setShowOptions] = React.useState(false)
    const [showClubSelect, setShowClubSelect] = React.useState(false)
    const [selectedClub, setSelectedClub] = React.useState<any>(null)
    const [tempClub, setTempClub] = React.useState<any>(null)
    const [images, setImages] = React.useState<string[]>([])
    const [files, setFiles] = React.useState<File[]>([])
    const imageInputRef = React.useRef<HTMLInputElement>(null)
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const [isLiked, setIsLiked] = React.useState<boolean>(false)
    const [likesCount, setLikesCount] = React.useState<number>(0)
    const [likeLoading, setLikeLoading] = React.useState(false)
    const [meetingSnapshots, setMeetingSnapshots] = React.useState<MeetingSnapshot[]>([])
    const [snapshotsLoading, setSnapshotsLoading] = React.useState(false)
    const [snapshotsError, setSnapshotsError] = React.useState<string | null>(null)
    // Move static data outside component to prevent recreation

    // Meeting frequency state
    const [showFrequencyModal, setShowFrequencyModal] = React.useState(false)
    const [meetingInstances, setMeetingInstances] = React.useState<any[]>([])
    const [showAllInstances, setShowAllInstances] = React.useState(false)
    const [loadingInstances, setLoadingInstances] = React.useState(false)

    // Show all members state
    const [showAllMembers, setShowAllMembers] = React.useState(false)

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
    const [isDeletingMeeting, setIsDeletingMeeting] = React.useState(false)

    // Get data from Redux
    const goToProfile = React.useCallback((targetUserId?: number | null) => {
        if (!targetUserId) return
        navigate(`/profile?userId=${targetUserId}`)
    }, [navigate])

    const { meetingData, loading } = useAppSelector(
        (state) => state.meetingDetailReducer
    )

    // Get reviews data from Redux
    const { reviews = [], averageRating = 0, loading: reviewsLoading = false } = useAppSelector(
        (state) => state.meetingReviewsReducer || {}
    )

    // Get auth data from Redux
    const { user, token, isAuthenticated } = useAppSelector((state: any) => state.authReducer || {})

    // Authorization state
    const [isAuthorized, setIsAuthorized] = React.useState<boolean | null>(null) // null = checking, true = authorized, false = unauthorized
    const [isCheckingAuth, setIsCheckingAuth] = React.useState(true)

    // Clean description HTML - preserve original order
    const cleanedDescription = React.useMemo(() => {
        if (!meetingData?.description) return ''
        return cleanHTML(meetingData.description)
    }, [meetingData?.description])

    // Memoize the content rendering to prevent continuous re-renders
    const renderContent = React.useMemo(() => {
        if (!cleanedDescription) return null;

        const parts: JSX.Element[] = [];
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

    // Check if meeting is completed
    const isMeetingCompleted = React.useMemo(() => {
        if (!meetingData?.meetingTime || !meetingData?.duration) return false

        const meetingStartTime = new Date(meetingData.meetingTime)
        const meetingEndTime = new Date(meetingStartTime.getTime() + (meetingData.duration * 60 * 1000))
        const currentTime = new Date()

        return currentTime >= meetingEndTime
    }, [meetingData?.meetingTime, meetingData?.duration])

    // Fetch meeting data using Redux
    React.useEffect(() => {
        const meetingId = params?.id
        if (!meetingId) {
            return
        }

        dispatch(fetchMeetingDetail(Number(meetingId)))

        return () => {
            dispatch(clearMeetingDetail())
        }
    }, [params?.id, dispatch])

    // Authorization check - only allow meeting host to access this page
    React.useEffect(() => {
        const checkAuthorization = async () => {
            setIsCheckingAuth(true)

            // Check if user is authenticated
            if (!isAuthenticated || !user || !token) {
                setIsAuthorized(false)
                setIsCheckingAuth(false)
                return
            }

            // Check if meeting data is loaded
            if (!meetingData || loading) {
                return // Wait for meeting data to load
            }

            // Check if current user is the meeting host
            const isHost = meetingData.user && meetingData.user.id === user.id

            if (isHost) {
                setIsAuthorized(true)
            } else {
                setIsAuthorized(false)
            }

            setIsCheckingAuth(false)
        }

        checkAuthorization()
    }, [isAuthenticated, user, token, meetingData, loading])

    // Auto open host details view when requested via query param
    React.useEffect(() => {
        if (
            searchParams?.get('view') === 'details' &&
            isAuthorized &&
            !showMeetingDetails
        ) {
            setShowMeetingDetails(true)
        }
    }, [searchParams, isAuthorized, showMeetingDetails])

    // Fetch reviews only if meeting is completed
    React.useEffect(() => {
        const meetingId = params?.id
        if (!meetingId || !isMeetingCompleted) {
            return
        }

        dispatch(fetchMeetingReviews({ meetingId: Number(meetingId) }))

        return () => {
            dispatch(clearMeetingReviews())
        }
    }, [params?.id, isMeetingCompleted, dispatch])

    React.useEffect(() => {
        if (meetingData) {
            setLikesCount((meetingData as any).likesCount || 0)
            setIsLiked((meetingData as any).isLiked || false)
        }
    }, [meetingData])

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

    const handleLikeToggle = React.useCallback(async () => {
        if (!meetingData?.id || !isAuthenticated || likeLoading) return

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
                setIsLiked(previousLiked)
                setLikesCount(previousCount)
            }
        } catch (error) {
            setIsLiked(previousLiked)
            setLikesCount(previousCount)
        } finally {
            setLikeLoading(false)
        }
    }, [meetingData?.id, isAuthenticated, likeLoading, isLiked, likesCount])



    const handleBack = React.useCallback(() => {
        if (searchParams?.get('from') === 'chat') {
            navigate('/chat')
            return
        }

        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back()
        } else {
            navigate('/feed/trending-feeds/lifestyle')
        }
    }, [router, navigate, searchParams])

    const openMeetingDetails = React.useCallback(() => {
        setShowMeetingDetails(true)
    }, [])

    const closeMeetingDetails = React.useCallback(() => {
        if (searchParams?.get('from') === 'chat') {
            navigate('/chat')
            return
        }
        setShowMeetingDetails(false)
    }, [navigate, searchParams])

    const openDeleteDialog = React.useCallback(() => {
        setIsDeleteDialogOpen(true)
    }, [])

    const closeDeleteDialog = React.useCallback(() => {
        if (!isDeletingMeeting) {
            setIsDeleteDialogOpen(false)
        }
    }, [isDeletingMeeting])

    const handleDeleteMeeting = React.useCallback(async () => {
        if (!meetingData?.id || isDeletingMeeting) {
            return
        }

        try {
            setIsDeletingMeeting(true)
            const success = await meetingsApi.deleteMeeting(meetingData.id)

            if (success) {
                setIsDeleteDialogOpen(false)
                setShowMeetingDetails(false)
                dispatch(clearMeetingDetail())
                navigate('/feed/trending-feeds/lifestyle')
            }
        } catch (error) {
            // Error deleting meeting
        } finally {
            setIsDeletingMeeting(false)
        }
    }, [meetingData?.id, isDeletingMeeting, dispatch, navigate])

    // Meeting frequency functions
    const handleFrequencyUpdate = React.useCallback(async (frequency: string, recurrenceEndOn?: string) => {
        if (!meetingData?.id) return

        try {
            const success = await meetingsApi.updateMeetingFrequency(
                meetingData.id,
                frequency,
                recurrenceEndOn
            )

            if (success) {
                // Refresh meeting data
                dispatch(fetchMeetingDetail(meetingData.id.toString()))
                setShowFrequencyModal(false)
            }
        } catch (error) {
            // Error updating meeting frequency
        }
    }, [meetingData?.id, dispatch])
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

    const fetchMeetingInstances = React.useCallback(async () => {
        if (!meetingData?.id) return

        try {
            setLoadingInstances(true)
            const instances = await meetingsApi.getMeetingInstances(meetingData.id)
            setMeetingInstances(instances || [])
        } catch (error) {
            // Error fetching meeting instances
        } finally {
            setLoadingInstances(false)
        }
    }, [meetingData?.id])

    const handleShowMoreMeetings = React.useCallback(() => {
        if (meetingInstances.length === 0) {
            fetchMeetingInstances()
        }
        setShowAllInstances(true)
    }, [meetingInstances.length, fetchMeetingInstances])

    const triggerImagePicker = () => imageInputRef.current?.click()
    const triggerFilePicker = () => fileInputRef.current?.click()

    const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const url = URL.createObjectURL(file)
            setImages(prev => [...prev, url])
            setShowOptions(false)
            e.target.value = ''
        }
    }

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setFiles(prev => [...prev, file])
            setShowOptions(false)
            e.target.value = ''
        }
    }

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
        return Array.from({ length: 5 }, (_, i) => (
            <i
                key={i}
                className={`ri-star-${i < rating ? 'fill' : 'line'} text-gray-600`}
                style={{ fontSize: '16px' }}
            />
        ))
    }

    // Calculate total revenue from participants
    const calculateRevenue = () => {
        if (!meetingData) return 0
        const participantCount = meetingData.participants?.length || 0
        const fee = meetingData.hasFee ? Number(meetingData.fee) : 0
        return participantCount * fee
    }

    // Show loading state while checking authorization or fetching data
    if (isCheckingAuth || loading) {
        return <PageLoader />
    }

    // Show unauthorized access message
    if (isAuthorized === false) {
        return (
            <Box className="relative min-h-screen bg-white flex items-center justify-center">
                <Box className="text-center">
                    <Typography variant="h5" className="text-gray-800 mb-2">
                        접근 권한이 없습니다
                    </Typography>
                    <Typography variant="body1" className="text-gray-600 mb-4">
                        이 모임의 호스트만 접근할 수 있습니다.
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={() => navigate('/')}
                        sx={{ backgroundColor: '#3D3D3D' }}
                    >
                        홈으로 돌아가기
                    </Button>
                </Box>
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

    const revenue = calculateRevenue()

    return (
        <Box className="relative min-h-screen bg-white">
            {/* HERO: height adjusts to image */}
            <Box className="relative overflow-hidden">
                {/* Image */}

                {meetingData.meetingBackground ? (
                    <img
                        src={meetingData.meetingBackground}
                        alt={meetingData.meetingName}
                        className="w-full h-auto object-cover min-h-[70vh]"
                    />
                ) : (
                    <Box className='w-full h-auto object-cover min-h-[70vh] bg-gray-200'></Box>
                )
                }
                {/* Dark overlay for readability (non-interactive), only on hero */}
                <Box className="absolute inset-0 bg-black/45 pointer-events-none" />

                {/* Back arrow on image */}
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

                {/* Foreground hero content (positioned at bottom) */}
                <Box className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center text-center px-4 pb-20">
                    <Box className="w-full max-w-sm mx-auto">
                        {/* Instructor pill */}
                        <Box onClick={() => goToProfile(meetingData.user.id)} className="inline-flex items-center bg-black/50 backdrop-blur-sm border rounded-full border-white/50  px-3 py-2 mb-3 cursor-pointer">
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
                    {isMeetingCompleted && reviews && reviews.length > 0 && (
                        <Box className="border-t border-gray-200 pt-5 mb-6">
                            <Typography variant="h6" className="font-bold text-gray-900 mb-3">별점 & 후기</Typography>

                            {reviewsLoading ? (
                                <Box className="flex justify-center py-4">
                                    <CircularProgress size={24} />
                                </Box>
                            ) : reviews && reviews.length > 0 ? (
                                <>
                                    {/* Average Rating */}
                                    {/* <Box className="flex items-center gap-2 mb-4">
                                        <Box className="flex items-center text-gray-800">
                                            {renderStars(Math.round(averageRating || 0))}
                                        </Box>
                                        <Typography variant="body2" className="text-gray-600">
                                            {averageRating?.toFixed(1) || '0.0'} ({reviews.length}개 후기)
                                        </Typography>
                                    </Box> */}
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

                                    {/* Reviews List */}
                                    <Box className="space-y-3">
                                        {reviews.slice(0, visibleReviewsCount).map((review: MeetingReview, index: number) => (
                                            <Box key={review.id}>
                                                <Box className="bg-gray-100 rounded-xl p-3">
                                                    <Typography variant="subtitle2" className="text-gray-900 mb-1">
                                                        {review.title || '제목 없음'}
                                                    </Typography>
                                                    <Box className="flex justify-start gap-3 items-center">
                                                        <Box className="flex items-center text-gray-800 mb-1">
                                                            {renderStars(review.rating)}
                                                        </Box>
                                                        <Typography variant="caption" className="text-gray-500 mb-1 block">
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
                                </>
                            ) : (
                                <Box className="">

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
                        {snapshotsLoading ? (
                            <Box className='flex items-center justify-center h-36'>
                                <CircularProgress size={28} />
                            </Box>
                        ) : snapshotsError ? (
                            <Box className='flex items-center justify-center h-24'>
                                <Typography variant='body2' className='text-red-500'>{snapshotsError}</Typography>
                            </Box>
                        ) : meetingSnapshots.length > 0 ? (
                            <Box className='flex items-center gap-3 overflow-x-auto no-scrollbar px-1'
                                sx={{ scrollSnapType: 'x mandatory' }}>
                                {meetingSnapshots.slice(0, 10).map((snap) => (
                                    <Box
                                        key={`meeting-snap-${snap.postId}-${snap.imageUrl}`}
                                        className='relative flex-shrink-0 bg-gray-200 rounded-xl overflow-hidden cursor-pointer'
                                        sx={{ width: 220, height: 220, scrollSnapAlign: 'start' }}
                                        onClick={() => navigate(`/post/${snap.postId}`)}
                                    >
                                        <img
                                            src={snap.imageUrl}
                                            alt='meeting snap'
                                            className='w-full h-full object-cover'
                                        />
                                        {/* {(snap.likeCount ?? 0) > 0 && (
                                            <Box className='absolute bottom-2 right-2 text-white bg-black bg-opacity-40 rounded-full px-2 py-1 flex items-center gap-1'>
                                                <i className='ri-heart-fill text-sm' />
                                                <Typography variant='caption'>{snap.likeCount}</Typography>
                                            </Box>
                                        )} */}
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <Box className='flex items-center justify-center h-24 bg-gray-50 rounded-lg'>
                                <Typography variant='body2' className='text-gray-500'>아직 모임을 태그한 게시물이 없습니다.</Typography>
                            </Box>
                        )}
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

            {/* Fixed Bottom CTA pill - HOST VERSION (visible while scrolling) */}
            <Box className="fixed gap-2 left-0 right-0 bottom-4 z-[60] flex justify-center px-4 pointer-events-none">
                <Box
                    // className="pointer-events-auto cursor-pointer"
                    className={`${meetingData.status === 'completed' ? 'cursor-not-allowed' : 'pointer-events-auto cursor-pointer'}`}
                    onClick={openMeetingDetails}
                    sx={{
                        width: '100%',
                        maxWidth: 420,
                        backgroundColor: 'rgba(215,215,215)',
                        borderRadius: '28px',
                        boxShadow: '0 6px 18px rgba(0,0,0,0.15)',
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,1)' }
                    }}
                >
                    {/* Left side - Image and Title */}
                    <Box className="flex items-center min-w-0 flex-1">
                        <img
                            src={meetingData.meetingBackground || meetingData.user.profileImage || null}
                            alt={meetingData.meetingName}
                            height={22}
                            width={22}
                            className="object-cover rounded-full flex-shrink-0"
                            style={{ marginRight: '8px' }}
                        />
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

                    {/* Right side - Edit text */}


                    <Typography
                        variant="body2"
                        className={`${meetingData.status === 'completed' ? 'text-gray-900' : 'font-light'}`}
                        sx={{
                            fontSize: '13px',
                            color: '#111',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}
                    >
                        모임 수정하기
                    </Typography>
                </Box>
            </Box>

            {/* Meeting Details overlay - HOST VERSION */}
            {showMeetingDetails && (
                <Box className="fixed inset-0 bg-gray-100 flex flex-col" style={{ zIndex: 70 }}>
                    {/* Header */}
                    <Box className="flex items-center justify-between px-2 py-3 bg-gray-100">
                        <Box className="flex items-center">
                            <IconButton onClick={closeMeetingDetails} className="p-0 mr-1">
                                <i className="ri-arrow-left-s-line text-2xl" />
                            </IconButton>
                            <Typography variant="subtitle1" className="font-semibold text-gray-800">모임 내역</Typography>
                        </Box>
                    </Box>

                    {/* Content */}
                    <Box className="flex-1 overflow-y-auto px-4 py-4 bg-gray-100">
                        <Box className="max-w-md mx-auto space-y-6">

                            {/* Meeting Overview Card */}
                            <Box className="bg-white rounded-xl p-4">
                                <Typography
                                    variant="h6"
                                    className="font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3"
                                    sx={{
                                        wordWrap: 'break-word',
                                        overflowWrap: 'break-word',
                                        wordBreak: 'break-word',
                                        whiteSpace: 'normal',
                                        lineHeight: 1.4
                                    }}
                                >
                                    {meetingData.meetingName}
                                </Typography>

                                <Box className="space-y-2 mb-4 border-b border-gray-200 pb-2">
                                    <Typography variant="body2" className="text-gray-600">
                                        최근 {formatMeetingDate(meetingData.meetingTime)} 모임 진행
                                    </Typography>
                                    <Typography variant="body2" className="text-gray-600">
                                        정산 주기 : 매달 18일
                                    </Typography>
                                </Box>

                                {/* Financial Breakdown */}
                                <Box className="space-y-3">
                                    <Box className="flex justify-between items-center">
                                        <Typography variant="body2" className="text-gray-700">매출액</Typography>
                                        <Typography variant="body2" className="font-medium text-gray-900">{revenue.toLocaleString()} 원</Typography>
                                    </Box>

                                    <Box className="flex justify-between items-center">
                                        <Typography variant="body2" className="text-gray-700">수수료</Typography>
                                        <Box className="text-right">
                                            <Typography variant="body2" className="font-medium text-gray-900">(2025년 12월 31일까지 무료) -{revenue.toLocaleString()}원</Typography>
                                        </Box>
                                    </Box>

                                    <Box className="">
                                        <Box className="flex justify-between items-center">
                                            <Typography variant="body2" className="font-medium text-gray-900">총 정산액</Typography>
                                            <Typography variant="body2" className="font-bold text-gray-900">0 원</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>

                            {/* Members Card */}
                            <Box className="bg-white rounded-xl p-4">
                                <Typography variant="h6" className="font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                                    멤버 {meetingData.participants.length}
                                </Typography>

                                <Box className="space-y-4">
                                    {(showAllMembers ? meetingData.participants : meetingData.participants.slice(0, 3)).map((participant: any) => (
                                        <Box
                                            key={participant.id ?? `participant-${participant.user?.id}`}
                                            className="flex items-center gap-2 cursor-pointer"
                                            onClick={() => goToProfile(participant.user?.id)}
                                        >
                                            <Avatar
                                                src={participant.user.profileImage || undefined}
                                                className="w-10 h-10 bg-gray-300 mr-3"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    goToProfile(participant.user?.id)
                                                }}
                                            />
                                            <Box>
                                                <Typography
                                                    variant="body1"
                                                    className="font-semibold text-gray-900 flex items-center gap-1 hover:underline"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        goToProfile(participant.user?.id)
                                                    }}
                                                >
                                                    {participant.user.nickname || 'User Name'}
                                                    {(() => {
                                                        const badgeDisplay = getCommunityBadgeDisplay(participant.user.activeCommunityBadge)
                                                        if (!badgeDisplay) return null
                                                        return (
                                                            <img
                                                                src={badgeDisplay.image}
                                                                alt={badgeDisplay.label}
                                                                width={20}
                                                                height={20}
                                                                className='object-contain'
                                                                title={`커뮤니티 등급: ${badgeDisplay.label}`}
                                                            />
                                                        )
                                                    })()}
                                                </Typography>
                                                <Typography variant="body2" className="text-gray-500">
                                                    {new Date(participant.joinedOn).toLocaleDateString('ko-KR')} 참여
                                                </Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>

                                {meetingData.participants.length > 3 && (
                                    <Box
                                        className="text-center mt-4"
                                        onClick={() => setShowAllMembers(!showAllMembers)}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <Typography variant="body2" className="text-black font-semibold">
                                            {showAllMembers ? '멤버 접기' : '멤버 더보기'}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>

                            {/* Schedule Card */}
                            <Box className="bg-white rounded-xl p-4">
                                <Typography variant="h6" className="font-bold text-gray-900 mb-4">
                                    일정 1
                                </Typography>

                                <Box className="space-y-4">
                                    {/* Schedule 1 */}
                                    <Box className="flex items-center">
                                        <Box className="text-center mr-4">
                                            <Typography variant="body1" className="text-red-500 font-medium mr-1">
                                                {new Date(meetingData.meetingTime).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                                            </Typography>
                                            <Typography variant="h3" className="text-black font-semibold">
                                                {new Date(meetingData.meetingTime).getDate()}
                                            </Typography>
                                        </Box>
                                        <Box className="flex-1">
                                            <Typography
                                                variant="body1"
                                                className="font-medium text-gray-900"
                                                sx={{
                                                    wordWrap: 'break-word',
                                                    overflowWrap: 'break-word',
                                                    wordBreak: 'break-word'
                                                }}
                                            >
                                                {meetingData.meetingName}
                                            </Typography>
                                            <Typography variant="body2" className="text-orange-500">
                                                {new Date(meetingData.meetingTime) > new Date() ? '모집중' : '종료'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                                {/* <Button
                                    className='text-center w-full text-black font-semibold cursor-pointer bg-white'
                                    onClick={handleShowMoreMeetings}
                                    disabled={loadingInstances}
                                >
                                    {loadingInstances ? '로딩 중...' : '모임 더보기'}
                                </Button> */}
                            </Box>


                            <Button className='flex py-2 mx-auto gap-[2px] py-[10px]' onClick={() => navigate(`/meeting/add-meeting?id=${meetingData.id}`)}>
                                {/* <ModeEditOutlinedIcon className='text-gray-700' /> */}
                                <Typography className='text-gray-700 text-[16px] underline'>모임 수정</Typography>
                            </Button>



                            {/* Bottom Action Buttons - Now part of scrollable content */}
                            <Box className="flex gap-3 pb-6">
                                <Button
                                    fullWidth
                                    className="border-none"
                                    variant="outlined"
                                    onClick={() => window.open('https://support.thenoldam.com/')}
                                    sx={{
                                        backgroundColor: '#e0e0e0',
                                        color: '#333',
                                        borderRadius: '8px',
                                        textTransform: 'none',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        py: 1.5,
                                        '&:hover': {
                                            backgroundColor: '#e0e0e0'
                                        }
                                    }}
                                >
                                    문의하기
                                </Button>

                                <Button
                                    fullWidth
                                    variant="contained"
                                    onClick={openDeleteDialog}
                                    sx={{
                                        backgroundColor: '#333',
                                        color: '#fff',
                                        borderRadius: '8px',
                                        textTransform: 'none',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        py: 1.5,
                                        '&:hover': { backgroundColor: '#555' }
                                    }}
                                >
                                    모임 삭제하기
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            )}

            <Dialog open={isDeleteDialogOpen} onClose={closeDeleteDialog}>
                <DialogTitle>모임 삭제</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        모임을 삭제하시겠습니까? 삭제하면 복구할 수 없습니다.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={closeDeleteDialog} disabled={isDeletingMeeting} sx={{ color: '#333' }}>
                        취소
                    </Button>
                    <Button
                        onClick={handleDeleteMeeting}
                        variant="contained"
                        disabled={isDeletingMeeting}
                        sx={{ backgroundColor: '#333', '&:hover': { backgroundColor: '#555' } }}
                    >
                        {isDeletingMeeting ? '삭제 중...' : '삭제'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Create Post overlay */}
            {showCreatePost && (
                <Box className="fixed inset-0 bg-white flex flex-col" style={{ zIndex: 80 }}>
                    {/* Fixed header */}
                    <Box className="flex items-center justify-between px-3 py-3 border-b border-gray-200">
                        <IconButton onClick={() => setShowCreatePost(false)} className="p-0">
                            <i className="ri-arrow-left-s-line text-2xl" />
                        </IconButton>
                        <Typography variant="subtitle1" className="font-semibold">게시하기</Typography>
                    </Box>

                    {/* Body */}
                    <Box className="flex-1 px-4 py-4">
                        <TextField
                            multiline
                            minRows={6}
                            fullWidth
                            placeholder="무슨 일이 있었나요?"
                            value={postText}
                            onChange={(e) => setPostText(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': { backgroundColor: '#f9fafb' },
                                '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                            }}
                        />

                        {/* Selected Club preview */}
                        {selectedClub && (
                            <Box className='mt-4 bg-gray-400 rounded-lg px-3 py-2 flex items-center justify-between'>
                                <Box className='flex items-center'>
                                    <Avatar className='w-8 h-8 bg-gray-600 mr-2' />
                                    <Box className="h-8 bg-white mr-2" sx={{ width: '1px' }} />
                                    <Typography variant='body2' className='text-white font-medium'>{selectedClub.name}</Typography>
                                </Box>
                                <IconButton>
                                    <i className='ri-arrow-right-s-line text-white' />
                                </IconButton>
                            </Box>
                        )}

                        {/* Image previews */}
                        {images.length > 0 && (
                            <Box className='mt-4 grid grid-cols-1 gap-2'>
                                {images.map((src, idx) => (
                                    <Box key={idx} className='relative'>
                                        <img src={src} className='w-full h-36 object-cover rounded-lg' />
                                        <IconButton onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))} className='absolute top-1 right-1 bg-black/50'>
                                            <i className='ri-close-line text-white' />
                                        </IconButton>
                                    </Box>
                                ))}
                            </Box>
                        )}

                        {/* File chips */}
                        {files.length > 0 && (
                            <Box className='mt-4 space-y-2'>
                                {files.map((f, idx) => (
                                    <Box key={idx} className='flex items-center bg-gray-400 text-white rounded-lg px-3 py-2 w-full max-w-md'>
                                        <i className='ri-folder-2-line mr-2' />
                                        <Box className="h-8 bg-white mr-2" sx={{ width: '1px' }} />
                                        <span className='flex-1 truncate'>{f.name}</span>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Box>

                    {/* Bottom plus and options */}
                    <Box className="p-4 border-t border-gray-200">
                        <Box className="relative">
                            <IconButton
                                onClick={() => setShowOptions(!showOptions)}
                                className="absolute left-1 -top-12 w-10 h-10 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center shadow-none"
                            >
                                <i className="ri-add-line" />
                            </IconButton>

                            {showOptions && (
                                <Box className="absolute bottom-16 left-2 z-10">
                                    <Box className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-w-[240px]">
                                        <div className="divide-y divide-gray-200">
                                            <Button size="small" className="w-full justify-start py-2 px-3" onClick={() => { setShowOptions(false); setShowClubSelect(true) }}>
                                                <span className="w-9 h-9 rounded-full bg-gray-300 inline-flex items-center justify-center mr-2 text-gray-700">
                                                    <i className="ri-group-line" />
                                                </span>
                                                <span className="text-gray-800">상대방의 모임</span>
                                            </Button>
                                            <Button size="small" className="w-full justify-start py-2 px-3" onClick={triggerImagePicker}>
                                                <span className="w-9 h-9 rounded-full bg-gray-300 inline-flex items-center justify-center mr-2 text-gray-700">
                                                    <i className="ri-image-line" />
                                                </span>
                                                <span className="text-gray-800">사진</span>
                                            </Button>
                                            <Button size="small" className="w-full justify-start py-2 px-3" onClick={triggerFilePicker}>
                                                <span className="w-9 h-9 rounded-full bg-gray-300 inline-flex items-center justify-center mr-2 text-gray-700">
                                                    <i className="ri-folder-2-line" />
                                                </span>
                                                <span className="text-gray-800">파일</span>
                                            </Button>
                                        </div>
                                    </Box>
                                </Box>
                            )}

                            {/* Hidden pickers */}
                            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelected} />
                            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
                        </Box>
                    </Box>
                </Box>
            )}

            {/* Club select in-page overlay */}
            {showClubSelect && (
                <Box className='fixed inset-0 bg-white z-80 flex flex-col'>
                    {/* Header */}
                    <Box className='flex items-center justify-between px-2 py-3 border-b border-gray-200'>
                        <Box className='flex items-center'>
                            <IconButton onClick={() => setShowClubSelect(false)} className='p-0'>
                                <i className='ri-arrow-left-s-line text-2xl' />
                            </IconButton>
                            <Typography variant='subtitle1' className='font-semibold text-gray-800'>모임 선택하기</Typography>
                        </Box>
                        <Button
                            variant='text'
                            className='text-gray-800'
                            disabled={!tempClub}
                            onClick={() => { if (tempClub) { setSelectedClub(tempClub); setShowClubSelect(false); } }}
                        >
                            확인
                        </Button>
                    </Box>

                    {/* List */}
                    <Box className='flex-1 overflow-y-auto px-4 py-4'>
                        <Box className='space-y-4'>
                            {[{ id: '1', name: 'Prehistoric Planet', desc: 'The groundbreaking series', date: '2025년 05월 14일에 진행', image: '/images/custom/carousel-image1.jpg' },
                            { id: '2', name: 'Morning Club', desc: '러닝 ㆍ 아침 런 커뮤니티', date: '2025년 05월 14일에 진행', image: '/images/custom/carousel-image2.png' },
                            { id: '3', name: 'Wellness Club', desc: '건강 ㆍ 성장 ㆍ 웰빙', date: '2025년 05월 14일에 진행', image: '/images/custom/carousel-image3.png' }].map((c) => (
                                <Box key={c.id} className={`bg-white rounded-lg overflow-hidden border-2 cursor-pointer ${tempClub?.id === c.id ? 'border-blue-500' : 'border-transparent'}`} onClick={() => setTempClub(c)}>
                                    <Box className='w-full h-32 bg-gray-800 flex items-center justify-center'>
                                        <img src={c.image} alt={c.name} className='w-full h-full object-cover opacity-80' />
                                    </Box>
                                    <Box className='p-3'>
                                        <Typography variant='caption' className='text-gray-500 block mb-1'>{c.date}</Typography>
                                        <Typography variant='h5' className='text-gray-900'>{c.name}</Typography>
                                        <Typography variant='body2' className='text-gray-600'>{c.desc}</Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Box>
            )}

            {/* Meeting Instances Display */}
            {showAllInstances && meetingInstances.length > 0 && (
                <Box className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'>
                    <Box className='bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto'>
                        <Box className='flex items-center justify-between mb-4'>
                            <Typography variant='h6' className='font-semibold'>
                                모임 일정
                            </Typography>
                            <IconButton onClick={() => setShowAllInstances(false)}>
                                <i className='ri-close-line text-xl' />
                            </IconButton>
                        </Box>

                        <Box className='space-y-3'>
                            {meetingInstances.map((instance, index) => (
                                <Box
                                    key={instance.id}
                                    className={`p-3 rounded-lg border ${instance.isOriginal
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-gray-50 border-gray-200'
                                        }`}
                                >
                                    <Box className='flex items-center justify-between'>
                                        <Box>
                                            <Typography variant='body2' className='font-medium'>
                                                {new Date(instance.meetingTime).toLocaleDateString('ko-KR', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    weekday: 'long'
                                                })}
                                            </Typography>
                                            <Typography variant='caption' className='text-gray-500'>
                                                {new Date(instance.meetingTime).toLocaleTimeString('ko-KR', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </Typography>
                                        </Box>
                                        {instance.isOriginal && (
                                            <Typography variant='caption' className='bg-blue-100 text-blue-800 px-2 py-1 rounded'>
                                                첫 모임
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            ))}
                        </Box>

                        <Box className='mt-4 flex gap-2'>
                            <Button
                                fullWidth
                                variant='outlined'
                                onClick={() => setShowAllInstances(false)}
                            >
                                닫기
                            </Button>
                            <Button
                                fullWidth
                                variant='contained'
                                onClick={() => setShowFrequencyModal(true)}
                                sx={{ backgroundColor: '#3D3D3D' }}
                            >
                                간격 설정
                            </Button>
                        </Box>
                    </Box>
                </Box>
            )}

            {/* Frequency Selection Modal */}
            {showFrequencyModal && (
                <Box className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'>
                    <Box className='bg-white rounded-2xl p-6 w-full max-w-sm'>
                        <Typography variant='h6' className='text-center mb-4'>
                            모임 간격 선택
                        </Typography>
                        <Box className='space-y-2'>
                            {([
                                { value: 'none', label: '설정하지 않음' },
                                { value: 'weekly', label: '매주' },
                                { value: 'biweekly', label: '2주 간격으로' },
                                { value: 'monthly', label: '한달 간격으로' }
                            ] as const).map(option => (
                                <Button
                                    key={option.value}
                                    fullWidth
                                    variant={meetingData?.meetingFrequency === option.value ? 'contained' : 'outlined'}
                                    onClick={() => {
                                        if (option.value === 'none') {
                                            handleFrequencyUpdate(option.value)
                                        } else {
                                            // For recurring meetings, set end date to 3 months from now
                                            const endDate = new Date()
                                            endDate.setMonth(endDate.getMonth() + 3)
                                            handleFrequencyUpdate(option.value, endDate.toISOString())
                                        }
                                    }}
                                    sx={{
                                        backgroundColor: meetingData?.meetingFrequency === option.value ? '#3D3D3D' : 'transparent',
                                        borderColor: '#E5E7EB',
                                        color: meetingData?.meetingFrequency === option.value ? '#FFF' : '#111827',
                                        textTransform: 'none',
                                        mb: 1
                                    }}
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </Box>
                        <Button
                            fullWidth
                            variant='outlined'
                            onClick={() => setShowFrequencyModal(false)}
                            sx={{ mt: 2 }}
                        >
                            취소
                        </Button>
                    </Box>
                </Box>
            )}
        </Box>
    )
}

export default ItemDetailHostPage

