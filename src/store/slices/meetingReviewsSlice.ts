import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { meetingsApi, MeetingReview, ReviewsResponse } from '@/services/meetingsApi'

interface MeetingReviewsState {
  reviews: MeetingReview[]
  averageRating: number
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  loading: boolean
  error: string | null
}

const initialState: MeetingReviewsState = {
  reviews: [],
  averageRating: 0,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  },
  loading: false,
  error: null
}

// Fetch meeting reviews
export const fetchMeetingReviews = createAsyncThunk(
  'meetingReviews/fetchMeetingReviews',
  async (params: { meetingId: number; page?: number; limit?: number }, { rejectWithValue }) => {
    try {
      const { meetingId, page = 1, limit = 10 } = params
      const reviewsData = await meetingsApi.getMeetingReviews(meetingId, page, limit)

      if (!reviewsData) {
        return rejectWithValue('Failed to fetch reviews data')
      }

      // Return the data portion directly, not the full API response
      return reviewsData
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

const meetingReviewsSlice = createSlice({
  name: 'meetingReviews',
  initialState,
  reducers: {
    clearMeetingReviews: (state) => {
      state.reviews = []
      state.averageRating = 0
      state.pagination = {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      }
      state.loading = false
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMeetingReviews.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMeetingReviews.fulfilled, (state, action) => {
        // Handle double nesting: action.payload.data.data contains the actual reviews data
        const reviewsData = action.payload.data || action.payload
        state.loading = false
        state.reviews = reviewsData.reviews || []
        state.averageRating = reviewsData.averageRating || 0
        state.pagination = reviewsData.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
        state.error = null
      })
      .addCase(fetchMeetingReviews.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  }
})

export const { clearMeetingReviews } = meetingReviewsSlice.actions
export default meetingReviewsSlice.reducer
