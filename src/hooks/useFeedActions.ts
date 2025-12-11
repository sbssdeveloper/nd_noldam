import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { 
  fetchFeed, 
  likeFeedPost, 
  sharePost,
  setActiveTab,
  clearFeed,
  updatePostLikes
} from '@/store/slices/feedSlice'

export const useFeedActions = () => {
  const dispatch = useAppDispatch()
  const { 
    posts, 
    replies, 
    tagged, 
    loading, 
    error, 
    activeTab 
  } = useAppSelector(state => state.feed)

  const loadFeed = useCallback(async (type: 'posts' | 'replies' | 'tagged', token: string) => {
    return dispatch(fetchFeed({ type, token }))
  }, [dispatch])

  const handleLikePost = useCallback(async (postId: number, token: string) => {
    return dispatch(likeFeedPost({ postId, token }))
  }, [dispatch])

  const handleSharePost = useCallback(async (postId: number, token: string) => {
    return dispatch(sharePost({ postId, token }))
  }, [dispatch])

  const handleSetActiveTab = useCallback((tab: 'posts' | 'replies' | 'tagged') => {
    dispatch(setActiveTab(tab))
  }, [dispatch])

  const handleClearFeed = useCallback(() => {
    dispatch(clearFeed())
  }, [dispatch])

  const handleUpdatePostLikes = useCallback((postId: number, isLiked: boolean, likeCount: number) => {
    dispatch(updatePostLikes({ postId, isLiked, likeCount }))
  }, [dispatch])

  const getCurrentFeedItems = useCallback(() => {
    switch (activeTab) {
      case 'posts':
        return posts
      case 'replies':
        return replies
      case 'tagged':
        return tagged
      default:
        return posts
    }
  }, [activeTab, posts, replies, tagged])

  return {
    // State
    posts,
    replies,
    tagged,
    loading,
    error,
    activeTab,
    
    // Computed
    currentFeedItems: getCurrentFeedItems(),
    
    // Actions
    loadFeed,
    handleLikePost,
    handleSharePost,
    handleSetActiveTab,
    handleClearFeed,
    handleUpdatePostLikes
  }
}
