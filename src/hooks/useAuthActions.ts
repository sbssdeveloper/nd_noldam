import React from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { 
  sendOtp,
  verifyOtp,
  loginByPhone,
  registerNewUser,
  checkNicknameAvailability,
  updateUserProfile,
  updateUserCategories,
  fetchCategories,
  fetchCities,
  setUser,
  setToken,
  clearError
} from '@/store/slices/authSlice'

export const useAuthActions = () => {
  const dispatch = useAppDispatch()
  const { 
    user,
    token,
    isAuthenticated,
    loading,
    error,
    // Login flow states
    otpLoading,
    otpError,
    verificationLoading,
    verificationError,
    loginLoading,
    loginError,
    registerLoading,
    registerError,
    nicknameChecking,
    nicknameError,
    nicknameAvailable,
    profileUpdateLoading,
    profileUpdateError,
    categoriesLoading,
    categoriesError,
    categories,
    citiesLoading,
    citiesError,
    provinces,
    cities
  } = useAppSelector((state) => state.authReducer)

  // Send OTP
  const handleSendOtp = React.useCallback((phoneNumber: string) => {
    return dispatch(sendOtp(phoneNumber))
  }, [dispatch])

  // Verify OTP
  const handleVerifyOtp = React.useCallback((phoneNumber: string, code: string) => {
    return dispatch(verifyOtp({ phoneNumber, code }))
  }, [dispatch])

  // Login by phone
  const handleLoginByPhone = React.useCallback((phoneNumber: string) => {
    return dispatch(loginByPhone(phoneNumber))
  }, [dispatch])

  // Register new user
  const handleRegisterNewUser = React.useCallback((phoneNumber: string) => {
    return dispatch(registerNewUser(phoneNumber))
  }, [dispatch])

  // Check nickname availability
  const handleCheckNicknameAvailability = React.useCallback((nickname: string) => {
    return dispatch(checkNicknameAvailability({ nickname, token }))
  }, [dispatch, token])

  // Update user profile
  const handleUpdateUserProfile = React.useCallback((updateData: any) => {
    if (!token) {
      throw new Error('No token available')
    }
    return dispatch(updateUserProfile({ updateData, token }))
  }, [dispatch, token])

  // Update user categories
  const handleUpdateUserCategories = React.useCallback((userId: string | number, categories: number[]) => {
    if (!token) {
      throw new Error('No token available')
    }
    return dispatch(updateUserCategories({ userId, categories, token }))
  }, [dispatch, token])

  // Fetch categories
  const handleFetchCategories = React.useCallback(() => {
    return dispatch(fetchCategories(token || undefined))
  }, [dispatch, token])

  // Fetch cities
  const handleFetchCities = React.useCallback(() => {
    return dispatch(fetchCities())
  }, [dispatch])

  // Set user and token manually
  const handleSetUser = React.useCallback((user: any) => {
    dispatch(setUser(user))
  }, [dispatch])

  const handleSetToken = React.useCallback((token: string) => {
    dispatch(setToken(token))
  }, [dispatch])

  // Clear errors
  const handleClearError = React.useCallback(() => {
    dispatch(clearError())
  }, [dispatch])

  return {
    // Data
    user,
    token,
    isAuthenticated,
    categories,
    provinces,
    cities,
    
    // Loading states
    loading,
    otpLoading,
    verificationLoading,
    loginLoading,
    registerLoading,
    nicknameChecking,
    profileUpdateLoading,
    categoriesLoading,
    citiesLoading,
    
    // Error states
    error,
    otpError,
    verificationError,
    loginError,
    registerError,
    nicknameError,
    nicknameAvailable,
    profileUpdateError,
    categoriesError,
    citiesError,
    
    // Actions
    sendOtp: handleSendOtp,
    verifyOtp: handleVerifyOtp,
    loginByPhone: handleLoginByPhone,
    registerNewUser: handleRegisterNewUser,
    checkNicknameAvailability: handleCheckNicknameAvailability,
    updateUserProfile: handleUpdateUserProfile,
    updateUserCategories: handleUpdateUserCategories,
    fetchCategories: handleFetchCategories,
    fetchCities: handleFetchCities,
    setUser: handleSetUser,
    setToken: handleSetToken,
    clearError: handleClearError
  }
}
