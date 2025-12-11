// Third-party Imports
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { createTransform } from 'redux-persist'

// Slice Imports
import authReducer from './slices/authSlice'
import homeReducer from './slices/homeSlice'
import mypageReducer from './slices/mypageSlice'
import feedReducer from './slices/feedSlice'
import postReducer from './slices/postSlice'
import userReducer from './slices/userSlice'
import meetingDetailReducer from './slices/meetingDetailSlice'
import meetingReviewsReducer from './slices/meetingReviewsSlice'
import searchReducer from './slices/searchSlice'

// Combine all reducers first
const rootReducer = combineReducers({
  authReducer,
  homeReducer,
  mypageReducer,
  feedReducer,
  postReducer,
  userReducer,
  meetingDetailReducer,
  meetingReviewsReducer,
  searchReducer,
})


// Create a custom storage wrapper with error handling
const createSafeStorage = () => {
  return {
    getItem: async (key: string) => {
      try {
        return await storage.getItem(key)
      } catch (error) {
        return null
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        await storage.setItem(key, value)
      } catch (error) {
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          // Clear specific keys to free up space
          try {
            await storage.removeItem('persist:noldam-root')
            await storage.removeItem('noldam-root')
            // Try again after clearing
            await storage.setItem(key, value)
          } catch (retryError) {
            // Failed to save even after clearing
          }
        } else {
          // Error writing to storage
        }
      }
    },
    removeItem: async (key: string) => {
      try {
        await storage.removeItem(key)
      } catch (error) {
        // Error removing from storage
      }
    }
  }
}

// Transform for mypage reducer - strip large data before saving to storage
const mypageTransform = createTransform(
  // Transform state on the way to being serialized and persisted (OUT)
  (inboundState: any, key) => {
    if (key === 'mypageReducer') {
      // Only keep essential, small data
      return {
        activeTab: inboundState.activeTab || 'posts',
        likedPosts: (inboundState.likedPosts || []).slice(0, 100), // Limit to 100 items
        likedComments: (inboundState.likedComments || []).slice(0, 100), // Limit to 100 items
        // Don't persist large data
        profileData: null,
        summaryData: null,
        feedData: null,
        meetingsData: [],
        badgesData: [],
        // Reset loading/error states
        profileLoading: false,
        summaryLoading: false,
        feedLoading: false,
        meetingsLoading: false,
        badgesLoading: false,
        profileError: null,
        summaryError: null,
        feedError: null,
        meetingsError: null,
        badgesError: null,
        hasFetched: false
      }
    }
    return inboundState
  },
  // Transform state being rehydrated (IN) - return as-is since we already filtered
  (outboundState: any, key) => {
    return outboundState
  },
  { whitelist: ['mypageReducer'] }
)

// Transform for auth reducer - keep it minimal
const authTransform = createTransform(
  // OUT - save only token and minimal user data
  (inboundState: any, key) => {
    if (key === 'authReducer') {
      return {
        token: inboundState.token,
        user: inboundState.user ? {
          id: inboundState.user.id,
          userId: inboundState.user.userId,
          uid: inboundState.user.uid,
          userUuid: inboundState.user.userUuid,
          phoneNumber: inboundState.user.phoneNumber,
          nickname: inboundState.user.nickname
        } : null,
        isAuthenticated: inboundState.isAuthenticated,
        loading: false,
        error: null
      }
    }
    return inboundState
  },
  // IN - return as-is
  (outboundState: any, key) => {
    return outboundState
  },
  { whitelist: ['authReducer'] }
)

// Persist configuration
const persistConfig = {
  key: 'noldam-root',
  storage: createSafeStorage(),
  whitelist: ['authReducer', 'mypageReducer'], // Persist auth and mypage data
  blacklist: ['homeReducer', 'feedReducer', 'postReducer', 'userReducer', 'meetingDetailReducer', 'meetingReviewsReducer', 'searchReducer'], // Don't persist other data
  transforms: [authTransform, mypageTransform],
  // Throttle writes to reduce frequency
  throttle: 1000
}

// Create persisted reducer
// @ts-ignore - persistReducer type compatibility with Redux Toolkit
const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer as any,
  middleware: getDefaultMiddleware => 
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredPaths: ['_persist']
      }
    })
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
