import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import AuthApiService from '@/services/authApi'
import type { User, AuthState } from '@/services/types/frontend'

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  // Login flow states
  otpLoading: false,
  otpError: null,
  verificationLoading: false,
  verificationError: null,
  loginLoading: false,
  loginError: null,
  registerLoading: false,
  registerError: null,
  nicknameChecking: false,
  nicknameError: null,
  nicknameAvailable: null,
  profileUpdateLoading: false,
  profileUpdateError: null,
  categoriesLoading: false,
  categoriesError: null,
  categories: [],
  citiesLoading: false,
  citiesError: null,
  provinces: [],
  cities: []
}

// Async thunks following MedQwik pattern
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (userData: { phoneNumber: string; nickname: string }, { rejectWithValue }) => {
    try {
      const response = await AuthApiService.login(userData)
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Login failed')
      }

      return response.data
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData: { phoneNumber: string }, { rejectWithValue }) => {
    try {
      const response = await AuthApiService.register(userData)
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Registration failed')
      }

      return response.data
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await AuthApiService.logout()
      
      if (!response.success) {
        return rejectWithValue('Logout failed')
      }

      return null
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

// Send OTP
export const sendOtp = createAsyncThunk(
  'auth/sendOtp',
  async (phoneNumber: string, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber,
          module: 'LOGIN'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        return rejectWithValue(data.reason || '인증번호 전송에 실패했습니다.')
      }

      return data
    } catch (error) {
      return rejectWithValue('Failed to send OTP. Please try again.')
    }
  }
)

// Verify OTP
export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ phoneNumber, code }: { phoneNumber: string; code: string }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, code })
      })

      const data = await response.json()

      if (!response.ok) {
        return rejectWithValue(data.reason || '인증번호 확인에 실패했습니다.')
      }

      return data
    } catch (error) {
      return rejectWithValue('Failed to verify OTP. Please try again.')
    }
  }
)

// Login by phone
export const loginByPhone = createAsyncThunk(
  'auth/loginByPhone',
  async (phoneNumber: string, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/login-by-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      })

      const data = await response.json()

      if (!response.ok) {
        return rejectWithValue(data.reason || 'Failed to check user status')
      }

      return data
    } catch (error) {
      return rejectWithValue('Failed to check user status. Please try again.')
    }
  }
)

// Register new user
export const registerNewUser = createAsyncThunk(
  'auth/registerNewUser',
  async (phoneNumber: string, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      })

      const data = await response.json()

      if (!response.ok) {
        return rejectWithValue(data.reason || 'Failed to create account')
      }

      return data
    } catch (error) {
      return rejectWithValue('Failed to create account. Please try again.')
    }
  }
)

// Check nickname availability
export const checkNicknameAvailability = createAsyncThunk(
  'auth/checkNicknameAvailability',
  async ({ nickname, token }: { nickname: string; token?: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/users/check-nickname?nickname=${encodeURIComponent(nickname)}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })

      const data = await response.json()

      if (!response.ok) {
        return rejectWithValue(data.reason || '닉네임 확인 중 오류가 발생했습니다.')
      }

      return data
    } catch (error) {
      return rejectWithValue('닉네임 확인 중 오류가 발생했습니다.')
    }
  }
)

// Update user profile
export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async ({ updateData, token }: { updateData: any; token: string }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      })

      const data = await response.json()

      if (!response.ok) {
        return rejectWithValue(data.reason || '프로필 업데이트에 실패했습니다.')
      }

      return data
    } catch (error) {
      return rejectWithValue('프로필 업데이트 중 오류가 발생했습니다.')
    }
  }
)

// Update user categories
export const updateUserCategories = createAsyncThunk(
  'auth/updateUserCategories',
  async ({ userId, categories, token }: { userId: string | number; categories: number[]; token: string }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          categories
        })
      })

      const data = await response.json()

      if (!response.ok) {
        return rejectWithValue(data.reason || '관심사 업데이트에 실패했습니다.')
      }

      return data
    } catch (error) {
      return rejectWithValue('회원가입 중 오류가 발생했습니다.')
    }
  }
)

// Fetch categories
export const fetchCategories = createAsyncThunk(
  'auth/fetchCategories',
  async (token: string | undefined, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/categories', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })

      const data = await response.json()

      if (!response.ok) {
        return rejectWithValue(data.reason || 'Failed to fetch categories')
      }

      return data
    } catch (error) {
      return rejectWithValue('Failed to fetch categories')
    }
  }
)

// Fetch cities and provinces
export const fetchCities = createAsyncThunk(
  'auth/fetchCities',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/cities')

      const data = await response.json()

      if (!response.ok) {
        return rejectWithValue(data.reason || 'Failed to fetch cities')
      }

      return data
    } catch (error) {
      return rejectWithValue('Failed to fetch cities')
    }
  }
)

