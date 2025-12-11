import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { 
  fetchPost, 
  likePost, 
  addComment, 
  likeComment,
  clearPost,
  setLikeLoading,
  setCommentLoading
} from '@/store/slices/postSlice'

export const usePostActions = () => {
  const dispatch = useAppDispatch()
  const { 
    currentPost, 
    comments, 
    loading, 
    error, 
    likeLoading, 
    commentLoading,
    hasMoreComments,
    totalComments
  } = useAppSelector(state => state.postReducer)

  const loadPost = useCallback(async (postId: string) => {
    return dispatch(fetchPost({ postId }))
  }, [dispatch])

  const handleLikePost = useCallback(async (postId: string) => {
    return dispatch(likePost({ postId }))
  }, [dispatch])

  const handleAddComment = useCallback(async (
    postId: string, 
    content: string, 
    parentCommentId: number | null
  ) => {
    return dispatch(addComment({ postId, content, parentCommentId }))
  }, [dispatch])

  const handleLikeComment = useCallback(async (commentId: number) => {
    return dispatch(likeComment({ commentId }))
  }, [dispatch])

  const handleClearPost = useCallback(() => {
    dispatch(clearPost())
  }, [dispatch])

  const handleSetLikeLoading = useCallback((loading: boolean) => {
    dispatch(setLikeLoading(loading))
  }, [dispatch])

  const handleSetCommentLoading = useCallback((loading: boolean) => {
    dispatch(setCommentLoading(loading))
  }, [dispatch])

  return {
    // State
    currentPost,
    comments,
    loading,
    error,
    likeLoading,
    commentLoading,
    hasMoreComments,
    totalComments,
    
    // Actions
    loadPost,
    handleLikePost,
    handleAddComment,
    handleLikeComment,
    handleClearPost,
    handleSetLikeLoading,
    handleSetCommentLoading
  }
}
