import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import SearchApiService from '@/services/searchApi'
import type { 
  SearchState, 
  SearchFilters, 
  SearchMeetingResult, 
  SearchPostResult, 
  SearchUserResult,
  Category,
  Genre 
} from '@/services/types/frontend'

// Initial state
const initialState: SearchState = {
  query: '',
  activeTab: 0,
  filters: {
    category: undefined,
    round: 'all',
    sort: 'latest'
  },
  meetingResults: [],
  postResults: [],
  userResults: [],
  genres: [],
  genresLoading: false,
  genresError: null,
  loading: {
    meetings: false,
    posts: false,
    users: false
  },
  error: {
    meetings: null,
    posts: null,
    users: null
  }
}

// Async thunks following project pattern
export const searchMeetings = createAsyncThunk(
  'search/searchMeetings',
  async ({ query, filters }: { query: string; filters: SearchFilters }, { rejectWithValue }) => {
    try {
      const response = await SearchApiService.searchMeetings(query, filters)
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to search meetings')
      }

      // Backend returns { success, message, data: { meetings, total } }
      // apiService wraps it, so we need to access response.data.data
      return response.data?.data || response.data
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const searchPosts = createAsyncThunk(
  'search/searchPosts',
  async ({ query, sort }: { query: string; sort: string }, { rejectWithValue }) => {
    try {
      const response = await SearchApiService.searchPosts(query, sort)
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to search posts')
      }

      // Backend returns { success, message, data: { posts, total } }
      // apiService wraps it, so we need to access response.data.data
      return response.data?.data || response.data
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const searchUsers = createAsyncThunk(
  'search/searchUsers',
  async ({ query, categoryId }: { query: string; categoryId?: string }, { rejectWithValue }) => {
    try {
      const response = await SearchApiService.searchUsers(query, categoryId)
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to search users')
      }

      // Backend returns { success, message, data: { users, total } }
      // apiService wraps it, so we need to access response.data.data
      return response.data?.data || response.data
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const fetchGenres = createAsyncThunk(
  'search/fetchGenres',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/genres')
      const data = await response.json()

      if (!response.ok) {
        return rejectWithValue(data.reason || 'Failed to fetch genres')
      }

      return data
    } catch (error) {
      return rejectWithValue('Failed to fetch genres')
    }
  }
)

// Search slice
const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload
    },
    setActiveTab: (state, action: PayloadAction<0 | 1 | 2>) => {
      state.activeTab = action.payload
    },
    setFilters: (state, action: PayloadAction<Partial<SearchFilters>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    clearSearch: (state) => {
      state.query = ''
      state.meetingResults = []
      state.postResults = []
      state.userResults = []
      state.error = {
        meetings: null,
        posts: null,
        users: null
      }
    },
    clearResults: (state) => {
      state.meetingResults = []
      state.postResults = []
      state.userResults = []
    }
  },
  extraReducers: (builder) => {
    // Search meetings
    builder
      .addCase(searchMeetings.pending, (state) => {
        state.loading.meetings = true
        state.error.meetings = null
      })
      .addCase(searchMeetings.fulfilled, (state, action) => {
        state.loading.meetings = false
        state.meetingResults = action.payload.meetings || []
        state.error.meetings = null
      })
      .addCase(searchMeetings.rejected, (state, action) => {
        state.loading.meetings = false
        state.error.meetings = action.payload as string
      })

    // Search posts
    builder
      .addCase(searchPosts.pending, (state) => {
        state.loading.posts = true
        state.error.posts = null
      })
      .addCase(searchPosts.fulfilled, (state, action) => {
        state.loading.posts = false
        state.postResults = action.payload.posts || []
        state.error.posts = null
      })
      .addCase(searchPosts.rejected, (state, action) => {
        state.loading.posts = false
        state.error.posts = action.payload as string
      })

    // Search users
    builder
      .addCase(searchUsers.pending, (state) => {
        state.loading.users = true
        state.error.users = null
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.loading.users = false
        state.userResults = action.payload.users || []
        state.error.users = null
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.loading.users = false
        state.error.users = action.payload as string
      })

    // Fetch genres
    builder
      .addCase(fetchGenres.pending, (state) => {
        state.genresLoading = true
        state.genresError = null
      })
      .addCase(fetchGenres.fulfilled, (state, action) => {
        state.genresLoading = false
        state.genresError = null
        if (action.payload.success) {
          state.genres = action.payload.data
        }
      })
      .addCase(fetchGenres.rejected, (state, action) => {
        state.genresLoading = false
        state.genresError = action.payload as string
      })
  }
})

export const { 
  setQuery, 
  setActiveTab, 
  setFilters, 
  clearSearch,
  clearResults 
} = searchSlice.actions

export default searchSlice.reducer

