import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import type { Group, GroupState } from '@/services/types/frontend'
import { apiGetWithStore, apiPostWithStore } from '@/utils/api'

// Initial state
const initialState: GroupState = {
  groups: [],
  currentGroup: null,
  loading: false,
  error: null,
  filters: {}
}

// Async thunks
export const fetchGroups = createAsyncThunk(
  'group/fetchGroups',
  async (filters: { category?: string; isPrivate?: boolean } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams()

      if (filters?.category) params.append('category', filters.category)
      if (filters?.isPrivate !== undefined) params.append('isPrivate', filters.isPrivate.toString())

      const response = await apiGetWithStore(`/api/groups?${params.toString()}`)
      const data = await response.json()

      return data
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const createGroup = createAsyncThunk(
  'group/createGroup',
  async (groupData: Omit<Group, 'id' | 'createdAt' | 'updatedAt' | 'creator' | 'members' | '_count'>, { rejectWithValue }) => {
    try {
      const response = await apiPostWithStore('/api/groups', groupData)
      const data = await response.json()

      if (!response.ok) {
        return rejectWithValue(data.message || 'Failed to create group')
      }

      return data
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const joinGroup = createAsyncThunk(
  'group/joinGroup',
  async (groupId: string, { rejectWithValue }) => {
    try {
      const response = await apiPostWithStore(`/api/groups/${groupId}/join`, {})
      const data = await response.json()

      if (!response.ok) {
        return rejectWithValue(data.message || 'Failed to join group')
      }

      return { groupId, member: data }
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const leaveGroup = createAsyncThunk(
  'group/leaveGroup',
  async (groupId: string, { rejectWithValue }) => {
    try {
      const response = await apiPostWithStore(`/api/groups/${groupId}/leave`, {})

      if (!response.ok) {
        const data = await response.json()
        return rejectWithValue(data.message || 'Failed to leave group')
      }

      return groupId
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

// Group slice
const groupSlice = createSlice({
  name: 'group',
  initialState,
  reducers: {
    setCurrentGroup: (state, action: PayloadAction<Group | null>) => {
      state.currentGroup = action.payload
    },
    setFilters: (state, action: PayloadAction<{ category?: string; isPrivate?: boolean }>) => {
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
    // Fetch groups
    builder
      .addCase(fetchGroups.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.loading = false
        state.groups = action.payload
        state.error = null
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Create group
    builder
      .addCase(createGroup.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.loading = false
        state.groups.unshift(action.payload)
        state.error = null
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Join group
    builder
      .addCase(joinGroup.fulfilled, (state, action) => {
        const group = state.groups.find(g => g.id === action.payload.groupId)

        if (group) {
          group.members.push(action.payload.member)
          if (group._count) {
            group._count.members += 1
          }
        }

        if (state.currentGroup?.id === action.payload.groupId) {
          state.currentGroup.members.push(action.payload.member)
          if (state.currentGroup._count) {
            state.currentGroup._count.members += 1
          }
        }
      })

    // Leave group
    builder
      .addCase(leaveGroup.fulfilled, (state, action) => {
        const group = state.groups.find(g => g.id === action.payload)

        if (group) {
          // Remove current user from members (we'll get the userId from the response)
          if (group._count) {
            group._count.members -= 1
          }
        }

        if (state.currentGroup?.id === action.payload) {
          // Remove current user from members (we'll get the userId from the response)
          if (state.currentGroup._count) {
            state.currentGroup._count.members -= 1
          }
        }
      })
  }
})

export const { setCurrentGroup, setFilters, clearFilters, clearError, setLoading } = groupSlice.actions
export default groupSlice.reducer
