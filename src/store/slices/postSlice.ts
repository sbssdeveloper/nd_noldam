import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { apiService } from '../../services/apiService'
import { API_CONFIG } from '../../apiConfigs/api'
import type { Post, Comment } from '../../services/types/shared'

interface PostState {
  currentPost: Post | null
  comments: Comment[]
  loading: boolean
  error: string | null
  likeLoading: boolean
  commentLoading: boolean
  hasMoreComments: boolean
  totalComments: number
}

const initialState: PostState = {
  currentPost: null,
  comments: [],
  loading: false,
  error: null,
  likeLoading: false,
  commentLoading: false,
  hasMoreComments: false,
  totalComments: 0
}

// Async Thunks
export const fetchPost = createAsyncThunk(
  'post/fetchPost',
  async ({ postId }: { postId: string }) => {
    const response = await apiService.get(API_CONFIG.ENDPOINTS.POST_DETAIL(postId))
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch post')
    }
    return response.data
  }
)

export const likePost = createAsyncThunk(
  'post/likePost',
  async ({ postId }: { postId: string }) => {
    const response = await apiService.post(API_CONFIG.ENDPOINTS.POST_LIKE(postId))
    if (!response.success) {
      throw new Error(response.error || 'Failed to like post')
    }
    return { postId: parseInt(postId), ...response.data }
  }
)

export const addComment = createAsyncThunk(
  'post/addComment',
  async ({ 
    postId, 
    content, 
    parentCommentId
  }: { 
    postId: string
    content: string
    parentCommentId?: number | null
  }) => {
    const response = await apiService.post(API_CONFIG.ENDPOINTS.POST_COMMENT, {
      postId,
      content,
      parentCommentId
    })
    if (!response.success) {
      throw new Error(response.error || 'Failed to add comment')
    }
    return response.data
  }
)

export const likeComment = createAsyncThunk(
  'post/likeComment',
  async ({ 
    commentId
  }: { 
    commentId: number
  }) => {
    const response = await apiService.post(API_CONFIG.ENDPOINTS.POST_COMMENT_LIKE(commentId.toString()))
    if (!response.success) {
      throw new Error(response.error || 'Failed to like comment')
    }
    const { liked, likeCount } = response.data
    return { commentId, liked, likeCount }
  }
)

