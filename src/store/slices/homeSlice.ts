import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import HomeApiService from '@/services/homeApi'

// Types
interface HomeState {
  sliderData: any[]
  typeAData: any[]
  typeBData: any[]
  loading: boolean
  error: string | null
  hasFetchedData: boolean
}

// Initial state
const initialState: HomeState = {
  sliderData: [],
  typeAData: [],
  typeBData: [],
  loading: false,
  error: null,
  hasFetchedData: false
}

// Async thunks following MedQwik pattern
export const loadHomeData = createAsyncThunk(
  'home/loadHomeData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await HomeApiService.getHomeData()
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to load home data')
      }

      return response.data
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const loadProfileData = createAsyncThunk(
  'home/loadProfileData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await HomeApiService.getProfile()
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to load profile data')
      }

      return response.data
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

// Home slice
const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {
    clearHomeData: (state) => {
      state.sliderData = []
      state.typeAData = []
      state.typeBData = []
      state.hasFetchedData = false
      state.error = null
    },
    setFetchedData: (state, action) => {
      state.hasFetchedData = action.payload
    },
    clearHomeError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    // Load home data
    builder
      .addCase(loadHomeData.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadHomeData.fulfilled, (state, action) => {
        state.loading = false
        state.sliderData = action.payload.sliderData || []
        state.typeAData = action.payload.typeAData || []
        state.typeBData = action.payload.typeBData || []
        state.hasFetchedData = true
        state.error = null
      })
      .addCase(loadHomeData.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Load profile data
    builder
      .addCase(loadProfileData.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadProfileData.fulfilled, (state, action) => {
        state.loading = false
        // Profile data is handled by mypage slice
        state.error = null
      })
      .addCase(loadProfileData.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  }
})

export const { clearHomeData, setFetchedData, clearHomeError } = homeSlice.actions
export default homeSlice.reducer