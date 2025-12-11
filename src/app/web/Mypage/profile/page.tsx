'use client'

import React from 'react'
import { Box, Typography, IconButton, Avatar, Button, Tabs, Tab, Tooltip, CircularProgress, TextField } from '@mui/material'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import { formatDateTime, formatNumber, getCurrentTimestamp } from '@/utils/dateTimeUtils'
import FeedApiService from '@/services/feedApi'

// Removed old hooks - now using Redux via useMyPageActions

import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { useMyPageActions } from '@/hooks/useMyPageActions'
import type { ThreadedReplies, UnderlineState } from '@/services/types/frontend'

import { getActiveCommunityBadge, getCommunityBadgeDisplay, isCurrentUser } from '@/utils/badgeUtils'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorBoundary from '@/components/ErrorBoundary'
import { setToken, checkAuthStatus } from '@/store/slices/authSlice'
import ReplyModal from '@/components/ReplyModal'
import ThreadView from '@/components/ThreadView'
import CommentItem from '@/components/CommentItem'
import FollowButton from '@/components/FollowButton'
import { userApi } from '@/services/userApi'


const MyPostDetailMainPage = React.memo((props: {}) => {

  const router = useRouter()
  const { navigate } = useNavigation()
  const dispatch = useAppDispatch()
  const searchParams = useSearchParams()

  // Use Redux for all data
  const {
    profileData,
    profileLoading,
    profileError,
    summaryData,
    summaryLoading,
    summaryError,
    feedData,
    feedLoading,
    feedError,
    activeTab: reduxActiveTab,
    meetingsData,
    meetingsLoading,
    meetingsError,
    badgesData,
    badgesLoading,
    badgesError,
    loadAllDataStable,
    loadFeed,
    loadMeetings,
    setTab,
    clearData,
    likePost: handleLikePost,
    likeComment: handleLikeComment,
    deleteComment: handleDeleteComment,
    loadProfile,
    updateProfilePrivacy,
    updateTabPrivacy
  } = useMyPageActions()

  const { isAuthenticated, user, token } = useAppSelector((state) => (state as any).authReducer || {})
  const { likedPosts, likedComments } = useAppSelector((state) => (state as any).mypageReducer || {})

  const authUserId = React.useMemo(() => {
    // Only use auth state id - never fallback to profile data
    if (user) {
      // Try different possible ID fields - including userUuid
      let userId = user.id || user.userId || user.uid || user.userUuid

      if (userId != null) {
        const parsedUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId
        return parsedUserId
      }
    }
    return null
  }, [user])

  const profileBadgeDisplay = React.useMemo(() => {
    const badge = (profileData as any)?.data?.user?.activeCommunityBadge || null
    return getCommunityBadgeDisplay(badge)
  }, [profileData])

  const resolveBadgeId = React.useCallback((input: any) => {
    if (!input) return null
    if (input.id != null) return input.id
    if (input.badgeId != null) return input.badgeId
    if (input.badge?.id != null) return input.badge.id
    return null
  }, [])

  const activeCommunityBadgeId = React.useMemo(() => (
    resolveBadgeId((profileData as any)?.data?.user?.activeCommunityBadge)
  ), [profileData, resolveBadgeId])

  const rankHighlight = React.useMemo(() => {
    const activeCommunityBadge = (profileData as any)?.data?.user?.activeCommunityBadge
    const stats = (profileData as any)?.data?.stats

    // Helper function to verify if user has met badge conditions
    const hasMetBadgeConditions = (badgeKey: string | undefined): boolean => {
      if (!badgeKey || !stats) return false

      const meetingsCreatedCount = stats.meetingsCreatedCount || 0

      // Verify badge conditions based on badge key
      switch (badgeKey) {
        case 'seeds':
          // Seeds badge requires at least 1 meeting created
          return meetingsCreatedCount >= 1
        case 'Mokkoji':
          // Mokkoji badge requires at least 3 meetings created
          return meetingsCreatedCount >= 3
        case 'name':
          // Name badge requires at least 7 meetings created
          return meetingsCreatedCount >= 7
        case 'fencer':
          // Fencer badge requires at least 15 meetings created
          return meetingsCreatedCount >= 15
        default:
          return false
      }
    }

    if (profileBadgeDisplay && activeCommunityBadge) {
      // Verify that user has actually met the badge conditions
      if (!hasMetBadgeConditions(profileBadgeDisplay.key)) {
        return null
      }

      const badgeLabel = profileBadgeDisplay.label
      const badgeName = activeCommunityBadge.name || `${badgeLabel} Rank`
      const headline = `Upgraded to ${badgeName}`
      const description =
        activeCommunityBadge.description ||
        `${badgeLabel} grade`

      return {
        badgeLabel,
        headline,
        description,
        image: profileBadgeDisplay.image
      }
    }

    const mainBadge = (summaryData as any)?.data?.mainBadge
    if (mainBadge) {
      const badgeLabel = mainBadge.name || 'Community badge'
      const isCommunityRank = mainBadge.badgeType === 'community_rating'

      return {
        badgeLabel,
        headline: isCommunityRank ? `Upgraded to ${badgeLabel}` : badgeLabel,
        description: mainBadge.description || '',
        image: mainBadge.imageUrl || '/images/custom/mypage-main-badge.png'
      }
    }

    return null
  }, [profileBadgeDisplay, profileData, summaryData])


  // Hydrate auth from localStorage if Redux is not authenticated yet
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    if (isAuthenticated) return

    try {
      const raw = localStorage.getItem('noldam-root') || localStorage.getItem('persist:noldam-root')
      if (!raw) {
        return
      }

      const parsed = JSON.parse(raw as string)
      const auth = JSON.parse(parsed.auth || '{}')
      const token = auth.token || null

      // Hydrating auth from storage
      if (token) {
        dispatch(setToken(token))
        dispatch(checkAuthStatus())
        // Ensure apiService can read token from localStorage (single source used by services)
        try {
          const rootPayload = JSON.stringify({ auth: JSON.stringify({ token }) })
          localStorage.setItem('noldam-root', rootPayload)
          localStorage.setItem('persist:noldam-root', rootPayload)
        } catch (e2) {
          // Failed writing token to storage
        }
      }
    } catch (e) {
      // Failed to hydrate auth
    }
  }, [isAuthenticated, dispatch])
  const [activeTab, setActiveTab] = React.useState(0)

  // Function to handle tab changes and update URL
  const handleTabChange = React.useCallback((tabIndex: number) => {
    setActiveTab(tabIndex)

    // Update URL with new tab parameter
    const tabNames = ['summary', 'feed', 'meetings', 'badges']
    const tabName = tabNames[tabIndex]

    if (tabName) {
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.set('tab', tabName)
      router.replace(currentUrl.pathname + currentUrl.search)
    }
  }, [router])
  const currentUserIdRef = React.useRef<number | null>(null)
  const profileLoadedRef = React.useRef<boolean>(false)
  const [authChecked, setAuthChecked] = React.useState(false)

  // Check authentication and redirect if needed
  React.useEffect(() => {
    // Wait a bit for auth to hydrate from localStorage
    const timer = setTimeout(() => {
      setAuthChecked(true)
      if (!isAuthenticated && !user) {
        navigate('/login')
      }
    }, 1000) // Give 1 second for auth to hydrate

    return () => clearTimeout(timer)
  }, [isAuthenticated, user, router])

  // Single effect to handle all profile loading
  React.useEffect(() => {
    const uid = searchParams?.get('userId')
    const targetUserId = uid ? parseInt(uid, 10) : authUserId

    // Only proceed if we have a valid target user ID
    if (!targetUserId || targetUserId <= 0) {
      return
    }

    // Check if we need to load data
    const isDifferentUser = currentUserIdRef.current !== targetUserId
    const cachedProfileUserId = (profileData as any)?.data?.user?.id
    const hasWrongCachedData = cachedProfileUserId && parseInt(cachedProfileUserId) !== targetUserId

    if (isDifferentUser || hasWrongCachedData || !profileLoadedRef.current) {
      // Clear data if switching users
      if (isDifferentUser || hasWrongCachedData) {
        clearData()
        profileLoadedRef.current = false // Reset loaded flag when switching users
      }

      currentUserIdRef.current = targetUserId
      profileLoadedRef.current = true

      // Load all data for the target user
      loadAllDataStable(targetUserId)
    }
  }, [searchParams, authUserId, loadAllDataStable, clearData, profileData, isAuthenticated, user])

  // Additional effect to handle authUserId becoming available
  React.useEffect(() => {
    if (authUserId && authUserId > 0) {
      const uid = searchParams?.get('userId')
      const targetUserId = uid ? parseInt(uid, 10) : authUserId

      // If we're viewing our own profile and haven't loaded it yet
      if (!uid && !profileLoadedRef.current) {
        currentUserIdRef.current = authUserId
        profileLoadedRef.current = true
        loadAllDataStable(authUserId)
      }
    }
  }, [authUserId, searchParams, loadAllDataStable])

  // Update current user ref when profile data loads
  React.useEffect(() => {
    if (profileData) {
      const profileUserId = (profileData as any)?.data?.user?.id
      if (profileUserId) {
        currentUserIdRef.current = parseInt(profileUserId)
      }
    }
  }, [profileData])

  // Profile privacy/visibility state
  const profileUserId = React.useMemo(() => {
    const id = (profileData as any)?.data?.user?.id
    return typeof id === 'string' ? parseInt(id, 10) : id ?? null
  }, [(profileData as any)?.data?.user?.id])

  const isOwnProfile = React.useMemo(() => {
    // Check URL parameter first - if userId is in URL, it's someone else's profile
    const urlUserId = searchParams?.get('userId')
    if (urlUserId) {
      // But check if it matches the current user
      if (authUserId != null && Number(urlUserId) === Number(authUserId)) {
        return true // It's actually our own profile
      }
      return false // Definitely someone else's profile
    }

    // If no URL userId and we have auth data, it's our own profile
    if (authUserId != null && authUserId > 0) {
      return true
    }

    // If profileUserId is loaded and matches authUserId, it's our profile
    if (profileUserId != null && authUserId != null) {
      return Number(authUserId) === Number(profileUserId)
    }

    // Default to own profile if we can't determine otherwise
    return true
  }, [authUserId, profileUserId, searchParams])

  // Redirect to own profile if userId in URL matches authenticated user
  React.useEffect(() => {
    if (!authUserId || authUserId <= 0) return

    const urlUserId = searchParams?.get('userId')
    if (!urlUserId) return

    const urlUserIdNum = parseInt(urlUserId, 10)
    if (isNaN(urlUserIdNum)) return

    // If URL userId matches authenticated user, redirect to own profile
    if (Number(urlUserIdNum) === Number(authUserId)) {
      const tabParam = searchParams?.get('tab')
      const newUrl = tabParam ? `/profile?tab=${tabParam}` : '/profile'
      router.replace(newUrl)
    }
  }, [authUserId, searchParams, router])

  // Set initial tab from URL parameter or based on profile ownership
  React.useEffect(() => {
    // Check if there's a tab parameter in the URL
    const tabParam = searchParams?.get('tab')

    if (tabParam) {
      // Map tab names to indices
      const tabMap: Record<string, number> = {
        'summary': 0,
        'feed': 1,
        'meetings': 2,
        'badges': 3
      }

      const tabIndex = tabMap[tabParam.toLowerCase()]
      if (tabIndex !== undefined && tabIndex !== activeTab) {
        setActiveTab(tabIndex)
        return
      }
    }

    // Default behavior: Start on 피드 tab for other users
    if (!isOwnProfile && activeTab === 0) {
      setActiveTab(1)
    }
  }, [isOwnProfile, searchParams]) // Removed activeTab from dependencies to prevent loops

  const isProfilePublic = React.useMemo(() => {
    const visible = (profileData as any)?.data?.profile?.publicVisibility
    return visible !== false // default true when undefined
  }, [(profileData as any)?.data?.profile?.publicVisibility])

  // Individual tab privacy states
  const feedPrivacy = React.useMemo(() => {
    const privacy = (profileData as any)?.data?.profile?.feedPrivacy
    return privacy !== false // default true when undefined
  }, [(profileData as any)?.data?.profile?.feedPrivacy])

  const meetingsPrivacy = React.useMemo(() => {
    const privacy = (profileData as any)?.data?.profile?.meetingsPrivacy
    return privacy !== false // default true when undefined
  }, [(profileData as any)?.data?.profile?.meetingsPrivacy])

  const badgesPrivacy = React.useMemo(() => {
    const privacy = (profileData as any)?.data?.profile?.badgesPrivacy
    return privacy !== false // default true when undefined
  }, [(profileData as any)?.data?.profile?.badgesPrivacy])

  const isPrivateForViewer = !isProfilePublic && !isOwnProfile

  // Ensure token is saved to localStorage when available
  React.useEffect(() => {
    if (isAuthenticated && user?.id && token && typeof window !== 'undefined') {
      try {
        const authData = { token }
        const rootPayload = JSON.stringify({ auth: JSON.stringify(authData) })
        localStorage.setItem('noldam-root', rootPayload)
        localStorage.setItem('persist:noldam-root', rootPayload)
        localStorage.setItem('persist:root', rootPayload)
      } catch (error) {
        // Failed to save token to localStorage
      }
    }
  }, [isAuthenticated, user?.id, token])

  // Privacy toggle handler
  const handlePrivacyToggle = React.useCallback(async () => {
    if (!isOwnProfile) return

    try {
      const newVisibility = !isProfilePublic
      await updateProfilePrivacy(newVisibility)
    } catch (error) {
      // Failed to update privacy setting
    }
  }, [isOwnProfile, isProfilePublic, updateProfilePrivacy])

  // Individual tab privacy toggle handlers
  const handleFeedPrivacyToggle = React.useCallback(async () => {
    if (!isOwnProfile) return

    try {
      const newPrivacy = !feedPrivacy
      await updateTabPrivacy('feed', newPrivacy)
    } catch (error) {
      // Failed to update feed privacy setting
    }
  }, [isOwnProfile, feedPrivacy, updateTabPrivacy])

  const handleMeetingsPrivacyToggle = React.useCallback(async () => {
    if (!isOwnProfile) return

    try {
      const newPrivacy = !meetingsPrivacy
      await updateTabPrivacy('meetings', newPrivacy)
    } catch (error) {
      // Failed to update meetings privacy setting
    }
  }, [isOwnProfile, meetingsPrivacy, updateTabPrivacy])

  const handleBadgesPrivacyToggle = React.useCallback(async () => {
    if (!isOwnProfile) return

    try {
      const newPrivacy = !badgesPrivacy
      await updateTabPrivacy('badges', newPrivacy)
    } catch (error) {
      // Failed to update badges privacy setting
    }
  }, [isOwnProfile, badgesPrivacy, updateTabPrivacy])

  // Threads-style modal handlers
  // Handler for commenting directly on a post (no parent comment)
  const handleCommentOnPost = React.useCallback((post: any) => {
    setSelectedComment(null) // No parent comment - this is a top-level comment
    setSelectedPost(post)
    setReplyModalOpen(true)
  }, [])

  // Handler for replying to a specific comment
  const handleReplyClick = React.useCallback((comment: any, post: any) => {
    // handleReplyClick called with comment and post
    // Comment ID:
    setSelectedComment(comment)
    setSelectedPost(post)
    setReplyModalOpen(true)
  }, [])

  const handleThreadClick = React.useCallback((comment: any, post: any) => {
    setSelectedComment(comment)
    setSelectedPost(post)
    setThreadViewOpen(true)
  }, [])

  // Handler for clicking on a comment to view its thread
  const handleCommentClick = React.useCallback((comment: any, post: any) => {
    setSelectedComment(comment)
    setSelectedPost(post)
    setThreadViewOpen(true)
  }, [])

  const handleCloseModals = React.useCallback(() => {
    setReplyModalOpen(false)
    setThreadViewOpen(false)
    setSelectedComment(null)
    setSelectedPost(null)
  }, [])


  const tabContainerRef = React.useRef<HTMLDivElement | null>(null)

  const tabRefs = React.useRef<Array<HTMLDivElement | null>>([])

  const [underline, setUnderline] = React.useState<UnderlineState>({ left: 0, width: 0 })

  const [currentSlide, setCurrentSlide] = React.useState(0)

  const [feedTab, setFeedTab] = React.useState<number>(0)
  const feedTabs = React.useMemo(() => ['게시물', 'Replies', '태그'], [])

  // Handle successful reply submission
  const handleReplySuccess = React.useCallback(() => {
    // Refresh the feed data to update comment counts
    if (authUserId) {
      loadFeed(feedTab === 0 ? 'posts' : feedTab === 1 ? 'replies' : 'tagged', Number(authUserId))
    }
  }, [authUserId, loadFeed, feedTab])

  const [groupTab, setGroupTab] = React.useState(0) // 0 전체, 1 곧 온다, 2 참여, 3 개설

  const [isFollowOpen, setIsFollowOpen] = React.useState(false)
  const [isHelperExpanded, setIsHelperExpanded] = React.useState(false)

  // Threads-style modal states
  const [replyModalOpen, setReplyModalOpen] = React.useState(false)
  const [threadViewOpen, setThreadViewOpen] = React.useState(false)
  const [selectedComment, setSelectedComment] = React.useState<any>(null)
  const [selectedPost, setSelectedPost] = React.useState<any>(null)

  // Load summary when summary tab is active
  React.useEffect(() => {
    if (activeTab === 0) { // Summary tab
      const uid = searchParams?.get('userId')
      const targetUserId = uid ? parseInt(uid, 10) : authUserId
      if (targetUserId && targetUserId > 0) {
        // Summary data is already loaded by loadAllDataStable
        // No additional API call needed for summary tab
      }
    }
  }, [activeTab, searchParams?.get('userId'), authUserId])

  // Load feed when feed tab is active
  React.useEffect(() => {
    if (activeTab === 1) { // Feed tab
      const uid = searchParams?.get('userId')
      const targetUserId = uid ? parseInt(uid, 10) : authUserId
      if (targetUserId && targetUserId > 0) {
        loadFeed('posts', targetUserId)
      }
    }
  }, [activeTab, searchParams?.get('userId'), authUserId, loadFeed])

  // Load meetings when meetings tab is active
  React.useEffect(() => {
    if (activeTab === 2) { // Meetings tab
      const uid = searchParams?.get('userId')
      const targetUserId = uid ? parseInt(uid, 10) : authUserId
      if (targetUserId && targetUserId > 0) {
        loadMeetings(targetUserId)
      }
    }
  }, [activeTab, searchParams?.get('userId'), authUserId])

  // Listen for meeting creation events to refresh meetings data
  React.useEffect(() => {
    const handleMeetingCreated = () => {
      // Only refresh if we're on the meetings tab
      if (activeTab === 2) {
        const uid = searchParams?.get('userId')
        const targetUserId = uid ? parseInt(uid, 10) : authUserId
        if (targetUserId && targetUserId > 0) {
          // Add a small delay to ensure the meeting is saved in the database
          setTimeout(() => {
            loadMeetings(targetUserId)
          }, 1000)
        }
      }
    }

    // Listen for custom event when meeting is created
    window.addEventListener('meeting-created', handleMeetingCreated)

    return () => {
      window.removeEventListener('meeting-created', handleMeetingCreated)
    }
  }, [activeTab, searchParams?.get('userId'), authUserId, loadMeetings])

  // Load badges when badges tab is active
  React.useEffect(() => {
    if (activeTab === 3) { // Badges tab
      const uid = searchParams?.get('userId')
      const targetUserId = uid ? parseInt(uid, 10) : authUserId
      if (targetUserId && targetUserId > 0) {
        // Badges don't need userId parameter, they're user-specific
        // loadBadges() // This would be called if we had loadBadges in useMyPageActions
      }
    }
  }, [activeTab, searchParams?.get('userId'), authUserId])

  // Load specific meeting type when groupTab changes
  React.useEffect(() => {
    if (activeTab === 2) { // Only when meetings tab is active
      const uid = searchParams?.get('userId')
      const targetUserId = uid ? parseInt(uid, 10) : authUserId
      if (targetUserId && targetUserId > 0) {
        // For tab 1 (곧 온다), load 'upcoming' from API
        // For tab 2 (참여), load 'participated'
        // For tab 3 (개설), load 'created'
        const meetingType: 'all' | 'created' | 'participated' | 'upcoming' = groupTab === 0 ? 'all' :
          groupTab === 1 ? 'upcoming' : // 곧 온다 - API handles filtering
            groupTab === 2 ? 'participated' :
              'created'
        loadMeetings(targetUserId, meetingType as 'all' | 'created' | 'participated')
      }
    }
  }, [groupTab, activeTab, searchParams?.get('userId'), authUserId, loadMeetings])

  // Data loading is now handled by the single consolidated effect above


  // Ensure profile is fetched to derive user id if missing
  // Profile loading is now handled by the single consolidated effect above

  // Tab-specific data loading is now handled by loadAllDataStable
  // No separate effects needed to prevent duplicate API calls



  const [followTab, setFollowTab] = React.useState(0) // 0 팔로워, 1 팔로잉

  const goToProfile = React.useCallback((targetUserId?: number | null) => {
    if (!targetUserId) return
    setIsFollowOpen(false)
    navigate(`/profile?userId=${targetUserId}`)
  }, [navigate])

  React.useEffect(() => {
    if (!isFollowOpen) {
      setFollowTab(0)
    }
  }, [isFollowOpen])

  // Dynamic followers/following data
  const [dynamicFollowers, setDynamicFollowers] = React.useState<any[]>([])
  const [dynamicFollowing, setDynamicFollowing] = React.useState<any[]>([])
  const [followersLoading, setFollowersLoading] = React.useState(false)
  const [followingLoading, setFollowingLoading] = React.useState(false)

  // Batch follow status data
  const [followStatusMap, setFollowStatusMap] = React.useState<Record<number, boolean>>({})

  // Follow status for the profile user (when viewing someone else's profile)
  const [profileFollowStatus, setProfileFollowStatus] = React.useState<boolean>(false)
  const [profileFollowStatusLoading, setProfileFollowStatusLoading] = React.useState(false)

  // Load dynamic followers/following data
  const loadDynamicFollowers = React.useCallback(async (userId: number) => {
    setFollowersLoading(true)
    try {
      const result = await userApi.getFollowers(userId)
      if (result) {
        setDynamicFollowers(result.followers)

        // Extract follow status from the API response (already included)
        const followStatusMap: Record<number, boolean> = {}
        result.followers.forEach((follower: any) => {
          followStatusMap[follower.id] = follower.isFollowing
        })
        setFollowStatusMap(prev => ({ ...prev, ...followStatusMap }))
      }
    } catch (error) {
      // Error loading followers
    } finally {
      setFollowersLoading(false)
    }
  }, [])

  const loadDynamicFollowing = React.useCallback(async (userId: number) => {
    setFollowingLoading(true)
    try {
      const result = await userApi.getFollowing(userId)
      if (result) {
        setDynamicFollowing(result.following)

        // Extract follow status from the API response (already included)
        const followStatusMap: Record<number, boolean> = {}
        result.following.forEach((following: any) => {
          followStatusMap[following.id] = following.isFollowing
        })
        setFollowStatusMap(prev => ({ ...prev, ...followStatusMap }))
      }
    } catch (error) {
      // Error loading following
    } finally {
      setFollowingLoading(false)
    }
  }, [])

  // Fetch follow status for profile user (when viewing someone else's profile)
  React.useEffect(() => {
    const fetchProfileFollowStatus = async () => {
      if (!isOwnProfile && profileUserId && authUserId && profileUserId !== authUserId) {
        try {
          setProfileFollowStatusLoading(true)
          const status = await userApi.getFollowStatus(profileUserId)
          if (status !== null) {
            setProfileFollowStatus(status)
            // Also update the followStatusMap for consistency
            setFollowStatusMap(prev => ({ ...prev, [profileUserId]: status }))
          }
        } catch (error) {
          // Error fetching follow status
        } finally {
          setProfileFollowStatusLoading(false)
        }
      } else {
        setProfileFollowStatus(false)
      }
    }

    fetchProfileFollowStatus()
  }, [isOwnProfile, profileUserId, authUserId])

  // Sync profileFollowStatus when followStatusMap changes for the profile user
  React.useEffect(() => {
    if (profileUserId && followStatusMap[profileUserId] !== undefined) {
      setProfileFollowStatus(followStatusMap[profileUserId])
    }
  }, [followStatusMap, profileUserId])


  // Load dynamic data when follow modal opens
  React.useEffect(() => {
    if (isFollowOpen && authUserId) {
      const uid = searchParams?.get('userId')
      const targetUserId = uid ? parseInt(uid, 10) : authUserId

      if (targetUserId && targetUserId > 0) {
        if (followTab === 0) {
          // Load followers
          loadDynamicFollowers(targetUserId)
        } else {
          // Load following
          loadDynamicFollowing(targetUserId)
        }
      }
    }
  }, [isFollowOpen, followTab, authUserId, searchParams?.get('userId'), loadDynamicFollowers, loadDynamicFollowing])

  // Reply functionality state
  const [replyingTo, setReplyingTo] = React.useState<number | null>(null)
  const [threadedReplies, setThreadedReplies] = React.useState<ThreadedReplies>({})
  const [expandedComments, setExpandedComments] = React.useState<Set<number>>(new Set())
  // Optimistic replies per post to avoid full tab reload
  const [optimisticRepliesByPostId, setOptimisticRepliesByPostId] = React.useState<Record<number, any[]>>({})
  // If user likes an optimistic reply, remember to send like after server assigns real id
  const [pendingLikeByParentId, setPendingLikeByParentId] = React.useState<Record<number, boolean>>({})

  // Helper functions for threaded replies
  const getThreadedReplyText = (commentId: number) => threadedReplies[commentId] || ''
  const setThreadedReplyText = (commentId: number, text: string) => {
    setThreadedReplies(prev => ({ ...prev, [commentId]: text }))
  }
  const clearThreadedReply = (commentId: number) => {
    setThreadedReplies(prev => {
      const newState = { ...prev }
      delete newState[commentId]
      return newState
    })
  }

  // Helper function to get current meetings based on selected tab
  const getCurrentMeetings = React.useCallback(() => {
    if (!meetingsData) return []

    let meetings: any[] = []

    // Support both array and object shapes
    if (Array.isArray(meetingsData)) {
      // If it's an array, we need to filter based on tab
      if (groupTab === 1) {
        // 곧 온다 - filter upcoming meetings
        const now = new Date()
        meetings = meetingsData.filter((meeting: any) => {
          // Must have meetingTime
          if (!meeting.meetingTime) return false

          // Only show approved meetings (not draft, pending, reject, or completed)
          const status = meeting.status || 'draft'
          if (status !== 'approved') return false

          // Parse meetingTime (handle both Date objects and strings)
          const meetingTime = meeting.meetingTime instanceof Date
            ? meeting.meetingTime
            : new Date(meeting.meetingTime)

          // Check if meeting has ended (meetingTime + duration)
          const duration = meeting.duration || 60 // Default to 60 minutes if not specified
          const meetingEndTime = new Date(meetingTime.getTime() + duration * 60 * 1000)

          // Only show meetings that haven't ended yet
          return meetingEndTime > now
        })
      } else {
        meetings = meetingsData
      }
    } else {
      const data = meetingsData as any
      if (groupTab === 0) {
        meetings = data.all || []
      } else if (groupTab === 1) {
        // 곧 온다 - use upcoming meetings from API (already filtered server-side)
        meetings = data.upcoming || []
      } else if (groupTab === 2) {
        meetings = data.participated || []
      } else {
        meetings = data.created || []
      }
    }

    // Sort meetings
    // For "곧 온다" tab, sort by meetingTime ascending (soonest first)
    // For other tabs, sort by creation date descending (newest first)
    return [...meetings].sort((a, b) => {
      if (groupTab === 1) {
        // Sort by meetingTime ascending (soonest first)
        const timeA = a.meetingTime ? new Date(a.meetingTime).getTime() : 0
        const timeB = b.meetingTime ? new Date(b.meetingTime).getTime() : 0
        return timeA - timeB
      } else {
        // Sort by creation date descending (newest first)
        const dateA = new Date(a.createdAt || a.created_at || 0).getTime()
        const dateB = new Date(b.createdAt || b.created_at || 0).getTime()
        return dateB - dateA
      }
    })
  }, [meetingsData, groupTab])

  const [shareModalOpen, setShareModalOpen] = React.useState(false)
  const [shareUrl, setShareUrl] = React.useState('')
  const [shareCopied, setShareCopied] = React.useState(false)


  // Toggle post like function - now uses Redux state
  const togglePostLike = async (postId: number) => {
    try {
      const result = await handleLikePost(postId)
    } catch (error) {
      // Error toggling like
    }
  }

  // Render ordered content for posts
  const renderOrderedContent = (content: any) => {
    if (!content) return null;

    // Try to parse as ordered content array first (JSON content)
    let orderedContent;
    try {
      // Check if content is already an array
      if (Array.isArray(content)) {
        orderedContent = content;
      } else if (typeof content === 'string') {
        // Try to parse JSON string first
        orderedContent = JSON.parse(content);
      } else {
        orderedContent = content;
      }
    } catch (error) {
      // If JSON parsing fails, check if it's HTML content from rich text editor
      if (typeof content === 'string' && (content.includes('<p>') || content.includes('<div>') || content.includes('<img'))) {
        return (
          <Box
            className='text-gray-800 mb-3 ql-editor-content'
            dangerouslySetInnerHTML={{ __html: content }}
            sx={{
              '& p': {
                margin: '0 0 12px 0',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                wordBreak: 'break-word'
              },
              '& img': {
                maxWidth: '100%',
                height: 'auto',
                borderRadius: '8px',
                margin: '12px 0'
              },
              '& strong': {
                fontWeight: 600
              },
              '& em': {
                fontStyle: 'italic'
              },
              '& u': {
                textDecoration: 'underline'
              },
              '& a': {
                color: '#3b82f6',
                textDecoration: 'underline'
              },
              '& ul, & ol': {
                paddingLeft: '1.5rem',
                marginBottom: '12px'
              },
              '& li': {
                marginBottom: '4px'
              },
              '& h1, & h2, & h3': {
                fontWeight: 600,
                marginBottom: '12px'
              },
              '& h1': {
                fontSize: '1.875rem'
              },
              '& h2': {
                fontSize: '1.5rem'
              },
              '& h3': {
                fontSize: '1.25rem'
              }
            }}
          />
        );
      }

      // If all parsing fails, treat as regular text
      // Failed to parse content as JSON
      // Content:
      return (
        <Typography
          variant='body2'
          className='text-gray-800 mb-3'
          sx={{
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        >
          {content}
        </Typography>
      );
    }

    // If it's an array, render ordered content
    if (Array.isArray(orderedContent)) {
      return (
        <Box className='space-y-3 mb-3'>
          {orderedContent.map((item, index) => (
            <Box key={item.id || index}>
              {item.type === 'text' && (
                <Typography
                  variant='body2'
                  className='text-gray-800'
                  sx={{
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {item.content}
                </Typography>
              )}

              {item.type === 'meeting' && (
                <Box className='bg-gray-400 rounded-lg px-3 py-2 flex items-center justify-between'>
                  <Box className='flex items-center'>
                    <Avatar className='w-8 h-8 bg-gray-600 mr-2' />
                    <Box className="h-8 bg-white mr-2" sx={{ width: '1px' }} />
                    <Typography variant='body2' className='text-white font-medium'>{item.meeting.name}</Typography>
                  </Box>
                </Box>
              )}

              {item.type === 'image' && (
                <Box className='relative overflow-hidden rounded-lg bg-gray-200' sx={{ height: 200 }}>
                  <Image
                    src={item.url}
                    alt="Post image"
                    fill
                    sizes='(max-width: 768px) 100vw, 600px'
                    style={{ objectFit: 'cover' }}
                  />
                </Box>
              )}

              {item.type === 'file' && (
                <Box className='flex items-center bg-gray-400 text-white rounded-lg px-3 py-2 w-full max-w-md'>
                  <i className='ri-folder-2-line mr-2' />
                  <Box className="h-8 bg-white mr-2" sx={{ width: '1px' }} />
                  <span className='flex-1 truncate'>{item.name}</span>
                  <IconButton
                    className='ml-2 p-1'
                    onClick={() => {
                      // TODO: Implement file download from server
                      // For now, show alert that download is not yet implemented
                      alert(`다운로드 기능이 곧 추가될 예정입니다: ${item.name}`);
                    }}
                    title={`${item.name} 다운로드`}
                  >
                    <i className='ri-download-line text-white text-xl' />
                  </IconButton>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      );
    }

    // Fallback to regular text
    return (
      <Typography
        variant='body2'
        className='text-gray-800 mb-3'
        sx={{
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
      >
        {content}
      </Typography>
    );
  }

  // Enrich data with like status from global state
  const enrichDataWithLikes = React.useCallback((data: any) => {
    if (!data) return data

    const enrichComments = (comments: any[]): any[] =>
      comments.map(comment => {
        // Check if Redux has already updated this comment's like status
        const isLiked = comment.isLiked !== undefined ? comment.isLiked : likedComments.includes(comment.id)
        // Use the like count from Redux if available, otherwise fall back to original data
        const likeCount = comment.likeCount !== undefined ? comment.likeCount : (comment.likes?.length || 0)

        return {
          ...comment,
          isLiked,
          likeCount,
          replies: comment.replies ? enrichComments(comment.replies) : []
        }
      })

    const enrichPosts = (posts: any[]): any[] =>
      posts.map(post => {
        // Check if Redux has already updated this post's like status
        const isLiked = post.isLiked !== undefined ? post.isLiked : likedPosts.includes(post.id)
        // Use the like count from Redux if available, otherwise fall back to original data
        const likeCount = post.likeCount !== undefined ? post.likeCount : (post.likes?.length || 0)

        return {
          ...post,
          isLiked,
          likeCount,
          comments: post.comments ? enrichComments(post.comments) : []
        }
      })

    // Return new object instead of mutating the original
    return {
      ...data,
      posts: data.posts ? enrichPosts(data.posts) : data.posts,
      replies: data.replies ? enrichPosts(data.replies) : data.replies,
      tagged: data.tagged ? enrichPosts(data.tagged) : data.tagged
    }
  }, [likedPosts, likedComments])

  // Memoized enriched feed data
  const enrichedFeedData = React.useMemo(() => {
    const enriched = enrichDataWithLikes(feedData)
    return enriched
  }, [feedData, enrichDataWithLikes, likedPosts, likedComments])

  // Fetch follow status for post authors in replies tab
  React.useEffect(() => {
    const fetchRepliesFollowStatus = async () => {
      if (!enrichedFeedData?.replies || !authUserId || feedTab !== 1) return

      // Get all unique user IDs from replies
      const userIdsToCheck = new Set<number>()
      enrichedFeedData.replies.forEach((item: any) => {
        if (item.user?.id && item.user.id !== authUserId) {
          userIdsToCheck.add(item.user.id)
        }
      })

      if (userIdsToCheck.size === 0) return

      // Check current map and only fetch for users we don't have
      setFollowStatusMap((currentMap) => {
        const usersToFetch = Array.from(userIdsToCheck).filter(
          (userId) => currentMap[userId] === undefined
        )

        if (usersToFetch.length === 0) return currentMap

        // Fetch follow status for users we don't have yet
        const fetchPromises = usersToFetch.map(async (userId) => {
          try {
            const status = await userApi.getFollowStatus(userId)
            return { userId, status: status || false }
          } catch (error) {
            return { userId, status: false }
          }
        })

        Promise.all(fetchPromises).then((results) => {
          const newStatusMap: Record<number, boolean> = {}
          results.forEach(({ userId, status }) => {
            newStatusMap[userId] = status
          })

          if (Object.keys(newStatusMap).length > 0) {
            setFollowStatusMap((prev) => ({ ...prev, ...newStatusMap }))
          }
        })

        return currentMap
      })
    }

    fetchRepliesFollowStatus()
  }, [enrichedFeedData?.replies, authUserId, feedTab])

  // Debug: print replies tab data in console when active
  React.useEffect(() => {
    try {
      if (!enrichedFeedData) return
      if (reduxActiveTab === 'replies') {
        // eslint-disable-next-line no-console
        // Replies tab items
        // Debug comment user data
        if (Array.isArray((enrichedFeedData as any).replies)) {
          (enrichedFeedData as any).replies.forEach((item: any, index: number) => {
            // Debug comment user data
          })
        }
      }
    } catch { }
  }, [reduxActiveTab, enrichedFeedData])


  // Add comment function - now uses Redux action
  const addComment = async (postId: number, content: string, parentCommentId?: number) => {
    // Commenting is currently disabled in this view; refresh feed to reflect latest
    loadFeed(feedTab === 0 ? 'posts' : feedTab === 1 ? 'replies' : 'tagged')
  };

  // Add reply to comment function
  const addReplyToComment = async (postId: number, commentId: number, content: string) => {
    try {
      const trimmed = (content || '').trim()
      if (!trimmed) return
      // Optimistic UI: add a local reply immediately
      const optimisticReply = {
        id: Math.random(),
        postId,
        userId: user?.id, // Use current authenticated user, not profile owner
        content: trimmed,
        createdAt: getCurrentTimestamp(),
        user: user, // Use current authenticated user, not profile owner
        likes: [],
        likeCount: 0,
        isLiked: false,
        parentCommentId: commentId,
        __optimistic: true
      }
      setOptimisticRepliesByPostId(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), optimisticReply]
      }))

      // Fire API to persist and reconcile optimistic with real comment
      const resp = await FeedApiService.addComment({ postId, content: trimmed, parentCommentId: commentId }) as any
      const serverComment = resp?.data?.comment
      if (serverComment && serverComment.postId === postId) {
        setOptimisticRepliesByPostId(prev => {
          const list = prev[postId] || []
          // Replace the last optimistic entry for this parent with real one
          const next = [...list]
          const idx = next.findIndex((r: any) => r.parentCommentId === commentId && r.__optimistic)
          const normalized = {
            ...serverComment,
            isLiked: Boolean(pendingLikeByParentId[commentId]) || false,
            likeCount: (serverComment.likes?.length || 0) + (pendingLikeByParentId[commentId] ? 1 : 0),
            likes: serverComment.likes || []
          }
          if (idx >= 0) {
            next[idx] = normalized
          } else {
            next.push(normalized)
          }
          return { ...prev, [postId]: next }
        })

        // If user tried to like before real ID existed, send like now
        if (pendingLikeByParentId[commentId]) {
          setPendingLikeByParentId(prev => ({ ...prev, [commentId]: false }))
          try {
            await handleLikeComment(serverComment.id)
          } catch { }
        }
      }

      // Clear input and collapse reply box
      clearThreadedReply(commentId)
      setReplyingTo(null)
    } catch (e) {
      // Fallback: keep UI stable; optionally show toast if available
    }
  };

  // Note: handleDeleteComment and handleEditComment are now provided by useMyPageActions hook
  // They follow the Redux pattern instead of direct fetch calls

  // Toggle comment expansion
  const toggleCommentExpansion = (commentId: number) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };



  // Get current community badge (highest earned one) - this is the ACTIVE badge to show beside profile
  const currentCommunityBadge = getActiveCommunityBadge((badgesData as any) || null);



  // Remove hardcoded slides - we'll use dynamic data from summaryData.activities



  // Swipe support

  const touchStartXRef = React.useRef<number | null>(null)
  const touchDeltaXRef = React.useRef(0)
  const isDraggingRef = React.useRef(false)

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.cancelable) e.preventDefault();
    touchStartXRef.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.cancelable) e.preventDefault();
    if (touchStartXRef.current === null) return;
    touchDeltaXRef.current = e.touches[0].clientX - touchStartXRef.current;
  };

  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.cancelable) e.preventDefault();
    const delta = touchDeltaXRef.current
    const threshold = 50
    const maxSlides = summaryData?.data?.notifications?.length || 0

    if (Math.abs(delta) > threshold && maxSlides > 1) {
      if (delta < 0 && currentSlide < maxSlides - 1) {
        setCurrentSlide(currentSlide + 1)
      } else if (delta > 0 && currentSlide > 0) {
        setCurrentSlide(currentSlide - 1)
      }
    }

    touchStartXRef.current = null
    touchDeltaXRef.current = 0
  }

  // Mouse drag support for desktop
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    isDraggingRef.current = true
    touchStartXRef.current = e.clientX
  }

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || touchStartXRef.current === null) return
    e.preventDefault()
    touchDeltaXRef.current = e.clientX - touchStartXRef.current
  }

  const onMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    e.preventDefault()

    const delta = touchDeltaXRef.current
    const threshold = 50
    const maxSlides = summaryData?.data?.notifications?.length || 0

    if (Math.abs(delta) > threshold && maxSlides > 1) {
      if (delta < 0 && currentSlide < maxSlides - 1) {
        setCurrentSlide(currentSlide + 1)
      } else if (delta > 0 && currentSlide > 0) {
        setCurrentSlide(currentSlide - 1)
      }
    }

    isDraggingRef.current = false
    touchStartXRef.current = null
    touchDeltaXRef.current = 0
  }

  const onMouseLeave = () => {
    isDraggingRef.current = false
    touchStartXRef.current = null
    touchDeltaXRef.current = 0
  }



  const recalcUnderline = React.useCallback(() => {

    const el = tabRefs.current[activeTab]

    const container = tabContainerRef.current

    if (!el || !container) return

    const rect = el.getBoundingClientRect()

    const crect = container.getBoundingClientRect()

    setUnderline({ left: rect.left - crect.left, width: rect.width })

  }, [activeTab])



  React.useEffect(() => {

    recalcUnderline()

    window.addEventListener('resize', recalcUnderline)

    return () => window.removeEventListener('resize', recalcUnderline)

  }, [recalcUnderline])


  // Share function
  const handleShare = (postId: number, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent post navigation
    const url = `${window.location.origin}/post/${postId}`
    setShareUrl(url)
    setShareModalOpen(true)
  }

  // Copy to clipboard function
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        document.execCommand('copy')
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      } catch (fallbackErr) {
        // Failed to copy text
      }
      if (textArea.parentNode) {
        document.body.removeChild(textArea)
      }
    }
  }


  // Reset current slide when summary data changes and ensure it doesn't exceed available slides

  React.useEffect(() => {

    if (summaryData?.activities) {

      setCurrentSlide(0)

    }

  }, [summaryData?.activities])


  // Initialize like states when feed data loads
  // React.useEffect(() => {
  //   if (!feedData) return
  //   
  //   try {
  //     const items = feedData.items || []
  //     if (!Array.isArray(items)) return
  //     
  //     const initialLikedPosts = new Set<number>()
  //     const initialLikeCounts: Record<number, number> = {}
  //     
  //     items.forEach((item: any) => {
  //       if (item && item.id) {
  //         if (item.likes?.length > 0) {
  //           initialLikeCounts[item.id] = item.likes.length
  //           // Check if current user has liked this post
  //           const currentUserId = 1 // You might need to get this from auth state
  //           const userLiked = item.likes.some((like: any) => like.userId === currentUserId)
  //           if (userLiked) {
  //             initialLikedPosts.add(item.id)
  //           }
  //         } else {
  //           initialLikeCounts[item.id] = 0
  //         }
  //       }
  //     })
  //     
  //     setLikedPosts(initialLikedPosts)
  //     setPostLikeCounts(initialLikeCounts)
  //   } catch (error) {
  //     // Error initializing like states
  //   }
  // }, [feedData])


  // Ensure currentSlide doesn't exceed available slides

  React.useEffect(() => {

    const maxSlides = summaryData?.activities?.length || 0

    if (currentSlide >= maxSlides && maxSlides > 0) {

      setCurrentSlide(0)

    }

  }, [currentSlide, summaryData?.activities?.length])



  // Hide footer navbar while the followers/following overlay is open

  React.useEffect(() => {

    try {

      window.dispatchEvent(new CustomEvent('footer-visibility', { detail: { hidden: isFollowOpen } }))

    } catch { }

    return () => {

      try { window.dispatchEvent(new CustomEvent('footer-visibility', { detail: { hidden: false } })) } catch { }

    }

  }, [isFollowOpen])



  const getFloatingButtonConfig = () => {
    // Don't show floating buttons when viewing someone else's profile
    if (!isOwnProfile) {
      return {
        show: false,
        label: '',
        url: ''
      }
    }

    switch (activeTab) {
      case 0: // 요약
        return {
          show: false,
          label: '',
          url: ''
        }
      case 1: // 피드
        return {
          show: true,
          label: '피드 작성하기',
          url: '/feed/create'
        }
      case 2: // 모임
        return {
          show: true,
          label: '모임 개설하기',
          url: '/meeting/add-meeting'
        }
      case 3: // 배지
        return {
          show: false,
          label: '',
          url: ''
        }
      default:
        return {
          show: false,
          label: '',
          url: ''
        }
    }
  }

  const floatingButtonConfig = getFloatingButtonConfig()




  // Show loading state while checking authentication
  if (!authChecked) {
    return <LoadingSpinner fullScreen />
  }

  // Show loading state only for initial load, not for switching
  if (profileLoading || summaryLoading || !profileData) {
    return <LoadingSpinner message="Loading profile..." fullScreen />
  }

  // Additional check: if we have URL userId but profile data is for different user, show loading
  const uid = searchParams?.get('userId')
  if (uid) {
    const parsedUserId = parseInt(uid, 10)
    const profileUserId = (profileData as any)?.data?.user?.id
    if (!isNaN(parsedUserId) && profileUserId && parseInt(profileUserId) !== parsedUserId) {
      return <LoadingSpinner message="Loading profile..." fullScreen />
    }
  }

  // Force re-render when switching users by using a key
  const profileKey = `${profileUserId}-${isOwnProfile ? 'own' : 'other'}`

  return (
    <ErrorBoundary>
      <Box key={profileKey} className='min-h-screen bg-white pb-28 md:pb-8'>

        {/* Fixed Header */}

        <Box className='fixed top-0 left-0 right-0 bg-white z-20 border-b border-gray-200'>

          <Box className='flex items-center justify-between px-2 py-3'>

            <Box className='flex items-center'>

              <IconButton onClick={() => router.back()} className='mr-1 p-0'>

                <i className='ri-arrow-left-s-line' style={{ fontSize: '30px' }} />

              </IconButton>

            </Box>

            {/* Only show action buttons for own profile */}
            {isOwnProfile && (
              <Box className='flex items-center space-x-2'>

                <Tooltip title='add club'>

                  <IconButton onClick={() => navigate('/meeting/add-meeting')}>

                    <i className='ri-add-line text-xl text-gray-500' />

                  </IconButton>

                </Tooltip>

                <IconButton>

                  <i className='ri-share-forward-line text-xl text-gray-400' />

                </IconButton>

                <IconButton onClick={() => navigate('/Mypage/settings')}>

                  <i className='ri-more-2-fill text-xl text-gray-400' />

                </IconButton>

              </Box>
            )}

          </Box>

        </Box>



        {/* Content */}

        <Box className='pt-20'>

          <Box className='px-4'>

            {/* Profile Row */}

            <Box className='flex items-center justify-between'>

              <Box className='flex items-center'>

                <Box className='relative'>
                  <Avatar

                    className='w-12 h-12 bg-gray-200 mr-3'
                    src={profileData?.data?.user?.profileImage || undefined}

                  >

                    {profileData?.data?.user?.nickname?.charAt(0) || ''}

                  </Avatar>
                </Box>

                <Box>

                  <Box className='flex items-center gap-2'>

                    <Typography variant='h6' className='text-black'>

                      {profileData?.data?.user?.nickname || ''}
                    </Typography>

                    {/* Active Community Rating Badge */}
                    {profileBadgeDisplay && (
                      <Tooltip
                        title={`커뮤니티 등급: ${profileBadgeDisplay.label}`}
                        arrow
                        placement="top"
                      >
                        <Box className='ml-1'>
                          <img
                            src={profileBadgeDisplay.image}
                            alt={profileBadgeDisplay.label}
                            className='w-5 h-5 object-contain'
                          />
                        </Box>
                      </Tooltip>
                    )}

                    {/* Follow Button - Only show when viewing someone else's profile */}

                  </Box>

                </Box>

              </Box>


              {/* Chat Icon - Visible to other users only */}

            </Box>



            <Typography variant='body2' className='text-gray-800 mt-3'>

              {profileData?.data?.user?.statusMessage || profileData?.data?.profile?.description || ''}
            </Typography>



            {/* Stats */}

            <Box className='flex items-center flex-wrap gap-2.5 my-3'>

              <Typography

                variant='caption'

                className='text-gray-700 cursor-pointer'

                onClick={() => { setIsFollowOpen(true); setFollowTab(0) }}

              >

                <span className='font-semibold text-black'>

                  {formatNumber(profileData?.data?.stats?.followersCount || 0)}
                </span> 팔로워

              </Typography>

              <Typography

                variant='caption'

                className='text-gray-700 cursor-pointer'

                onClick={() => { setIsFollowOpen(true); setFollowTab(1) }}

              >

                <span className='font-semibold text-black'>

                  {profileData?.data?.stats?.followingCount || '0'}
                </span> 팔로잉

              </Typography>

              <Typography variant='caption' className='text-gray-700'>

                <span className='font-semibold text-black'>

                  {profileData?.data?.stats?.meetingsCreatedCount || '0'}
                </span> 모임 개설

              </Typography>

              <Typography variant='caption' className='text-gray-700'>

                <span className='font-semibold text-black'>

                  {profileData?.data?.stats?.meetingsJoinedCount || '0'}
                </span> 모임 참여

              </Typography>

            </Box>

            <Box className='flex gap-3 '>
              {!isOwnProfile && profileUserId && (
                <FollowButton
                  userId={profileUserId}
                  userNickname={profileData?.data?.user?.nickname || ''}
                  isFollowing={followStatusMap[profileUserId] !== undefined ? followStatusMap[profileUserId] : profileFollowStatus}
                  onFollowChange={(isFollowing, counts) => {
                    setProfileFollowStatus(isFollowing)
                    setFollowStatusMap(prev => ({ ...prev, [profileUserId]: isFollowing }))
                    // Update profile stats if counts are provided
                    if (counts && profileData?.data?.stats) {
                      // Stats will be updated on next profile load
                    }
                  }}
                  size='small'
                />
              )}

              {!isOwnProfile && (
                <Button
                  onClick={async () => {
                    try {
                      const targetUserId = profileUserId
                      if (!targetUserId || !authUserId) return

                      // Call API to create/find individual chat
                      const response = await fetch('/api/chat/rooms/create-individual', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ otherUserId: targetUserId })
                      })

                      const result = await response.json()

                      if (result.success && result.room) {
                        // Navigate to chat with the room
                        navigate(`/chat?roomId=${result.room.id}&type=user`)
                      } else {
                        console.error('Failed to create chat:', result.error)
                        // You could show a toast notification here
                      }
                    } catch (error) {
                      console.error('Error creating chat:', error)
                    }
                  }}
                  className='p-2 bg-gray-100 text-gray-600 w-full'
                  sx={{
                    borderRadius: '10px'
                  }}
                >
                  메시지
                </Button>
              )}
            </Box>


            {/* Main Tabs */}

            <Box ref={tabContainerRef} className='mt-3 border-b border-gray-200 px-0 relative'>

              <Box className='flex items-center gap-6 px-4'>

                {(isOwnProfile ? ['요약', '피드', '모임', '배지'] : ['피드', '모임', '배지']).map((label, idx) => {
                  // Adjust index for other users (skip 요약 tab)
                  const actualIdx = isOwnProfile ? idx : idx + 1
                  const tabType = actualIdx === 1 ? 'feed' : actualIdx === 2 ? 'meetings' : actualIdx === 3 ? 'badges' : null
                  const isTabPrivate = tabType === 'feed' ? !feedPrivacy :
                    tabType === 'meetings' ? !meetingsPrivacy :
                      tabType === 'badges' ? !badgesPrivacy : false
                  const isTabPrivateForViewer = isTabPrivate && !isOwnProfile

                  return (
                    <Box key={label}>
                      <Box
                        ref={(el: HTMLDivElement | null) => { tabRefs.current[actualIdx] = el }}
                        className={`py-2 cursor-pointer ${activeTab === actualIdx ? 'text-black font-semibold' : 'text-gray-500'}`}
                        onClick={() => handleTabChange(actualIdx)}
                      >
                        {label}
                      </Box>
                    </Box>
                  )
                })}

              </Box>

              <Box className='absolute bottom-0 h-0.5 bg-black' style={{ left: underline.left, width: underline.width }} />

            </Box>

          </Box>



          {/* Summary card area (adjusted to match reference) */}

          {activeTab === 0 && (

            <Box className='px-4 mt-3'>

              {isPrivateForViewer ? (
                <Box className='py-10 flex flex-col items-center'>
                  <Box className='w-24 h-24 mb-3'>
                    <img src='/images/custom/profile-lock.png' alt='잠금' className='w-full h-full object-contain' />
                  </Box>
                  <Typography variant='body2' className='text-gray-700'>활동 내역을 보려면</Typography>
                  <Typography variant='body2' className='text-gray-700'>내 정보도 공유해주세요</Typography>
                </Box>
              ) : summaryLoading ? (

                <Box className='flex justify-center py-8'>

                  <CircularProgress />

                </Box>

              ) : summaryError ? (

                <Box className='flex justify-center py-8'>

                  <Typography variant='body2' className='text-red-500'>Error loading summary data</Typography>

                </Box>

              ) : summaryData && (summaryData.data?.notifications || summaryData.data?.mainBadge) ? (

                <>

                  {/* Notifications Slider Only */}

                  <Box className='mt-4'>

                    <Box
                      className='overflow-hidden rounded-xl cursor-grab active:cursor-grabbing'
                      onTouchStart={onTouchStart}
                      onTouchMove={onTouchMove}
                      onTouchEnd={onTouchEnd}
                      onMouseDown={onMouseDown}
                      onMouseMove={onMouseMove}
                      onMouseUp={onMouseUp}
                      onMouseLeave={onMouseLeave}
                    >

                      <Box
                        className='flex transition-transform duration-500'
                        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                      >

                        {/* Notification Cards */}

                        {summaryData.data?.notifications && summaryData.data.notifications.length > 0 ? summaryData.data.notifications.map((notification: any, idx: number) => (

                          <Box key={`notification-${notification.id}`} className='w-full shrink-0 px-3'>

                            <Box

                              className='rounded-xl border border-gray-200 p-5 flex items-start gap-4 outline-none transition-all duration-200 hover:shadow-md hover:border-gray-300 bg-white h-32'

                            >

                              {/* Profile Icon */}

                              <Box className='w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100'>

                                <span className='text-2xl'>{notification.icon || '🔔'}</span>

                              </Box>



                              {/* Content */}

                              <Box className='flex-1 min-w-0 flex flex-col justify-center gap-2'>

                                {/* Congratulations for positive notifications */}

                                {['badge_earned', 'level_up', 'first_meeting_created', 'first_meeting_joined', 'meeting_participants_milestone', 'post_likes_milestone', 'followers_milestone', 'meetings_created_milestone', 'consecutive_participation'].includes(notification.notificationType) && (

                                  <Typography

                                    variant='caption'

                                    className='text-green-600 font-semibold text-xs'

                                  >

                                    🎉 축하합니다!

                                  </Typography>

                                )}



                                {/* Main Message */}

                                <Typography

                                  variant='body2'

                                  className='text-sm leading-relaxed text-gray-900 font-medium'

                                  style={{

                                    display: '-webkit-box',

                                    WebkitLineClamp: 2,

                                    WebkitBoxOrient: 'vertical',

                                    overflow: 'hidden',

                                    wordBreak: 'keep-all'

                                  }}

                                >

                                  {notification.notificationDetails}

                                </Typography>

                                {/* Time and View Button Row */}

                                <Box className='flex items-center justify-between mt-1'>

                                  <Typography
                                    variant='caption'
                                    className='text-gray-500 text-xs'
                                  >
                                    {formatDateTime(notification.createdAt)}
                                  </Typography>

                                  {/* View Button for post/meeting related notifications */}
                                  {/* 
                                  {(notification.relatedType === 'post' || notification.relatedType === 'meeting') && notification.actionUrl && (

                                    <Button

                                      variant='outlined'

                                      size='small'

                                      onClick={(e) => {

                                        e.stopPropagation();

                                        navigate(notification.actionUrl);

                                      }}

                                      className='text-xs px-3 py-1 h-7 border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50'

                                    >

                                      보기

                                    </Button>

                                  )} */}

                                </Box>

                              </Box>

                            </Box>

                          </Box>

                        )) : (
                          <Box className='w-full shrink-0 px-3 flex items-center justify-center'>
                            <Box className='text-center py-8'>
                              <Typography variant='body2' className='text-gray-500'>
                                알림이 없습니다
                              </Typography>
                            </Box>
                          </Box>
                        )}

                      </Box>

                    </Box>

                    <Box className='flex items-center justify-center gap-1 mt-2'>

                      {Array.from({ length: summaryData.data?.notifications?.length || 0 }).map((_: any, idx: number) => (

                        <button

                          key={idx}

                          aria-label={`Go to slide ${idx + 1}`}

                          onClick={() => setCurrentSlide(idx)}

                          className={`h-2 rounded-full transition-all ${idx === currentSlide ? 'bg-gray-800 w-2' : 'bg-gray-300 w-2'}`}

                        />

                      ))}

                    </Box>

                  </Box>





                  {/* Dynamic badge highlight card */}

                  {profileBadgeDisplay && (
                    <Box className='mt-5 rounded-[35px] bg-gray-300 p-5'>
                      <Box className='flex flex-col items-center text-center'>
                        {profileBadgeDisplay.label && (
                          <Typography variant='caption' className='text-gray-400 font-semibold uppercase tracking-wide'>
                            {profileBadgeDisplay.label}
                          </Typography>
                        )}
                        <Box className='relative w-24 h-28 mt-3'>
                          <Image
                            src={profileBadgeDisplay.image}
                            alt={profileBadgeDisplay.label || 'Community rank badge'}
                            fill
                            sizes='112px'
                            style={{ objectFit: 'contain' }}
                          />
                        </Box>
                        <Typography variant='subtitle1' className='text-black mt-4 font-semibold leading-snug'>
                          {profileBadgeDisplay.headLine}
                        </Typography>
                        {profileBadgeDisplay.description && (
                          <Typography variant='caption' className='text-gray-600 mt-1 text-center leading-relaxed'>
                            {profileBadgeDisplay.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}

                </>

              ) : (

                <Box className='flex flex-col items-center justify-center py-16'>

                  <i className='ri-information-line text-gray-300 text-6xl mb-4' />

                  <Typography variant='h6' className='text-gray-500 mb-2'>요약 데이터가 없습니다</Typography>

                  <Typography variant='body2' className='text-gray-400 text-center max-w-sm'>

                    활동을 시작하면 여기에 요약 정보가 표시됩니다.

                  </Typography>

                </Box>

              )}

            </Box>

          )}

          {activeTab === 3 && (

            <>

              {/* Privacy info bar - always show for account holder, show message only when private for others */}
              {isOwnProfile && (
                <Box className='bg-gray-100 px-3 py-3 flex items-center justify-between'>
                  <Box>
                    <Typography className='text-gray-500 text-[12px]'>
                      {isProfilePublic ? '다른 사람은 내 배지를 볼 수 없어요' : '다른 사람이 내 활동을 볼 수 없어요'}
                    </Typography>
                  </Box>
                  <Button
                    size='small'
                    className='px-0'
                    variant='contained'
                    sx={{ backgroundColor: '#4E5968', color: '#fff', borderRadius: '8px', textTransform: 'none' }}
                    onClick={handlePrivacyToggle}
                  >
                    {isProfilePublic ? '비공개' : '공개'}
                  </Button>
                </Box>
              )}


              <Box className='mt-4 px-4'>

                {isPrivateForViewer ? (
                  <Box className='py-10 flex flex-col items-center'>
                    <Box className='w-24 h-24 mb-3'>
                      <img src='/images/custom/profile-lock.png' alt='잠금' className='w-full h-full object-contain' />
                    </Box>
                    <Typography variant='body2' className='text-gray-700'>배지 내역을 보려면</Typography>
                    <Typography variant='body2' className='text-gray-700'>내 정보도 공유해주세요</Typography>
                  </Box>
                ) : badgesLoading ? (

                  <Box className='flex justify-center py-8'>

                    <CircularProgress />

                  </Box>

                ) : badgesError ? (

                  <Box className='flex justify-center py-8'>

                    <Typography variant='body2' className='text-red-500'>Error loading badges data</Typography>

                  </Box>

                ) : badgesData && (badgesData as any).data && (badgesData as any).data.stats ? (

                  <>

                    {/* 1. Total Badges Section */}

                    <Box className='mb-8'>

                      {/* <Box className='mb-4'>
                        <Typography variant='h6' className='font-bold text-gray-900'>Total Badges</Typography>
                      </Box> */}
                      {/* 
                      <Box className='grid grid-cols-2 gap-8'>

                       

                        {(((badgesData as any).data?.earnedBadges) || []).filter((badge: any) => badge.badgeType === 'regular').map((badge: any) => {

                          const requirements = [];

                          if (badge.condition_meetings) requirements.push(`모임 참여 - ${badge.condition_meetings}회`);

                          if (badge.condition_likes) requirements.push(`게시물 좋아요 - ${badge.condition_likes}개`);

                          if (badge.condition_posts) requirements.push(`게시물 작성 - ${badge.condition_posts}개`);

                          if (badge.condition_followers) requirements.push(`팔로워 - ${badge.condition_followers}명`);



                          const tooltipContent = (

                            <div style={{ textAlign: 'left' }}>

                              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>이 배지를 획득하려면:</div>

                              {requirements.map((req, index) => (

                                <div key={index} style={{ fontSize: '11px', marginBottom: '2px' }}>{req}</div>

                              ))}

                            </div>

                          );



                          return (

                            <Tooltip

                              key={badge.id}

                              title={tooltipContent}

                              arrow

                              placement="top"

                              enterDelay={100}

                              leaveDelay={50}

                              disableHoverListener={false}

                              disableFocusListener={false}

                              disableTouchListener={false}

                              componentsProps={{

                                tooltip: {

                                  sx: {

                                    maxWidth: 250,

                                    fontSize: '12px',

                                    whiteSpace: 'normal',

                                    wordWrap: 'break-word',

                                    '@media (max-width: 768px)': {

                                      fontSize: '11px',

                                      maxWidth: 200,

                                      padding: '8px 12px'

                                    }

                                  }

                                }

                              }}

                            >

                              <Box

                                className='flex flex-col items-center p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 w-full group relative cursor-pointer md:cursor-pointer'

                                sx={{

                                  '@media (max-width: 768px)': {

                                    cursor: 'default'

                                  }

                                }}

                                onClick={() => {

                                

                                  const event = new Event('mouseenter', { bubbles: true });

                                  event.target?.dispatchEvent(event);

                                }}

                              >

                                <Box className='w-16 h-16 mb-2'>

                                  <img

                                    src={badge.imageUrl}

                                    alt={badge.name}

                                    className='w-full h-full object-contain'

                                  />

                                </Box>

                                <Typography variant='caption' className='text-center text-xs font-semibold text-gray-900'>{badge.name}</Typography>

                              </Box>

                            </Tooltip>

                          );

                        })}



                      

                        {(((badgesData as any).data?.unearnedRegularBadges) || []).map((badge: any) => {

                          const requirements = [];

                          if (badge.condition_meetings) requirements.push(`모임 참여 - ${badge.condition_meetings}회`);

                          if (badge.condition_likes) requirements.push(`게시물 좋아요 - ${badge.condition_likes}개`);

                          if (badge.condition_posts) requirements.push(`게시물 작성 - ${badge.condition_posts}개`);

                          if (badge.condition_followers) requirements.push(`팔로워 - ${badge.condition_followers}명`);



                          const tooltipContent = (

                            <div style={{ textAlign: 'left' }}>

                              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>이 배지를 획득하려면:</div>

                              {requirements.map((req, index) => (

                                <div key={index} style={{ fontSize: '11px', marginBottom: '2px' }}>{req}</div>

                              ))}

                            </div>

                          );



                          return (

                            <Tooltip

                              key={badge.id}

                              title={tooltipContent}

                              arrow

                              placement="top"

                              enterDelay={100}

                              leaveDelay={50}

                              disableHoverListener={false}

                              disableFocusListener={false}

                              disableTouchListener={false}

                              componentsProps={{

                                tooltip: {

                                  sx: {

                                    maxWidth: 250,

                                    fontSize: '12px',

                                    whiteSpace: 'normal',

                                    wordWrap: 'break-word',

                                    '@media (max-width: 768px)': {

                                      fontSize: '11px',

                                      maxWidth: 200,

                                      padding: '8px 12px'

                                    }

                                  }

                                }

                              }}

                            >

                              <Box

                                className='flex flex-col items-center p-2 bg-gray-50 border border-gray-200 rounded-lg opacity-60 w-full group relative cursor-pointer md:cursor-pointer'

                                sx={{

                                  '@media (max-width: 768px)': {

                                    cursor: 'default'

                                  }

                                }}

                                onClick={() => {

                                  

                                  const event = new Event('mouseenter', { bubbles: true });

                                  event.target?.dispatchEvent(event);

                                }}

                              >

                                <Box className='w-16 h-16 mb-2'>

                                  <img

                                    src={badge.imageUrl}

                                    alt={badge.name}

                                    className='w-full h-full object-contain grayscale'

                                  />

                                </Box>

                                <Typography variant='caption' className='text-center text-xs font-medium text-gray-500'>{badge.name}</Typography>

                              </Box>

                            </Tooltip>

                          );

                        })}

                      </Box> */}
                    </Box>

                    {/* 2. Community Rating Section */}

                    <Box className='mb-8'>

                      <Box className='mb-4'>

                        <Typography variant='h6' className='font-bold text-gray-900'>Community Rating</Typography>

                      </Box>



                      <Box className='grid grid-cols-2 gap-8'>

                        {/* Show only earned badges sequentially */}
                        {(() => {
                          // Get earned community badges
                          const earnedCommunityBadges = ((badgesData as any)?.data?.earnedBadges || [])
                            .filter((badge: any) => badge.badgeType === 'community_rating')

                          // Get all community badges (earned + unearned) sorted by follower requirement
                          const allCommunityBadges = [
                            ...earnedCommunityBadges,
                            ...((badgesData as any)?.data?.unearnedCommunityBadges || []).filter((badge: any) => badge.badgeType === 'community_rating')
                          ].sort((a: any, b: any) => (a.condition_followers || 0) - (b.condition_followers || 0))

                          // Remove duplicates from all badges
                          const uniqueAllBadges = allCommunityBadges.filter((badge: any, index: number, self: any[]) =>
                            index === self.findIndex((b: any) => resolveBadgeId(b) === resolveBadgeId(badge))
                          )

                          // Get earned badge IDs
                          const earnedBadgeIds = new Set(
                            earnedCommunityBadges.map((badge: any) => resolveBadgeId(badge)).filter((id: any) => id != null)
                          )

                          // If user has an active badge, consider it earned even if not in earnedBadges
                          if (activeCommunityBadgeId != null) {
                            earnedBadgeIds.add(activeCommunityBadgeId)
                          }

                          // Find the highest earned/active badge index
                          let highestEarnedIndex = -1
                          uniqueAllBadges.forEach((badge: any, index: number) => {
                            const badgeId = resolveBadgeId(badge)
                            if (badgeId != null && earnedBadgeIds.has(Number(badgeId))) {
                              highestEarnedIndex = index
                            }
                          })

                          // If no badges earned yet, show nothing
                          if (highestEarnedIndex < 0) {
                            return []
                          }

                          // Show all badges up to and including the highest earned/active badge
                          const badgesToShow = uniqueAllBadges.slice(0, highestEarnedIndex + 1).filter((badge: any) => {
                            const badgeId = resolveBadgeId(badge)
                            // Only include if it's earned OR if it's the active badge
                            return badgeId != null && (
                              earnedBadgeIds.has(Number(badgeId)) ||
                              (activeCommunityBadgeId != null && Number(badgeId) === Number(activeCommunityBadgeId))
                            )
                          })

                          return badgesToShow
                        })().map((badge: any) => {
                          const targetId = resolveBadgeId(badge)

                          // All badges shown are earned, so isEarned is always true
                          const isEarned = true

                          // Check if this is the currently active badge (the highest earned badge)
                          const isActiveBadge = activeCommunityBadgeId != null && targetId != null && Number(targetId) === Number(activeCommunityBadgeId)

                          const requirements: string[] = []

                          if (badge.condition_followers) requirements.push(`팔로워 - ${badge.condition_followers}명`)

                          const tooltipContent = (
                            <div style={{ textAlign: 'left' }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>이 커뮤니티 배지를 획득하려면:</div>
                              {requirements.map((req, index) => (
                                <div key={index} style={{ fontSize: '11px', marginBottom: '2px' }}>{req}</div>
                              ))}
                            </div>
                          )

                          const badgeDisplay = getCommunityBadgeDisplay(badge)
                          const displayLabel = badgeDisplay?.label || badge.name
                          const displayImage = badgeDisplay?.image || badge.imageUrl

                          return (
                            <Tooltip
                              key={badge.id}
                              title={tooltipContent}
                              arrow
                              placement="top"
                              enterDelay={100}
                              leaveDelay={50}
                              disableHoverListener={false}
                              disableFocusListener={false}
                              disableTouchListener={false}
                              componentsProps={{
                                tooltip: {
                                  sx: {
                                    maxWidth: 250,
                                    fontSize: '12px',
                                    whiteSpace: 'normal',
                                    wordWrap: 'break-word',
                                    '@media (max-width: 768px)': {
                                      fontSize: '11px',
                                      maxWidth: 200,
                                      padding: '8px 12px'
                                    }
                                  }
                                }
                              }}
                            >
                              <Box
                                className='flex flex-col items-center p-2 border rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 w-full group relative cursor-pointer md:cursor-pointer bg-white border-gray-200'
                                sx={{
                                  '@media (max-width: 768px)': {
                                    cursor: 'default'
                                  }
                                }}
                                onClick={() => {
                                  const event = new Event('mouseenter', { bubbles: true })
                                  event.target?.dispatchEvent(event)
                                }}
                              >
                                {/* Active badge dot indicator */}
                                {isActiveBadge && (
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      top: '8px',
                                      right: '8px',
                                      width: '10px',
                                      height: '10px',
                                      borderRadius: '50%',
                                      backgroundColor: '#10b981', // green-500
                                      border: '2px solid white',
                                      zIndex: 1,
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }}
                                  />
                                )}

                                <Box className='w-16 h-16 mb-2 relative'>
                                  <img
                                    src={displayImage}
                                    alt={displayLabel}
                                    className='w-full h-full object-contain'
                                  />
                                </Box>

                                <Typography
                                  variant='caption'
                                  className='text-center text-xs font-semibold text-gray-900'
                                >
                                  {displayLabel}
                                </Typography>
                              </Box>
                            </Tooltip>
                          )
                        })}

                      </Box>

                    </Box>
                  </>

                ) : (

                  <Box className='flex justify-center py-8'>

                    <Typography variant='body2' className='text-gray-500'>

                      {badgesData ? 'Badges data incomplete' : 'No badges data available'}

                    </Typography>

                  </Box>

                )}

              </Box>

            </>

          )}

          {activeTab === 2 && (

            <>

              {/* Meetings tab privacy info bar */}
              {isOwnProfile && (
                <Box className='bg-gray-100 px-3 py-3 flex items-center justify-between'>
                  <Typography className='text-gray-500 text-[12px]'>
                    {meetingsPrivacy ? '다른 사람은 내 활동을 볼 수 없어요' : '다른 사람이 내 모임을 볼 수 없어요'}
                  </Typography>
                  <Button
                    size='small'
                    className='px-0'
                    variant='contained'
                    sx={{ backgroundColor: '#4E5968', color: '#fff', borderRadius: '8px', textTransform: 'none' }}
                    onClick={handleMeetingsPrivacyToggle}
                  >
                    {meetingsPrivacy ? '비공개' : '공개'}
                  </Button>
                </Box>
              )}


              {!meetingsPrivacy && !isOwnProfile ? (
                <Box className='py-10 flex flex-col items-center'>
                  <Box className='w-24 h-24 mb-3'>
                    <img src='/images/custom/profile-lock.png' alt='잠금' className='w-full h-full object-contain' />
                  </Box>
                  <Typography variant='body2' className='text-gray-700'>모임 내역을 보려면</Typography>
                  <Typography variant='body2' className='text-gray-700'>내 정보도 공유해주세요</Typography>
                </Box>
              ) : (
                <Box className='px-4 mt-3'>

                  {/* Group sub tabs */}

                  <Box className='flex items-center gap-1'>

                    {['전체', '곧 온다', '참여', '개설'].map((label, idx) => (

                      <Button

                        key={label}

                        size='small'

                        onClick={() => setGroupTab(idx)}

                        variant={groupTab === idx ? 'contained' : 'text'}

                        disableRipple

                        disableFocusRipple

                        sx={{

                          backgroundColor: groupTab === idx ? '#f3f4f6' : 'transparent',

                          color: groupTab === idx ? '#000' : '#6b7280',

                          borderColor: '#e5e7eb',

                          borderRadius: '5',

                          textTransform: 'none',

                          px: 0.5,

                          py: 0.25,

                          '&:hover': {

                            backgroundColor: groupTab === idx ? '#f3f4f6' : 'transparent',

                          },

                          '&:focus': {

                            backgroundColor: groupTab === idx ? '#f3f4f6' : 'transparent',

                            outline: 'none',

                          },

                          '&:active': {

                            backgroundColor: groupTab === idx ? '#f3f4f6' : 'transparent',

                          }

                        }}

                      >

                        {label}

                      </Button>

                    ))}

                  </Box>



                  {meetingsLoading ? (

                    <Box className='flex justify-center py-8'>

                      <CircularProgress />

                    </Box>

                  ) : meetingsError ? (

                    <Box className='flex justify-center py-8'>

                      <Typography variant='body2' className='text-red-500'>Error loading meetings data</Typography>

                    </Box>

                  ) : getCurrentMeetings().length > 0 ? (

                    <>

                      {/* Dynamic meetings display */}

                      <Typography variant='body1' className='mt-4 mb-2 font-semibold text-black'>

                        {groupTab === 0 ? '내 모임 활동' : groupTab === 1 ? '곧 다가오는 모임' : groupTab === 2 ? '내가 참여했던 모임' : '내가 개설했던 모임'}

                      </Typography>



                      {/* Vertical list for all tabs */}

                      <Box className='space-y-4 mt-4'>

                        {getCurrentMeetings().map((meeting: any, index: number) => {
                          if (!meeting) return null;

                          // For upcoming tab (groupTab === 1), map database fields to display fields
                          // Other tabs use transformed fields (image, title, date, members)
                          const displayImage = groupTab === 1 ? (meeting?.meetingBackground || meeting?.image) : (meeting?.image || meeting?.meetingBackground)
                          const displayTitle = groupTab === 1 ? (meeting?.meetingName || meeting?.title) : (meeting?.title || meeting?.meetingName)
                          const displayParticipants = groupTab === 1
                            ? (meeting?.currentParticipants || meeting?.participants?.length || meeting?.members || 0)
                            : (meeting?.members || meeting?.currentParticipants || meeting?.participants?.length || 0)

                          // Format date/time for upcoming tab (uses meetingTime) vs other tabs (uses date string)
                          const getDisplayTime = () => {
                            if (groupTab === 1) {
                              // Upcoming tab: format from meetingTime
                              if (meeting?.meetingTime) {
                                const meetingTime = meeting.meetingTime instanceof Date
                                  ? meeting.meetingTime
                                  : new Date(meeting.meetingTime)
                                return meetingTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                              }
                              return '시간 미정'
                            } else {
                              // Other tabs: use date string
                              return meeting?.date ? meeting.date.split(' ')[1] || '시간 미정' : '시간 미정'
                            }
                          }

                          const getDisplayDate = () => {
                            if (groupTab === 1) {
                              // Upcoming tab: format from meetingTime
                              if (meeting?.meetingTime) {
                                const meetingTime = meeting.meetingTime instanceof Date
                                  ? meeting.meetingTime
                                  : new Date(meeting.meetingTime)
                                return meetingTime.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                              }
                              return '날짜 미정'
                            } else {
                              // Other tabs: use date string
                              return meeting?.date ? meeting.date.split(' ')[0] || '날짜 미정' : '날짜 미정'
                            }
                          }

                          // Check meeting status - use display status for completed meetings
                          const dbStatus = meeting?.status || 'draft';
                          const meetingStatus = (() => {
                            // If meeting has ended and was approved, show as completed
                            if (dbStatus === 'approved' && meeting?.meetingTime && meeting?.duration) {
                              const now = new Date();
                              // meetingTime might be a string, so convert to Date first
                              const meetingTime = meeting.meetingTime instanceof Date
                                ? meeting.meetingTime
                                : new Date(meeting.meetingTime);
                              const meetingEndTime = new Date(meetingTime.getTime() + meeting.duration * 60 * 1000);
                              if (now > meetingEndTime) {
                                return 'completed';
                              }
                            }
                            return dbStatus;
                          })();
                          const isApproved = meetingStatus === 'approved';

                          return (
                            <Box key={meeting?.id || `meeting-${index}`} className='w-full bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200' onClick={() => {
                              if (meeting?.id) {
                                // Check if current user is the meeting owner
                                const isOwner = user && (meeting.userId === user.id || meeting.user?.id === user.id)

                                // Route to appropriate page based on ownership
                                if (isOwner) {
                                  navigate(`/meeting/item-detail-host/${meeting.id}`)
                                } else {
                                  navigate(`/meeting/item-detail/${meeting.id}`)
                                }
                              }
                            }}>

                              {/* Meeting Image */}

                              <Box className='relative h-36'>

                                {displayImage ? (
                                  <img

                                    src={displayImage ?? null}

                                    alt={displayTitle || 'Meeting'}

                                    className='w-full h-full object-cover'

                                  />
                                ) : (
                                  <Box className='w-full h-full bg-gray-300 bg-opacity-50 object-cover' />
                                )}
                              </Box>



                              {/* Meeting Details */}

                              <Box className='p-3'>

                                {/* Meeting Date and Time - Split Layout */}
                                <Box className='flex justify-between items-center mb-1.5'>
                                  {/* End Time - Left Side */}
                                  <Typography
                                    variant='caption'
                                    className='text-gray-500 text-xs'
                                    sx={{
                                      fontFamily: 'inherit',
                                      fontSize: '0.75rem',
                                      lineHeight: 1.2,
                                      '& *': {
                                        fontFamily: 'inherit',
                                        fontSize: 'inherit',
                                        lineHeight: 'inherit'
                                      }
                                    }}
                                  >
                                    {getDisplayTime()}
                                  </Typography>

                                  {/* Date - Right Side */}
                                  <Typography
                                    variant='caption'
                                    className='text-gray-500 text-xs'
                                    sx={{
                                      fontFamily: 'inherit',
                                      fontSize: '0.75rem',
                                      lineHeight: 1.2,
                                      '& *': {
                                        fontFamily: 'inherit',
                                        fontSize: 'inherit',
                                        lineHeight: 'inherit'
                                      }
                                    }}
                                  >
                                    {getDisplayDate()}
                                  </Typography>
                                </Box>



                                {/* Meeting Name */}

                                <Typography

                                  variant='body1'

                                  className='text-gray-900 font-semibold mb-2 leading-tight text-sm'
                                  title={displayTitle || '모임명 없음'}

                                  style={{

                                    display: '-webkit-box',

                                    WebkitLineClamp: 2,

                                    WebkitBoxOrient: 'vertical',

                                    overflow: 'hidden',

                                    wordBreak: 'keep-all'

                                  }}

                                >

                                  {displayTitle || '모임명 없음'}

                                </Typography>



                                {/* Participants Count and Status Badge */}

                                <Box className='flex items-center justify-between'>

                                  <Typography variant='caption' className='text-blue-600 font-medium text-xs'>

                                    {displayParticipants}명

                                  </Typography>

                                  <Box className='flex items-center gap-2'>
                                    {/* Status Badge */}
                                    {meetingStatus === 'pending' && (
                                      <Box className='px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700'>
                                        심사 중
                                      </Box>
                                    )}
                                    {meetingStatus === 'draft' && (
                                      <Box className='px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700'>
                                        초안
                                      </Box>
                                    )}
                                    {meetingStatus === 'approved' && (
                                      <Box className='px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700'>
                                        승인됨
                                      </Box>
                                    )}
                                    {meetingStatus === 'completed' && (
                                      <Box className='px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700'>
                                        완료됨
                                      </Box>
                                    )}
                                    {meetingStatus === 'reject' && (
                                      <Box className='px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700'>
                                        거부됨
                                      </Box>
                                    )}

                                    {/* Meeting Type Badge */}
                                    <Box className={`px-2 py-0.5 rounded-full text-xs font-medium ${groupTab === 1
                                      ? 'bg-blue-100 text-blue-700'
                                      : groupTab === 2
                                        ? 'bg-green-100 text-green-700'
                                        : groupTab === 3
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-gray-100 text-gray-700'
                                      }`}>

                                      {groupTab === 1 ? '곧 온다' : groupTab === 2 ? '참여' : groupTab === 3 ? '개설' : '관련'}

                                    </Box>
                                  </Box>

                                </Box>

                              </Box>

                            </Box>

                          );
                        })}

                      </Box>

                    </>

                  ) : (

                    <Box className='flex justify-center py-8'>

                      <Typography variant='body2' className='text-gray-500'>

                        {groupTab === 0 ? '모임 활동이 없습니다' : groupTab === 1 ? '곧 다가오는 모임이 없습니다' : groupTab === 2 ? '참여한 모임이 없습니다' : '개설한 모임이 없습니다'}

                      </Typography>

                    </Box>

                  )}

                </Box>

              )}

            </>

          )}

          {activeTab === 1 && (

            <>

              {/* Feed tab privacy info bar */}
              {isOwnProfile && (
                <Box className='bg-gray-100 px-3 py-3 flex items-center justify-between'>
                  <Typography className='text-gray-500 text-[12px]'>
                    {feedPrivacy ? '다른 사람은 내 피드를 볼 수 없어요' : '다른 사람이 내 배지를 볼 수 없어요'}
                  </Typography>
                  <Button
                    size='small'
                    className='px-0'
                    variant='contained'
                    sx={{ backgroundColor: '#4E5968', color: '#fff', borderRadius: '8px', textTransform: 'none' }}
                    onClick={handleFeedPrivacyToggle}
                  >
                    {feedPrivacy ? '비공개' : '공개'}
                  </Button>
                </Box>
              )}


              {!feedPrivacy && !isOwnProfile ? (
                <Box className='py-10 flex flex-col items-center'>
                  <Box className='w-24 h-24 mb-3'>
                    <img src='/images/custom/profile-lock.png' alt='잠금' className='w-full h-full object-contain' />
                  </Box>
                  <Typography variant='body2' className='text-gray-700'>피드를 보려면</Typography>
                  <Typography variant='body2' className='text-gray-700'>내 정보도 공유해주세요</Typography>
                </Box>
              ) : (
                <Box className='px-4 mt-3'>

                  {/* Sub tabs */}

                  <Box className='mt-3 flex items-center gap-2'>

                    {feedTabs.map((label, idx) => (

                      <Button

                        key={label}

                        size='small'

                        onClick={() => {
                          setFeedTab(idx)
                          const tabType = idx === 0 ? 'posts' : idx === 1 ? 'replies' : 'tagged'
                          const uid = searchParams?.get('userId')
                          const parsed = uid ? parseInt(uid, 10) : undefined
                          // Switching feed tab
                          loadFeed(tabType, parsed ?? authUserId ?? undefined)
                        }}

                        variant={feedTab === idx ? 'contained' : 'text'}

                        sx={{

                          backgroundColor: feedTab === idx ? '#f3f4f6' : 'transparent',

                          color: feedTab === idx ? '#000' : '#6b7280',

                          borderColor: '#e5e7eb',

                          borderRadius: '5',

                          textTransform: 'none',

                          px: 1.5,

                          py: 0.25

                        }}

                      >

                        {label}

                      </Button>

                    ))}

                  </Box>



                  {/* Helper row - Only show when there are no posts */}
                  {(!enrichedFeedData || !enrichedFeedData.posts || enrichedFeedData.posts.length === 0) && !feedLoading && !feedError && (
                    <Box className='my-3'>
                      <Box
                        className='flex flex-col items-center border-b border-gray-200 border-t cursor-pointer hover:bg-gray-50 duration-200'
                        onClick={() => setIsHelperExpanded(!isHelperExpanded)}
                        sx={{
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        <Box className="flex items-center justify-between w-full select-none">
                          <Box className='flex items-center gap-2'>

                            <i className='ri-information-fill text-base text-gray-400' />

                            <Typography className='text-gray-500 text-[12px]'>유저가 처음 올리는 공간입니다.</Typography>

                          </Box>

                          <IconButton size='small'>

                            <i
                              className={`ri-arrow-down-s-line text-gray-400 transition-transform duration-300 ${isHelperExpanded ? 'rotate-180' : ''}`}
                            />

                          </IconButton>
                        </Box>

                        <Box
                          className='overflow-hidden transition-all duration-300 ease-in-out select-none'
                          sx={{
                            maxHeight: isHelperExpanded ? '500px' : '0px',
                            opacity: isHelperExpanded ? 1 : 0,
                          }}
                        >
                          <Box className='px-4 py-3 border-b border-gray-300 select-none'>
                            <Typography className='text-gray-600 text-[12px] leading-relaxed whitespace-pre-line'>
                              유저와 크루와의 소통을 하거나, 크루가 참여한 모임의 대한 의견을 표현하기 위해 만들어진 공간입니다. 모든 게시물에 포함된 텍스트 및 영상 및 이미지는 해당 공간을 개설한 이용자가 직접 관리하고 있으며, The noldam 공식 입장과는 무관합니다. The noldamⒸ는 모든 창작자의 자유로운 표현을 존중하지만, 게시물 및 커뮤니티 가이드라인에 따라 제한될 수 있 음을 안내드립니다. 모두가 편안하게 이용할 수 잇도록 배려와 협조 부탁드립니다.
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  )}



                  {/* My Posts Tab - Only show user's own posts */}

                  {feedTab === 0 && (

                    <Box className='mt-3'>

                      {feedLoading ? (

                        <Box className='flex justify-center py-8'>

                          <CircularProgress />

                        </Box>

                      ) : feedError ? (

                        <Box className='flex justify-center py-8'>

                          <Typography variant='body2' className='text-red-500'>Error loading my posts</Typography>

                        </Box>

                      ) : enrichedFeedData && enrichedFeedData.posts && enrichedFeedData.posts.length > 0 ? (

                        [...enrichedFeedData.posts]
                          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map((item: any, index: number) => (
                            <Box

                              key={item.id || index}

                              className='mb-4 bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer'

                              onClick={() => navigate(`/post/${item.id}`)}

                            >

                              {/* User Info - Show POST AUTHOR in header */}
                              <Box className='flex items-center gap-3 mb-3'>
                                <Avatar

                                  className='w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600'
                                  src={item.user?.profileImage || undefined}

                                >

                                  {item.user?.nickname?.charAt(0) || ''}

                                </Avatar>

                                <Box className='flex items-center gap-2'>

                                  <Typography variant='subtitle2' className='text-black font-semibold'>

                                    {item.user?.nickname || 'Unknown User'}

                                  </Typography>

                                  {/* Community Rating Badge - Show POST AUTHOR badge */}
                                  {(() => {
                                    const badgeDisplay = getCommunityBadgeDisplay((item.user as any)?.activeCommunityBadge)
                                    if (!badgeDisplay) return null
                                    return (
                                      <img
                                        src={badgeDisplay.image}
                                        alt={badgeDisplay.label}
                                        className='w-4 h-4 object-contain'
                                        title={`커뮤니티 등급: ${badgeDisplay.label}`}
                                      />
                                    )
                                  })()}


                                  <Typography variant='caption' className='text-gray-400'>

                                    {formatDateTime(item.createdAt)}

                                  </Typography>

                                </Box>

                              </Box>


                              {/* Post Image */}
                              {/* {item.imageUrl && (
                        <Box className='mb-3 relative overflow-hidden rounded-2xl bg-gray-200' sx={{ height: 200 }}>
                          <Image
                            src={item.imageUrl}
                            alt={item.title || 'Post image'}
                            fill
                            sizes='(max-width: 768px) 100vw, 600px'
                            style={{ objectFit: 'cover' }}
                          />
                  </Box>

                      )} */}


                              {/* Title */}
                              {/* {item.title && (

                        <Typography variant='h6' className='text-gray-900 font-semibold mb-2'>

                          {item.title}

                        </Typography>

                      )} */}



                              {/* Description */}
                              {renderOrderedContent(item.content)}



                              {/* Interactive Stats with Like/Comment buttons */}

                              <Box className='flex items-center gap-4 mt-3 pt-3 border-t border-gray-100'>

                                <Button

                                  size='small'

                                  className={`flex items-center gap-1 transition-colors duration-200 ${item.isLiked
                                    ? 'text-red-500'
                                    : 'text-gray-500 hover:text-red-500'
                                    }`}
                                  onClick={async (e) => {
                                    e.stopPropagation()

                                    // Use Redux state instead of local state

                                    togglePostLike(item.id)
                                  }}
                                  sx={{
                                    textTransform: 'none',
                                    minWidth: 'auto',
                                    px: 1,
                                    backgroundColor: 'transparent !important',
                                    '&:hover': {
                                      backgroundColor: 'transparent !important',
                                    },
                                    '&:focus': {
                                      backgroundColor: 'transparent !important',
                                    },
                                    '&:active': {
                                      backgroundColor: 'transparent !important',
                                    }
                                  }}
                                >
                                  <i className={`ri-heart-${item.isLiked ? 'fill' : 'line'}`} />
                                  <Typography variant='caption' className={`transition-colors duration-200 ${item.isLiked ? 'text-red-500' : 'text-gray-500'}`}>
                                    {item.likeCount || item.likes?.length || 0}
                                  </Typography>

                                </Button>

                                <Button

                                  size='small'

                                  className='flex items-center gap-1 text-gray-500 hover:text-blue-500'

                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCommentOnPost(item)
                                  }}

                                  sx={{
                                    textTransform: 'none',
                                    minWidth: 'auto',
                                    px: 1,
                                    backgroundColor: 'transparent !important',
                                    '&:hover': {
                                      backgroundColor: 'transparent !important',
                                    },
                                    '&:focus': {
                                      backgroundColor: 'transparent !important',
                                    },
                                    '&:active': {
                                      backgroundColor: 'transparent !important',
                                    }
                                  }}
                                >

                                  <i className='ri-chat-3-line' />

                                  <Typography variant='caption' className='text-gray-500'>

                                    {item.comments?.length || 0}

                                  </Typography>

                                </Button>

                                <Button

                                  size='small'

                                  className='flex items-center gap-1 text-gray-500 hover:text-green-500'

                                  onClick={(e) => handleShare(item.id, e)}
                                  sx={{
                                    textTransform: 'none',
                                    minWidth: 'auto',
                                    px: 1,
                                    backgroundColor: 'transparent !important',
                                    '&:hover': {
                                      backgroundColor: 'transparent !important',
                                    },
                                    '&:focus': {
                                      backgroundColor: 'transparent !important',
                                    },
                                    '&:active': {
                                      backgroundColor: 'transparent !important',
                                    }
                                  }}
                                >

                                  <i className='ri-share-forward-line' />

                                </Button>

                              </Box>

                            </Box>

                          ))

                      ) : (

                        <Box className='flex justify-center py-8'>

                          <Typography variant='body2' className='text-gray-500'>내 게시물이 없습니다</Typography>

                        </Box>

                      )}

                    </Box>

                  )}



                  {/* Replies Tab - Professional Design */}

                  {feedTab === 1 && (

                    <Box className='mt-3'>

                      {feedLoading ? (

                        <Box className='flex justify-center py-12'>

                          <CircularProgress size={32} />

                        </Box>

                      ) : feedError ? (

                        <Box className='flex flex-col items-center justify-center py-12'>

                          <i className='ri-error-warning-line text-red-500 text-4xl mb-2' />

                          <Typography variant='body2' className='text-red-500'>답글을 불러올 수 없습니다</Typography>

                        </Box>

                      ) : enrichedFeedData && enrichedFeedData.replies && enrichedFeedData.replies.length > 0 ? (

                        <Box className='space-y-6'>

                          {/* Show posts with comments as replies */}
                          {(() => {
                            return enrichedFeedData.replies
                              .filter((item: any) => item.commentContent) // Filter items that have comment content
                              .sort((a: any, b: any) => new Date(b.commentCreatedAt || b.createdAt).getTime() - new Date(a.commentCreatedAt || a.createdAt).getTime())
                              .map((item: any, itemIndex: number) => (
                                <Box key={`post:${item.id ?? itemIndex}`} className='mb-4 bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200'>
                                  {/* User Info - Navigate to user profile; do NOT open post */}
                                  <Box className='flex items-center justify-between gap-3 mb-3'>
                                    <Box
                                      className={`flex items-center gap-3 flex-1 ${item.user?.id !== authUserId ? 'cursor-pointer' : 'cursor-default'}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (item.user?.id && item.user?.id !== authUserId) {
                                          navigate(`/profile?userId=${item.user.id}`)
                                        }
                                      }}
                                    >
                                      <Avatar
                                        className='w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600'
                                        src={item.user?.profileImage || undefined}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (item.user?.id && item.user?.id !== authUserId) {
                                            navigate(`/profile?userId=${item.user.id}`)
                                          }
                                        }}
                                      >
                                        {item.user?.nickname?.charAt(0) || ''}
                                      </Avatar>

                                      <Box className='flex items-center gap-2'>
                                        <Typography
                                          variant='subtitle2'
                                          className={`text-black font-semibold ${item.user?.id !== authUserId ? 'cursor-pointer' : 'cursor-default'}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (item.user?.id && item.user?.id !== authUserId) {
                                              navigate(`/profile?userId=${item.user.id}`)
                                            }
                                          }}
                                        >
                                          {item.user?.nickname || 'Unknown User'}
                                        </Typography>

                                        {/* Community Rating Badge - Show POST AUTHOR badge */}
                                        {(() => {
                                          const badgeDisplay = getCommunityBadgeDisplay((item.user as any)?.activeCommunityBadge)
                                          if (!badgeDisplay) return null
                                          return (
                                            <img
                                              src={badgeDisplay.image}
                                              alt={badgeDisplay.label}
                                              className='w-4 h-4 object-contain'
                                              title={`커뮤니티 등급: ${badgeDisplay.label}`}
                                            />
                                          )
                                        })()}
                                        <Typography variant='caption' className='text-gray-400'>
                                          {new Date(item.createdAt).toLocaleString('ko-KR', {
                                            month: 'short',

                                            day: 'numeric',

                                            hour: '2-digit',

                                            minute: '2-digit'

                                          })}

                                        </Typography>

                                      </Box>
                                    </Box>

                                    {/* Follow Button - Only show for other users */}
                                    {item.user?.id && item.user.id !== authUserId && (
                                      <Box onClick={(e) => e.stopPropagation()}>
                                        <FollowButton
                                          userId={item.user.id}
                                          userNickname={item.user.nickname || 'Unknown User'}
                                          isFollowing={followStatusMap[item.user.id] || false}
                                          onFollowChange={(isFollowing, counts) => {
                                            setFollowStatusMap(prev => ({ ...prev, [item.user.id]: isFollowing }))
                                          }}
                                          size='small'
                                        />
                                      </Box>
                                    )}

                                  </Box>

                                  {/* Post Content - Clickable to go to post */}
                                  <Box
                                    className='cursor-pointer'
                                    onClick={() => navigate(`/post/${item.id}`)}
                                  >
                                    {/* Post Image */}
                                    {item.imageUrl && (
                                      <Box className='mb-3 relative overflow-hidden rounded-2xl bg-gray-200' sx={{ height: 200 }}>
                                        <Image
                                          src={item.imageUrl}
                                          alt={item.title || 'Post image'}
                                          fill
                                          sizes='(max-width: 768px) 100vw, 600px'
                                          style={{ objectFit: 'cover' }}
                                        />
                                      </Box>

                                    )}

                                    {/* Title */}
                                    {item.title && (
                                      <Typography variant='h6' className='text-gray-900 font-semibold mb-2'>
                                        {item.title}
                                      </Typography>

                                    )}

                                    {/* Description */}
                                    {renderOrderedContent(item?.content)}
                                  </Box>


                                  {/* Interactive Stats - Dynamic Like/Comment */}
                                  <Box className='flex items-center gap-4 mt-3 pt-3 border-t border-gray-100'>
                                    <Button
                                      size='small'
                                      className={`flex items-center gap-1 transition-colors duration-200 ${(item?.postIsLiked ?? item?.isLiked)
                                        ? 'text-red-500'
                                        : 'text-gray-500 hover:text-red-500'
                                        }`}
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        // In reply tab cards, the like button should like the POST, not the comment
                                        if (item?.id) {
                                          await handleLikePost(item.id)
                                        }
                                      }}
                                      sx={{
                                        textTransform: 'none',
                                        minWidth: 'auto',
                                        px: 1,
                                        backgroundColor: 'transparent !important',
                                        '&:hover': { backgroundColor: 'transparent !important' },
                                        '&:focus': { backgroundColor: 'transparent !important' },
                                        '&:active': { backgroundColor: 'transparent !important' }
                                      }}
                                    >
                                      <i className={(item?.postIsLiked ?? item?.isLiked) ? 'ri-heart-fill' : 'ri-heart-line'} />
                                      <Typography variant='caption' className={`transition-colors duration-200 ${(item?.postIsLiked ?? item?.isLiked) ? 'text-red-500' : 'text-gray-500'
                                        }`}>
                                        {item?.postLikeCount ?? item?.likeCount ?? item?.likes?.length ?? 0}
                                      </Typography>

                                    </Button>
                                    <Button
                                      size='small'
                                      className='flex items-center gap-1 text-gray-500 hover:text-blue-500'
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleCommentOnPost(item)
                                      }}
                                      sx={{
                                        textTransform: 'none',
                                        minWidth: 'auto',
                                        px: 1,
                                        backgroundColor: 'transparent !important',
                                        '&:hover': { backgroundColor: 'transparent !important' },
                                        '&:focus': { backgroundColor: 'transparent !important' },
                                        '&:active': { backgroundColor: 'transparent !important' }
                                      }}
                                    >
                                      <i className='ri-chat-3-line' />
                                      <Typography variant='caption' className='text-gray-500'>
                                        {item?.totalCommentsCount ?? item?.comments?.length ?? 0}
                                      </Typography>

                                    </Button>
                                    <Button
                                      size='small'
                                      className='flex items-center gap-1 text-gray-500 hover:text-green-500'
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (item?.id) {
                                          handleShare(item.id, e)
                                        }
                                      }}
                                      sx={{
                                        textTransform: 'none',
                                        minWidth: 'auto',
                                        px: 1,
                                        backgroundColor: 'transparent !important',
                                        '&:hover': { backgroundColor: 'transparent !important' },
                                        '&:focus': { backgroundColor: 'transparent !important' },
                                        '&:active': { backgroundColor: 'transparent !important' }
                                      }}
                                    >
                                      <i className='ri-share-forward-line' />
                                    </Button>
                                  </Box>


                                  {/* Your Comments Section */}
                                  <Box className='mt-4 pt-4 border-t border-gray-100'>
                                    <Box className='flex items-center gap-2 mb-4'>
                                      <i className='ri-chat-3-line text-gray-500 text-sm' />
                                      <Typography variant='body2' className='text-gray-700 font-medium'>

                                        댓글
                                      </Typography>

                                    </Box>


                                    <Box className='space-y-3'>

                                      {item.commentReplies && Array.isArray(item.commentReplies) && (() => {
                                        const base = item.commentReplies || []
                                        const optim = optimisticRepliesByPostId[item.id] || []
                                        const combined = [...base, ...optim]
                                        // Dedupe: prefer entries with real numeric id; fallback key by parent+content for temps
                                        const seen: Record<string, boolean> = {}
                                        const deduped = combined.filter((c: any) => {
                                          const hasNumericId = typeof c.id === 'number' && Number.isInteger(c.id)
                                          const key = hasNumericId ? `id:${c.id}` : `temp:${c.parentCommentId}:${c.content}`
                                          if (seen[key]) return false
                                          seen[key] = true
                                          return true
                                        })

                                        // Build hierarchical comment tree
                                        const buildCommentTree = (comments: any[]): any[] => {
                                          const commentMap = new Map()
                                          const topLevel: any[] = []

                                          // First pass: create map of all comments
                                          comments.forEach((comment: any) => {
                                            commentMap.set(comment.id, { ...comment, replies: [] })
                                          })

                                          // Second pass: build tree structure
                                          comments.forEach((comment: any) => {
                                            const node = commentMap.get(comment.id)
                                            if (comment.parentCommentId) {
                                              const parent = commentMap.get(comment.parentCommentId)
                                              if (parent) {
                                                parent.replies.push(node)
                                              } else {
                                                // Parent not in current set, treat as top-level
                                                topLevel.push(node)
                                              }
                                            } else {
                                              topLevel.push(node)
                                            }
                                          })

                                          return topLevel
                                        }

                                        const commentTree = buildCommentTree(deduped)

                                        // Sort top-level comments by newest first
                                        return [...commentTree].sort((a: any, b: any) => {
                                          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
                                          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
                                          return bTime - aTime
                                        })
                                      })()
                                        .map((comment: any) => {
                                          const handleOptimisticLike = (comment: any) => {
                                            if (comment.__optimistic || typeof comment.id !== 'number') {
                                              // Defer like until real comment id arrives
                                              setPendingLikeByParentId(prev => ({ ...prev, [comment.parentCommentId || 0]: true }))
                                              // Optimistically toggle UI
                                              setOptimisticRepliesByPostId(prev => {
                                                const list = prev[item.id] || []
                                                const next = list.map((r: any) => r === comment ? { ...r, isLiked: !r.isLiked, likeCount: (r.likeCount || 0) + (r.isLiked ? -1 : 1) } : r)
                                                return { ...prev, [item.id]: next }
                                              })
                                            }
                                          }

                                          return (
                                            <CommentItem
                                              key={(typeof comment.id === 'number' && Number.isInteger(comment.id)) ? `c:${comment.id}` : `temp:${comment.parentCommentId}:${comment.content}`}
                                              comment={comment}
                                              depth={0}
                                              maxDepth={3}
                                              onReply={handleReplyClick}
                                              onLike={handleLikeComment}
                                              onViewThread={handleThreadClick}
                                              onCommentClick={handleCommentClick}
                                              postData={item}
                                              currentUserId={authUserId || undefined}
                                              isOptimistic={comment.__optimistic}
                                              onOptimisticLike={handleOptimisticLike}
                                            />
                                          )
                                        })}

                                    </Box>
                                  </Box>
                                </Box>
                              ));
                          })()}
                        </Box>

                      ) : (

                        <Box className='flex flex-col items-center justify-center py-16'>

                          <i className='ri-chat-3-line text-gray-300 text-6xl mb-4' />

                          <Typography variant='h6' className='text-gray-500 mb-2'>답글이 없습니다</Typography>

                          <Typography variant='body2' className='text-gray-400 text-center max-w-sm'>

                            다른 사용자의 게시물에 댓글을 남기면 여기에 표시됩니다.

                          </Typography>

                        </Box>

                      )}

                    </Box>

                  )}



                  {/* Tagged Tab - Posts where I am @mentioned */}

                  {feedTab === 2 && (

                    <Box className='mt-3'>

                      {feedLoading ? (

                        <Box className='flex justify-center py-8'>

                          <CircularProgress />

                        </Box>

                      ) : feedError ? (

                        <Box className='flex justify-center py-8'>

                          <Typography variant='body2' className='text-red-500'>Error loading tagged posts</Typography>

                        </Box>

                      ) : enrichedFeedData && enrichedFeedData.tagged && enrichedFeedData.tagged.length > 0 ? (

                        [...enrichedFeedData.tagged]
                          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map((item: any, index: number) => (
                            <Box

                              key={item.id || index}

                              className='mb-4 bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow duration-200'

                              onClick={() => navigate(`/post/${item.id}`)}

                            >

                              {/* Mention banner with date on the right */}
                              <Box className='mb-2 flex items-center justify-between'>
                                <Typography variant='body2' className='text-gray-800'>
                                  <span className='font-semibold'>{item.commentUser?.nickname || item.user?.nickname || '누군가'}</span>{' '}님이 회원님을 언급했습니다
                                </Typography>
                                <Typography variant='caption' className='text-gray-400 text-[10px] w-24 text-right truncate'>
                                  {new Date(item.createdAt).toLocaleString('ko-KR', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </Typography>
                              </Box>



                              {/* User Info */}
                              <Box
                                className={`flex items-center gap-3 mb-3 ${item.user?.id !== authUserId ? 'cursor-pointer' : 'cursor-default'}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.user?.id && item.user?.id !== authUserId) {
                                    navigate(`/profile?userId=${item.user.id}`)
                                  }
                                }}
                              >
                                <Avatar

                                  className='w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600'
                                  src={item.user?.profileImage || undefined}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (item.user?.id && item.user?.id !== authUserId) {
                                      navigate(`/profile?userId=${item.user.id}`)
                                    }
                                  }}

                                >

                                  {item.user?.nickname?.charAt(0) || ''}

                                </Avatar>

                                <Box className='flex items-center gap-2'>
                                  <Typography
                                    variant='subtitle2'
                                    className={`text-black font-semibold ${item.user?.id !== authUserId ? 'cursor-pointer' : 'cursor-default'}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (item.user?.id && item.user?.id !== authUserId) {
                                        navigate(`/profile?userId=${item.user.id}`)
                                      }
                                    }}
                                  >
                                    {item.user?.nickname || 'Unknown User'}
                                  </Typography>

                                  {/* Community Rating Badge - Use activeCommunityBadge from API (dynamic) */}
                                  {(() => {
                                    const badgeDisplay = getCommunityBadgeDisplay((item.user as any)?.activeCommunityBadge)
                                    if (!badgeDisplay) return null
                                    return (
                                      <img
                                        src={badgeDisplay.image}
                                        alt={badgeDisplay.label}
                                        className='w-4 h-4 object-contain'
                                        title={`커뮤니티 등급: ${badgeDisplay.label}`}
                                      />
                                    )
                                  })()}


                                  {/* Date moved to header banner */}

                                </Box>

                              </Box>



                              {/* Post Image */}
                              {item.imageUrl && (
                                <Box className='mb-3 relative overflow-hidden rounded-2xl bg-gray-200' sx={{ height: 200 }}>
                                  <Image
                                    src={item.imageUrl}
                                    alt={item.title || 'Post image'}
                                    fill
                                    sizes='(max-width: 768px) 100vw, 600px'
                                    style={{ objectFit: 'cover' }}
                                  />
                                </Box>
                              )}

                              {/* Title */}
                              {item.title && (

                                <Typography variant='h6' className='text-gray-900 font-semibold mb-2'>

                                  {item.title}

                                </Typography>

                              )}



                              {/* Description */}
                              {renderOrderedContent(item.content)}



                              {/* Interactive Stats */}

                              <Box className='flex items-center gap-4 mt-3 pt-3 border-t border-gray-100'>

                                <Button

                                  size='small'

                                  className={`flex items-center gap-1 transition-colors duration-200 ${item.isLiked
                                    ? 'text-red-500'
                                    : 'text-gray-500 hover:text-red-500'
                                    }`}
                                  onClick={async (e) => {
                                    e.stopPropagation()

                                    // Use Redux state instead of local state

                                    togglePostLike(item.id)
                                  }}
                                  sx={{
                                    textTransform: 'none',
                                    minWidth: 'auto',
                                    px: 1,
                                    backgroundColor: 'transparent !important',
                                    '&:hover': {
                                      backgroundColor: 'transparent !important',
                                    },
                                    '&:focus': {
                                      backgroundColor: 'transparent !important',
                                    },
                                    '&:active': {
                                      backgroundColor: 'transparent !important',
                                    }
                                  }}
                                >
                                  <i className={`ri-heart-${item.isLiked ? 'fill' : 'line'}`} />
                                  <Typography variant='caption' className={`transition-colors duration-200 ${item.isLiked ? 'text-red-500' : 'text-gray-500'}`}>
                                    {item.likeCount || item.likes?.length || 0}
                                  </Typography>

                                </Button>

                                <Button

                                  size='small'

                                  className='flex items-center gap-1 text-gray-500 hover:text-blue-500'

                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCommentOnPost(item)
                                  }}

                                  sx={{
                                    textTransform: 'none',
                                    minWidth: 'auto',
                                    px: 1,
                                    backgroundColor: 'transparent !important',
                                    '&:hover': {
                                      backgroundColor: 'transparent !important',
                                    },
                                    '&:focus': {
                                      backgroundColor: 'transparent !important',
                                    },
                                    '&:active': {
                                      backgroundColor: 'transparent !important',
                                    }
                                  }}
                                >

                                  <i className='ri-chat-3-line' />

                                  <Typography variant='caption' className='text-gray-500'>

                                    {item.comments?.length || 0}

                                  </Typography>

                                </Button>

                                <Button

                                  size='small'

                                  className='flex items-center gap-1 text-gray-500 hover:text-green-500'

                                  onClick={(e) => handleShare(item.id, e)}
                                  sx={{
                                    textTransform: 'none',
                                    minWidth: 'auto',
                                    px: 1,
                                    backgroundColor: 'transparent !important',
                                    '&:hover': {
                                      backgroundColor: 'transparent !important',
                                    },
                                    '&:focus': {
                                      backgroundColor: 'transparent !important',
                                    },
                                    '&:active': {
                                      backgroundColor: 'transparent !important',
                                    }
                                  }}
                                >

                                  <i className='ri-share-forward-line' />

                                </Button>

                              </Box>

                            </Box>

                          ))

                      ) : (

                        <Box className='flex justify-center py-8'>

                          <Box className='text-center'>

                            <i className='ri-user-tag-line text-6xl text-gray-300 mb-4' />

                            <Typography variant='h6' className='text-gray-500 mb-2'>

                              @멘션된 게시물이 없습니다

                            </Typography>

                            <Typography variant='body2' className='text-gray-400'>

                              다른 사용자가 @{profileData?.user?.nickname || 'me'}로 멘션한 게시물이 여기에 표시됩니다

                            </Typography>

                          </Box>

                        </Box>

                      )}

                    </Box>

                  )}

                </Box>

              )}

            </>

          )}

        </Box>



        {/* Floating create button (shown based on tab configuration) */}

        {floatingButtonConfig.show && !isFollowOpen && (

          <Box className='fixed right-4 transform z-30' sx={{ bottom: { xs: 88, md: 40 } }}>

            <Button
              variant='contained'
              startIcon={<i className='ri-add-line' />}
              onClick={() => navigate(floatingButtonConfig.url)}
              sx={{
                backgroundColor: 'gray',
                color: '#fff',
                borderRadius: '10px',
                px: 2.5,
                py: 2,
                boxShadow: '0 8px 18px rgba(0,0,0,0.15)',
                textTransform: 'none',
                '&:hover': { backgroundColor: '#gray' }
              }}
            >
              {floatingButtonConfig.label}
            </Button>

          </Box>

        )}



        {/* Followers / Following overlay */}

        {isFollowOpen && (

          <Box className='fixed inset-0 bg-white z-40 flex flex-col'>

            {/* Header */}

            <Box className='border-b border-gray-200'>

              <Box className='flex items-center justify-between px-2 py-3'>

                <IconButton onClick={() => setIsFollowOpen(false)} className='p-0'>

                  <i className='ri-arrow-left-s-line' style={{ fontSize: '30px' }} />

                </IconButton>

              </Box>

              {/* Tabs */}

              <Box className='flex items-center gap-6 px-4 pb-2'>

                {['팔로워', '팔로잉'].map((label, idx) => (

                  <Box

                    key={label}

                    onClick={() => setFollowTab(idx)}

                    className={`py-1 cursor-pointer ${followTab === idx ? 'text-black font-semibold border-b-2 border-black' : 'text-gray-500'}`}

                  >

                    {label}

                  </Box>

                ))}

              </Box>

            </Box>



            {/* List */}

            <Box className='px-2 pb-28 overflow-y-auto'>

              <>

                {followTab === 0 ? (

                  // Followers list

                  followersLoading ? (
                    <Box className='flex justify-center py-8'>
                      <CircularProgress size={24} />
                    </Box>
                  ) : dynamicFollowers?.length ? (

                    dynamicFollowers.map((follower: any) => (

                      <Box key={`follower-${follower.id}-${follower.nickname}`} className='flex items-center justify-between px-2 py-2 border-b border-gray-100'>

                        <Box
                          className='flex items-center cursor-pointer'
                          onClick={() => goToProfile(follower.id)}
                        >

                          <Avatar

                            className='w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 mr-3'
                            src={follower.profileImage || undefined}
                            onClick={(e) => {
                              e.stopPropagation()
                              goToProfile(follower.id)
                            }}

                          >

                            {follower.nickname?.charAt(0) || ''}

                          </Avatar>

                          <Box className='flex items-center gap-1'>

                            <Typography
                              variant='body2'
                              className='text-black'
                              onClick={(e) => {
                                e.stopPropagation()
                                goToProfile(follower.id)
                              }}
                            >

                              {follower.nickname || ''}

                            </Typography>
                            {/* Community Rating Badge for Follower */}
                            {(() => {
                              const badgeDisplay = getCommunityBadgeDisplay(follower.activeCommunityBadge)
                              if (!badgeDisplay) return null
                              return (
                                <img
                                  src={badgeDisplay.image}
                                  alt={badgeDisplay.label}
                                  className='w-3 h-3 object-contain ml-1'
                                  title={`커뮤니티 등급: ${badgeDisplay.label}`}
                                />
                              )
                            })()}

                            {follower.status === 'verified' && (

                              <Image src='/images/custom/yellow-verified-badge.png' alt='yellow verified badge' width={20} height={20} />

                            )}

                          </Box>

                        </Box>

                        <Box onClick={(e) => e.stopPropagation()}>
                          <FollowButton
                            userId={follower.id}
                            userNickname={follower.nickname}
                            size="small"
                            isFollowing={followStatusMap[follower.id] || false}
                            onFollowChange={(isFollowing, counts) => {
                              // Update local state if needed
                              // Profile - Follow status changed
                              // Update the follow status map
                              setFollowStatusMap(prev => ({ ...prev, [follower.id]: isFollowing }))
                            }}
                          />
                        </Box>

                      </Box>

                    ))

                  ) : (

                    <Box className='flex justify-center py-8'>

                      <Typography variant='body2' className='text-gray-500'>팔로워가 없습니다</Typography>

                    </Box>

                  )

                ) : (

                  // Following list

                  followingLoading ? (
                    <Box className='flex justify-center py-8'>
                      <CircularProgress size={24} />
                    </Box>
                  ) : dynamicFollowing?.length ? (

                    dynamicFollowing.map((following: any) => (

                      <Box key={`following-${following.id}-${following.nickname}`} className='flex items-center justify-between px-2 py-2 border-b border-gray-100'>

                        <Box
                          className='flex items-center cursor-pointer'
                          onClick={() => goToProfile(following.id)}
                        >

                          <Avatar

                            className='w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 mr-3'
                            src={following.profileImage || undefined}
                            onClick={(e) => {
                              e.stopPropagation()
                              goToProfile(following.id)
                            }}

                          >

                            {following.nickname?.charAt(0) || ''}

                          </Avatar>

                          <Box className='flex items-center gap-1'>

                            <Typography
                              variant='body2'
                              className='text-black'
                              onClick={(e) => {
                                e.stopPropagation()
                                goToProfile(following.id)
                              }}
                            >

                              {following.nickname || ''}

                            </Typography>
                            {/* Community Rating Badge for Following */}
                            {(() => {
                              const badgeDisplay = getCommunityBadgeDisplay(following.activeCommunityBadge)
                              if (!badgeDisplay) return null
                              return (
                                <img
                                  src={badgeDisplay.image}
                                  alt={badgeDisplay.label}
                                  className='w-3 h-3 object-contain ml-1'
                                  title={`커뮤니티 등급: ${badgeDisplay.label}`}
                                />
                              )
                            })()}

                            {following.status === 'verified' && (

                              <Image src='/images/custom/yellow-verified-badge.png' alt='yellow verified badge' width={20} height={20} />

                            )}

                          </Box>

                        </Box>

                        <Box onClick={(e) => e.stopPropagation()}>
                          <FollowButton
                            userId={following.id}
                            userNickname={following.nickname}
                            size="small"
                            isFollowing={followStatusMap[following.id] || false}
                            onFollowChange={(isFollowing, counts) => {
                              // Update local state if needed
                              // Profile - Follow status changed
                              // Update the follow status map
                              setFollowStatusMap(prev => ({ ...prev, [following.id]: isFollowing }))
                            }}
                          />
                        </Box>

                      </Box>

                    ))

                  ) : (

                    <Box className='flex justify-center py-8'>

                      <Typography variant='body2' className='text-gray-500'>팔로잉한 사용자가 없습니다</Typography>

                    </Box>

                  )

                )}

              </>

            </Box>

          </Box>

        )}

        {/* Share Modal */}
        {shareModalOpen && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
            onClick={() => setShareModalOpen(false)}
          >
            <Box
              sx={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '400px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Box className='flex items-center justify-between mb-4'>
                <Typography variant='h6' className='font-semibold'>공유</Typography>
                <IconButton onClick={() => setShareModalOpen(false)} size='small' className='text-gray-500 hover:text-gray-700'>
                  <i className='ri-close-line text-lg' />
                </IconButton>
              </Box>
              <Box className='mb-4'>
                <Typography variant='body2' className='text-gray-600 mb-2'>링크 복사</Typography>
                <Box className='flex items-center gap-2'>
                  <TextField
                    fullWidth
                    value={shareUrl}
                    variant='outlined'
                    size='small'
                    disabled
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#f8f9fa',
                      },
                    }}
                  />
                  <Button
                    variant='contained'
                    onClick={copyToClipboard}
                    className='bg-blue-600 hover:bg-blue-700 text-white px-4'
                    sx={{ textTransform: 'none', minWidth: 'auto' }}
                  >
                    {shareCopied ? (
                      <>
                        <i className='ri-check-line mr-1' />
                        복사됨
                      </>
                    ) : (
                      '복사'
                    )}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        {/* Threads-style Reply Modal */}
        <ReplyModal
          isOpen={replyModalOpen}
          onClose={handleCloseModals}
          postId={selectedPost?.id || 0}
          parentCommentId={selectedComment?.id}
          originalComment={selectedComment}
          originalPost={selectedPost}
          onSuccess={handleReplySuccess}
        />

        {/* Thread View Modal */}
        <ThreadView
          isOpen={threadViewOpen}
          onClose={handleCloseModals}
          comment={selectedComment}
          post={selectedPost}
          postId={selectedPost?.id || 0}
          allComments={selectedPost?.commentReplies || []}
          onReply={handleReplyClick}
          onLike={handleLikeComment}
          totalCommentsCount={selectedPost?.totalCommentsCount}
        />
      </Box>
    </ErrorBoundary>
  )
})



// Explicitly exclude params to prevent Next.js from trying to pass it
export default MyPostDetailMainPage as React.ComponentType