// Slice
const postSlice = createSlice({
  name: 'post',
  initialState,
  reducers: {
    clearPost: (state) => {
      state.currentPost = null
      state.comments = []
      state.error = null
    },
    setLikeLoading: (state, action: PayloadAction<boolean>) => {
      state.likeLoading = action.payload
    },
    setCommentLoading: (state, action: PayloadAction<boolean>) => {
      state.commentLoading = action.payload
    }
  },
  extraReducers: (builder) => {
    // Fetch Post
    builder
      .addCase(fetchPost.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchPost.fulfilled, (state, action) => {
        state.loading = false
        const post = action.payload.data.post
        const comments = action.payload.data.comments || []
        
        // Trust API-provided like metadata for post (fallbacks for backward compatibility)
        state.currentPost = {
          ...post,
          isLiked: typeof (post as any).isLiked === 'boolean' ? (post as any).isLiked : false,
          likeCount: typeof (post as any).likeCount === 'number' ? (post as any).likeCount : (post as any).likes?.length || 0
        }
        
        // Trust API-provided like metadata for comments (recursive structure already precomputed by API)
        state.comments = comments.map((comment: any) => ({
          ...comment,
          isLiked: typeof comment.isLiked === 'boolean' ? comment.isLiked : false,
          likeCount: typeof comment.likeCount === 'number' ? comment.likeCount : (comment.likes?.length || 0)
        }))
        
        state.hasMoreComments = action.payload.data.hasMoreComments || false
        state.totalComments = action.payload.data.totalComments || 0
      })
      .addCase(fetchPost.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch post'
      })

    // Like Post (optimistic update)
    builder
      .addCase(likePost.pending, (state) => {
        state.likeLoading = true
        // Optimistically toggle like state for immediate UI feedback
        if (state.currentPost) {
          const wasLiked = state.currentPost.isLiked
          state.currentPost = {
            ...state.currentPost,
            isLiked: !wasLiked,
            likeCount: (state.currentPost.likeCount || 0) + (wasLiked ? -1 : 1)
          }
        }
      })
      .addCase(likePost.fulfilled, (state, action) => {
        state.likeLoading = false
        // Reconcile with server response to avoid drift
        const { postId, liked, likeCount } = action.payload
        if (state.currentPost && typeof liked === 'boolean' && typeof likeCount === 'number') {
          state.currentPost = {
            ...state.currentPost,
            isLiked: liked,
            likeCount
          }
        }
      })
      .addCase(likePost.rejected, (state, action) => {
        // Revert optimistic update on failure
        if (state.currentPost) {
          const wasLiked = state.currentPost.isLiked
          state.currentPost = {
            ...state.currentPost,
            isLiked: !wasLiked,
            likeCount: (state.currentPost.likeCount || 0) + (wasLiked ? -1 : 1)
          }
        }
        state.likeLoading = false
        state.error = action.error.message || 'Failed to like post'
      })

    // Add Comment
    builder
      .addCase(addComment.pending, (state) => {
        state.commentLoading = true
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.commentLoading = false
        const newComment = action.payload.data.comment
        
        if (newComment.parentCommentId) {
          // Add as reply - use immutable update
          const parentCommentIndex = state.comments.findIndex(comment => comment.id === newComment.parentCommentId)
          if (parentCommentIndex !== -1) {
            const parentComment = state.comments[parentCommentIndex]
            state.comments[parentCommentIndex] = {
              ...parentComment,
              replies: [...(parentComment.replies || []), newComment]
            }
          }
        } else {
          // Add as top-level comment - use immutable update
          state.comments = [...state.comments, newComment]
        }
        state.totalComments += 1
      })
      .addCase(addComment.rejected, (state, action) => {
        state.commentLoading = false
        state.error = action.error.message || 'Failed to add comment'
      })

    // Like Comment
    builder
      .addCase(likeComment.pending, (state) => {
        // Handle comment like loading if needed
      })
      .addCase(likeComment.fulfilled, (state, action) => {
        // Update comment like status using server values and return new references
        const { commentId, liked, likeCount } = action.payload as { commentId: number; liked: boolean; likeCount: number }

        const updateTree = (comments: Comment[]): Comment[] => {
          let changed = false
          const next = comments.map(comment => {
            let nodeChanged = false
            let nextReplies = comment.replies
            if (comment.replies && comment.replies.length > 0) {
              const updatedReplies = updateTree(comment.replies)
              if (updatedReplies !== comment.replies) {
                nextReplies = updatedReplies
                nodeChanged = true
              }
            }
            if (comment.id === commentId) {
              nodeChanged = true
              const updatedNode = {
                ...comment,
                isLiked: liked,
                likeCount: likeCount,
                replies: nextReplies
              }
              changed = true
              return updatedNode
            }
            if (nodeChanged) {
              changed = true
              return { ...comment, replies: nextReplies }
            }
            return comment
          })
          return changed ? next : comments
        }

        const updated = updateTree(state.comments)
        if (updated !== state.comments) {
          state.comments = updated
        }
      })
      .addCase(likeComment.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to like comment'
      })

    // Listen to mypageSlice like actions to keep postSlice synchronized
    builder
      .addCase('mypage/likePost/fulfilled', (state, action: any) => {
        const { postId, liked, likeCount } = action.payload
        // Only update if this is the current post
        if (state.currentPost && state.currentPost.id === postId) {
          state.currentPost = {
            ...state.currentPost,
            isLiked: liked,
            likeCount: likeCount
          }
        }
      })
      .addCase('mypage/likeComment/fulfilled', (state, action: any) => {
        const { commentId, liked, likeCount } = action.payload
        // Update comment like status using server values
        const updateTree = (comments: Comment[]): Comment[] => {
          let changed = false
          const next = comments.map(comment => {
            let nodeChanged = false
            let nextReplies = comment.replies
            if (comment.replies && comment.replies.length > 0) {
              const updatedReplies = updateTree(comment.replies)
              if (updatedReplies !== comment.replies) {
                nextReplies = updatedReplies
                nodeChanged = true
              }
            }
            if (comment.id === commentId) {
              nodeChanged = true
              const updatedNode = {
                ...comment,
                isLiked: liked,
                likeCount: likeCount,
                replies: nextReplies
              }
              changed = true
              return updatedNode
            }
            if (nodeChanged) {
              changed = true
              return { ...comment, replies: nextReplies }
            }
            return comment
          })
          return changed ? next : comments
        }

        const updated = updateTree(state.comments)
        if (updated !== state.comments) {
          state.comments = updated
        }
      })
  }
})

export const { clearPost, setLikeLoading, setCommentLoading } = postSlice.actions
export default postSlice.reducer
