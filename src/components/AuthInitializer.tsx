'use client'

// React Imports
import { useEffect } from 'react'

// Redux Imports
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { checkAuthStatus, clearAuth } from '@/store/slices/authSlice'

// Utils Imports
import { isTokenExpired } from '@/utils/auth'

const AuthInitializer = () => {
  const dispatch = useAppDispatch()
  const { isAuthenticated, token, loading } = useAppSelector((state) => state.authReducer)

  useEffect(() => {
    // Only run this effect once when the component mounts
    const initializeAuth = async () => {
      // If no token, clear auth and exit
      if (!token) {
        dispatch(clearAuth())
        return
      }

      // First check if token is expired locally
      if (isTokenExpired(token)) {
        // Token is expired, clear auth state
        dispatch(clearAuth())
        return
      }

      // ALWAYS verify with server on mount (even if isAuthenticated is true from storage)
      // This handles cases where user was deleted from DB but token is still valid
      try {
        await dispatch(checkAuthStatus()).unwrap()
        // User exists in DB and token is valid ✓
      } catch (error) {
        // Server validation failed - user deleted, token invalid, or network error
        // Auth verification failed, logging out
        dispatch(clearAuth())
      }
    }

    initializeAuth()
  }, []) // Empty dependency array - only run once on mount

  return null // This component doesn't render anything
}

export default AuthInitializer
