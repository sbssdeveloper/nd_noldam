import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { FeedItem } from '../../services/types/shared'

interface FeedState {
  posts: FeedItem[]
  replies: FeedItem[]
  tagged: FeedItem[]
  loading: boolean
  error: string | null
  activeTab: 'posts' | 'replies' | 'tagged'
}

const initialState: FeedState = {
  posts: [],
  replies: [],
  tagged: [],
  loading: false,
  error: null,
  activeTab: 'posts'
}

// Async Thunks
export const fetchFeed = createAsyncThunk(
  'feed/fetchFeed',
  async ({ 
    type, 
    token 
  }: { 
    type: 'posts' | 'replies' | 'tagged'
    token: string 
  }) => {
    const response = await fetch(`/api/users/feed?type=${type}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch feed')
    }
    
    return response.json()
  }
)

export const likeFeedPost = createAsyncThunk(
  'feed/likeFeedPost',
  async ({ 
    postId, 
    token 
  }: { 
    postId: number
    token: string 
  }) => {
    const response = await fetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to like post')
    }
    
    return response.json()
  }
)

export const sharePost = createAsyncThunk(
  'feed/sharePost',
  async ({ 
    postId, 
    token 
  }: { 
    postId: number
    token: string 
  }) => {
    const response = await fetch(`/api/posts/${postId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to share post')
    }
    
    return response.json()
  }
)

// Slice
const feedSlice = createSlice({
  name: 'feed',
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<'posts' | 'replies' | 'tagged'>) => {
      state.activeTab = action.payload
    },
    clearFeed: (state) => {
      state.posts = []
      state.replies = []
      state.tagged = []
      state.error = null
    },
    updatePostLikes: (state, action: PayloadAction<{ postId: number; isLiked: boolean; likeCount: number }>) => {
      const { postId, isLiked, likeCount } = action.payload
      
      const updatePost = (posts: FeedItem[]) => {
        posts.forEach(post => {
          if (post.id === postId) {
            post.isLiked = isLiked
            post.likeCount = likeCount
          }
        })
      }
      
      updatePost(state.posts)
      updatePost(state.replies)
      updatePost(state.tagged)
    }
  },
  extraReducers: (builder) => {
    // Fetch Feed
    builder
      .addCase(fetchFeed.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchFeed.fulfilled, (state, action) => {
        state.loading = false
        const { type, items } = action.payload.data
        
        switch (type) {
          case 'posts':
            state.posts = items
            break
          case 'replies':
            state.replies = items
            break
          case 'tagged':
            state.tagged = items
            break
        }
      })
      .addCase(fetchFeed.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch feed'
      })

    // Like Feed Post
    builder
      .addCase(likeFeedPost.fulfilled, (state, action) => {
        const { postId, isLiked, likeCount } = action.payload
        state.posts.forEach(post => {
          if (post.id === postId) {
            post.isLiked = isLiked
            post.likeCount = likeCount
          }
        })
      })
      .addCase(likeFeedPost.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to like post'
      })

    // Share Post
    builder
      .addCase(sharePost.fulfilled, (state, action) => {
        // Handle share success if needed
      })
      .addCase(sharePost.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to share post'
      })
  }
})

export const { setActiveTab, clearFeed, updatePostLikes } = feedSlice.actions
export default feedSlice.reducer