// Check if user is authenticated on app startup
export const checkAuthStatus = createAsyncThunk(
  'auth/checkAuthStatus',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any
      const token = state.authReducer?.token

      if (!token) {
        return rejectWithValue('No token found')
      }

      const response = await AuthApiService.checkAuthStatus()
      
      if (!response.success) {
        
        if (response.error?.includes('401') || response.error?.includes('Unauthorized')) {
          return rejectWithValue('Token expired or invalid')
        }
        if (response.error?.includes('404') || response.error?.includes('not found')) {
          return rejectWithValue('User not found in database')
        }
        return rejectWithValue(response.error || 'Token validation failed')
      }

      return response.data
    } catch (error) {
      return rejectWithValue('Token validation failed')
    }
  }
)

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      state.isAuthenticated = true
      state.error = null
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload
      // Redux-persist will handle localStorage automatically
    },
    clearError: (state) => {
      state.error = null
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    clearAuth: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.error = null
      // Redux-persist will handle localStorage clearing automatically
    }
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.error = null
        // Redux-persist will handle localStorage automatically
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.error = null
        // Redux-persist will handle localStorage automatically
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.error = null
        // Redux-persist will handle localStorage automatically
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.error = action.payload as string
      })

    // Check auth status
    builder
      .addCase(checkAuthStatus.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.loading = false
        // The /users/profile endpoint returns { success: true, data: { user: {...} } }
        // We need to extract the user data from the response
        const userData = action.payload?.data?.user || action.payload
        state.user = userData
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.loading = false
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.error = action.payload as string
      })

    // Send OTP
    builder
      .addCase(sendOtp.pending, (state) => {
        state.otpLoading = true
        state.otpError = null
      })
      .addCase(sendOtp.fulfilled, (state) => {
        state.otpLoading = false
        state.otpError = null
      })
      .addCase(sendOtp.rejected, (state, action) => {
        state.otpLoading = false
        state.otpError = action.payload as string
      })

    // Verify OTP
    builder
      .addCase(verifyOtp.pending, (state) => {
        state.verificationLoading = true
        state.verificationError = null
      })
      .addCase(verifyOtp.fulfilled, (state) => {
        state.verificationLoading = false
        state.verificationError = null
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.verificationLoading = false
        state.verificationError = action.payload as string
      })

    // Login by phone
    builder
      .addCase(loginByPhone.pending, (state) => {
        state.loginLoading = true
        state.loginError = null
      })
      .addCase(loginByPhone.fulfilled, (state, action) => {
        state.loginLoading = false
        state.loginError = null
        if (action.payload.success && action.payload.data) {
          state.user = action.payload.data.user
          state.token = action.payload.data.token
          state.isAuthenticated = true
        }
      })
      .addCase(loginByPhone.rejected, (state, action) => {
        state.loginLoading = false
        state.loginError = action.payload as string
      })

    // Register new user
    builder
      .addCase(registerNewUser.pending, (state) => {
        state.registerLoading = true
        state.registerError = null
      })
      .addCase(registerNewUser.fulfilled, (state) => {
        state.registerLoading = false
        state.registerError = null
      })
      .addCase(registerNewUser.rejected, (state, action) => {
        state.registerLoading = false
        state.registerError = action.payload as string
      })

    // Check nickname availability
    builder
      .addCase(checkNicknameAvailability.pending, (state) => {
        state.nicknameChecking = true
        state.nicknameError = null
      })
      .addCase(checkNicknameAvailability.fulfilled, (state, action) => {
        state.nicknameChecking = false
        state.nicknameError = null
        if (action.payload.success) {
          state.nicknameAvailable = action.payload.data.available
        }
      })
      .addCase(checkNicknameAvailability.rejected, (state, action) => {
        state.nicknameChecking = false
        state.nicknameError = action.payload as string
        state.nicknameAvailable = false
      })

    // Update user profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.profileUpdateLoading = true
        state.profileUpdateError = null
      })
      .addCase(updateUserProfile.fulfilled, (state) => {
        state.profileUpdateLoading = false
        state.profileUpdateError = null
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.profileUpdateLoading = false
        state.profileUpdateError = action.payload as string
      })

    // Update user categories
    builder
      .addCase(updateUserCategories.pending, (state) => {
        state.profileUpdateLoading = true
        state.profileUpdateError = null
      })
      .addCase(updateUserCategories.fulfilled, (state) => {
        state.profileUpdateLoading = false
        state.profileUpdateError = null
      })
      .addCase(updateUserCategories.rejected, (state, action) => {
        state.profileUpdateLoading = false
        state.profileUpdateError = action.payload as string
      })

    // Fetch categories
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.categoriesLoading = true
        state.categoriesError = null
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categoriesLoading = false
        state.categoriesError = null
        if (action.payload.success) {
          state.categories = action.payload.data
        }
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.categoriesLoading = false
        state.categoriesError = action.payload as string
      })

    // Fetch cities
    builder
      .addCase(fetchCities.pending, (state) => {
        state.citiesLoading = true
        state.citiesError = null
      })
      .addCase(fetchCities.fulfilled, (state, action) => {
        state.citiesLoading = false
        state.citiesError = null
        if (action.payload.success) {
          state.provinces = action.payload.data.provinces || []
          state.cities = action.payload.data.cities || []
        }
      })
      .addCase(fetchCities.rejected, (state, action) => {
        state.citiesLoading = false
        state.citiesError = action.payload as string
      })
  }
})

export const { setUser, setToken, clearError, setLoading, clearAuth } = authSlice.actions
export default authSlice.reducer
