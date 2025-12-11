import React from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { 
  fetchProfile,
  fetchSummary,
  fetchFeed,
  fetchBadges,
  fetchMeetings,
  likePost,
  likeComment,
  deleteComment,
  updateProfilePrivacy,
  updateTabPrivacy,
  setActiveTab,
  clearData,
  clearCache,
  updateProfileData
} from '@/store/slices/mypageSlice'

export const useMyPageActions = () => {
  const dispatch = useAppDispatch()
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
    activeTab,
    meetingsData,
    meetingsLoading,
    meetingsError,
    badgesData,
    badgesLoading,
    badgesError
  } = useAppSelector((state) => state.mypageReducer)

  // Keep a stable reference of activeTab to avoid recreating callbacks on tab changes
  const activeTabRef = React.useRef(activeTab)
  React.useEffect(() => {
    // activeTab changed
    activeTabRef.current = activeTab
  }, [activeTab])

  // Load profile data
  const loadProfile = React.useCallback((userId?: number) => {
    // dispatch fetchProfile
    dispatch(fetchProfile(userId))
  }, [dispatch])

  // Load summary data
  const loadSummary = React.useCallback(() => {
    // dispatch fetchSummary
    dispatch(fetchSummary())
  }, [dispatch])

  // Load feed data
  const loadFeed = React.useCallback((tab: 'posts' | 'replies' | 'tagged', userId?: number) => {
    // dispatch fetchFeed
    dispatch(fetchFeed({ tab, userId }))
  }, [dispatch])

  // Load badges data
  const loadBadges = React.useCallback(() => {
    // dispatch fetchBadges
    dispatch(fetchBadges())
  }, [dispatch])

  // Load meetings data
  const loadMeetings = React.useCallback((userId?: number, meetingType: 'all' | 'created' | 'participated' = 'all') => {
    // dispatch fetchMeetings
    dispatch(fetchMeetings({ userId, meetingType }))
  }, [dispatch])

  // Set active tab
  const handleSetTab = React.useCallback((tab: 'posts' | 'replies' | 'tagged') => {
    dispatch(setActiveTab(tab))
  }, [dispatch])

  // Clear all data
  const handleClearData = React.useCallback(() => {
    dispatch(clearData())
  }, [dispatch])

  // Clear cache
  const handleClearCache = React.useCallback(() => {
    dispatch(clearCache())
  }, [dispatch])

  // Update profile data
  const handleUpdateProfile = React.useCallback((data: any) => {
    dispatch(updateProfileData(data))
  }, [dispatch])

  // Like a post
  const handleLikePost = React.useCallback(async (postId: number) => {
    const result = await dispatch(likePost(postId))
    return result
  }, [dispatch])

  // Like a comment
  const handleLikeComment = React.useCallback(async (commentId: number) => {
    return dispatch(likeComment(commentId))
  }, [dispatch])

  // Delete a comment
  const handleDeleteComment = React.useCallback(async (commentId: number) => {
    return dispatch(deleteComment(commentId))
  }, [dispatch])


  // Update profile privacy
  const handleUpdateProfilePrivacy = React.useCallback(async (publicVisibility: boolean) => {
    return dispatch(updateProfilePrivacy(publicVisibility))
  }, [dispatch])

  // Update tab privacy
  const handleUpdateTabPrivacy = React.useCallback(async (tabType: 'feed' | 'meetings' | 'badges', privacy: boolean) => {
    return dispatch(updateTabPrivacy({ tabType, privacy }))
  }, [dispatch])

  // Load all data
  const loadAllData = React.useCallback((userId?: number) => {
    loadProfile(userId)
    loadSummary()
    loadFeed(activeTab, userId)
    loadBadges()
    // Meetings are loaded on demand based on UI tab
  }, [loadProfile, loadSummary, loadFeed, activeTab, loadBadges])

  // Load all data stable - ⚡ OPTIMIZED: Parallel data loading
  const loadAllDataStable = React.useCallback((userId: number) => {
    // Use current active tab from ref to keep this callback stable across tab changes
    const currentTab = activeTabRef.current || 'posts'
    // loadAllDataStable called
    // Load all data in PARALLEL instead of sequential - HUGE performance boost!
    Promise.all([
      dispatch(fetchProfile(userId)),
      dispatch(fetchSummary()),
      dispatch(fetchFeed({ tab: currentTab, userId })),
      dispatch(fetchBadges())
    ]).catch(err => {
      console.error('Error loading profile data:', err)
    })
    // Meetings are loaded on demand based on UI tab
  }, [dispatch])

  // Always refresh data - ⚡ OPTIMIZED: Parallel loading
  const refreshStaleData = React.useCallback(() => {
    Promise.all([
      dispatch(fetchProfile()),
      dispatch(fetchSummary()),
      dispatch(fetchFeed({ tab: activeTab })),
      dispatch(fetchBadges())
    ]).catch(err => {
      console.error('Error refreshing profile data:', err)
    })
  }, [dispatch, activeTab])

  return {
    // Data
    profileData,
    summaryData,
    feedData,
    meetingsData,
    badgesData,
    
    // Loading states
    profileLoading,
    summaryLoading,
    feedLoading,
    meetingsLoading,
    badgesLoading,
    
    // Error states
    profileError,
    summaryError,
    feedError,
    meetingsError,
    badgesError,
    
    // Active tab
    activeTab,
    
    // Actions
    loadProfile,
    loadSummary,
    loadFeed,
    loadBadges,
    loadAllData,
    loadAllDataStable,
    refreshStaleData,
    loadMeetings,
    
    // Tab management
    setTab: handleSetTab,
    
    // Data management
    clearData: handleClearData,
    clearCache: handleClearCache,
    updateProfile: handleUpdateProfile,
    
    // Interactions
    likePost: handleLikePost,
    likeComment: handleLikeComment,
    deleteComment: handleDeleteComment,
    
    // Privacy
    updateProfilePrivacy: handleUpdateProfilePrivacy,
    updateTabPrivacy: handleUpdateTabPrivacy
  }
}
