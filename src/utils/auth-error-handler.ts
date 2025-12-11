/**
 * Utility function to handle authentication errors and automatic logout
 */

import { clearAuth } from '@/store/slices/authSlice'

export interface AuthErrorHandlerOptions {
  dispatch: any
  router: any
  response: Response
  errorText: string
}

/**
 * Handles authentication errors, specifically user not found (404) errors
 * Automatically logs out the user and redirects to login page
 * @param options - The error handler options
 * @returns true if user was logged out, false otherwise
 */
export const handleAuthError = (options: AuthErrorHandlerOptions): boolean => {
  const { dispatch, router, response, errorText } = options

  // Check if user not found (404) and trigger automatic logout
  if (response.status === 404) {
    try {
      const errorData = JSON.parse(errorText)
      if (errorData.reason === 'User not found') {
        dispatch(clearAuth())
        router.push('/login')
        return true
      }
    } catch (parseError) {
      // If JSON parsing fails, still check for user not found in text
      if (errorText.includes('User not found')) {
        dispatch(clearAuth())
        router.push('/login')
        return true
      }
    }
  }

  return false
}
