import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import type { Event, EventState } from '@/services/types/frontend'
import { apiGetWithStore, apiPostWithStore } from '@/utils/api'

// Initial state
const initialState: EventState = {
  events: [],
  currentEvent: null,
  loading: false,
  error: null,
  filters: {}
}

// Async thunks
export const fetchEvents = createAsyncThunk(
  'event/fetchEvents',
  async (filters: { category?: string; location?: string; date?: string } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams()

      if (filters?.category) params.append('category', filters.category)
      if (filters?.location) params.append('location', filters.location)
      if (filters?.date) params.append('date', filters.date)

      const response = await apiGetWithStore(`/api/events?${params.toString()}`)
      const data = await response.json()

      return data
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const createEvent = createAsyncThunk(
  'event/createEvent',
  async (eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'creator' | 'members' | '_count'>, { rejectWithValue }) => {
    try {
      const response = await apiPostWithStore('/api/events', eventData)
      const data = await response.json()

      if (!response.ok) {
        return rejectWithValue(data.message || 'Failed to create event')
      }

      return data
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const joinEvent = createAsyncThunk(
  'event/joinEvent',
  async (eventId: string, { rejectWithValue }) => {
    try {
      const response = await apiPostWithStore(`/api/events/${eventId}/join`, {})
      const data = await response.json()

      if (!response.ok) {
        return rejectWithValue(data.message || 'Failed to join event')
      }

      return { eventId, member: data }
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const leaveEvent = createAsyncThunk(
  'event/leaveEvent',
  async (eventId: string, { rejectWithValue }) => {
    try {
      const response = await apiPostWithStore(`/api/events/${eventId}/leave`, {})

      if (!response.ok) {
        const data = await response.json()
        return rejectWithValue(data.message || 'Failed to leave event')
      }

      return eventId
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

// Event slice
const eventSlice = createSlice({
  name: 'event',
  initialState,
  reducers: {
    setCurrentEvent: (state, action: PayloadAction<Event | null>) => {
      state.currentEvent = action.payload
    },
    setFilters: (state, action: PayloadAction<{ category?: string; location?: string; date?: string }>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    clearFilters: (state) => {
      state.filters = {}
    },
    clearError: (state) => {
      state.error = null
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    }
  },
  extraReducers: (builder) => {
    // Fetch events
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.loading = false
        state.events = action.payload
        state.error = null
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Create event
    builder
      .addCase(createEvent.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.loading = false
        state.events.unshift(action.payload)
        state.error = null
      })
      .addCase(createEvent.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Join event
    builder
      .addCase(joinEvent.fulfilled, (state, action) => {
        const event = state.events.find(e => e.id === action.payload.eventId)

        if (event) {
          event.members.push(action.payload.member)
          if (event._count) {
            event._count.members += 1
          }
        }

        if (state.currentEvent?.id === action.payload.eventId) {
          state.currentEvent.members.push(action.payload.member)
          if (state.currentEvent._count) {
            state.currentEvent._count.members += 1
          }
        }
      })

    // Leave event
    builder
      .addCase(leaveEvent.fulfilled, (state, action) => {
        const event = state.events.find(e => e.id === action.payload)

        if (event) {
          // Remove current user from members (we'll get the userId from the response)
          if (event._count) {
            event._count.members -= 1
          }
        }

        if (state.currentEvent?.id === action.payload) {
          // Remove current user from members (we'll get the userId from the response)
          if (state.currentEvent._count) {
            state.currentEvent._count.members -= 1
          }
        }
      })
  }
})

export const { setCurrentEvent, setFilters, clearFilters, clearError, setLoading } = eventSlice.actions
export default eventSlice.reducer
