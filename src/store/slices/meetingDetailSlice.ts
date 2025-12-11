import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { meetingsApi } from '@/services/meetingsApi'

interface MeetingDetailState {
  meetingData: any | null
  loading: boolean
  error: string | null
}

const initialState: MeetingDetailState = {
  meetingData: null,
  loading: false,
  error: null
}

// Fetch meeting detail - single API call that includes category and activity names
export const fetchMeetingDetail = createAsyncThunk(
  'meetingDetail/fetchMeetingDetail',
  async (meetingId: number, { rejectWithValue }) => {
    try {
      const meetingData = await meetingsApi.getMeetingDetails(meetingId)

      if (!meetingData) {
        return rejectWithValue('Failed to fetch meeting data')
      }

      return { meetingData }
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

const meetingDetailSlice = createSlice({
  name: 'meetingDetail',
  initialState,
  reducers: {
    clearMeetingDetail: (state) => {
      state.meetingData = null
      state.loading = false
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMeetingDetail.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMeetingDetail.fulfilled, (state, action) => {
        state.loading = false
        state.meetingData = action.payload.meetingData
        state.error = null
      })
      .addCase(fetchMeetingDetail.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  }
})

export const { clearMeetingDetail } = meetingDetailSlice.actions
export default meetingDetailSlice.reducer

