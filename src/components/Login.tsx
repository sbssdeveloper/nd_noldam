'use client'

// React Imports
import { useState, useEffect, useRef, useCallback } from 'react'

// Next Imports
import { useRouter, useSearchParams } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import Image from 'next/image'
import Link from 'next/link'

// NextAuth Imports
import { signIn } from 'next-auth/react'

// MUI Imports
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Autocomplete from '@mui/material/Autocomplete'

// Hook Imports
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loginUser, setToken, setUser } from '@/store/slices/authSlice'
import { useAuthActions } from '@/hooks/useAuthActions'
import { apiCall } from '@/utils/api'

// Utility Imports
import { compressImage } from '@/utils/imageCompression'

// Types
import type { LoginStep, UserData } from '@/services/types/frontend'

// South Korea Cities types
interface City {
  id: number
  name: string
  provinceId: number
}

interface Province {
  id: number
  name: string
}

const Login = () => {
  // States
  const [currentStep, setCurrentStep] = useState<LoginStep>('welcome')
  const [userData, setUserData] = useState<UserData>({
    phoneNumber: '',
    verificationCode: '',
    nickname: '',
    statusMessage: '',
    province: '',
    city: '',
    categories: []
  })
  const [profileImage, setProfileImage] = useState<string>('')
  const [allCities, setAllCities] = useState<City[]>([])
  const [filteredCities, setFilteredCities] = useState<City[]>([])
  const [selectedProvince, setSelectedProvince] = useState<Province | string | undefined>('')
  const [selectedCity, setSelectedCity] = useState<City | string | undefined>('')
  const [provinceSearchValue, setProvinceSearchValue] = useState('')
  const [citySearchValue, setCitySearchValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showResendHelp, setShowResendHelp] = useState(false)
  const [isExistingUser, setIsExistingUser] = useState(false)
  const [showPhoneCursor, setShowPhoneCursor] = useState(false)
  const [showOtpCursor, setShowOtpCursor] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)

  // Simplified refs
  const mountedRef = useRef(true)
  const phoneInputRef = useRef<HTMLInputElement | null>(null)
  const otpHiddenInputRef = useRef<HTMLInputElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const nicknameCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isCheckingNicknameRef = useRef(false)
  const categoriesFetchedRef = useRef(false)
  const editModeInitializedRef = useRef(false)

  // Hooks
  const router = useRouter()
  const searchParams = useSearchParams()
  const { navigate } = useNavigation()
  const dispatch = useAppDispatch()
  const { user, loading, isAuthenticated, token } = useAppSelector((state: any) => state.authReducer)

  // Check for edit mode from query params
  const isEditMode = searchParams?.get('edit') === 'true'
  const returnToUrl = searchParams?.get('returnTo') || '/'

  // Use centralized auth actions
  const {
    // Data
    categories: categoriesRaw,
    provinces: provincesRaw,
    cities: citiesRaw,

    // Loading states
    otpLoading,
    verificationLoading,
    loginLoading,
    registerLoading,
    nicknameChecking,
    profileUpdateLoading,
    categoriesLoading,
    citiesLoading,

    // Error states
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
    sendOtp,
    verifyOtp,
    loginByPhone,
    registerNewUser,
    checkNicknameAvailability,
    updateUserProfile,
    updateUserCategories,
    fetchCategories,
    fetchCities,
    setUser: setUserAction,
    setToken: setTokenAction,
    clearError
  } = useAuthActions()

  // Centralized busy flag to prevent double submissions during any async call
  const isBusy = isLoading || otpLoading || verificationLoading || loginLoading || registerLoading || profileUpdateLoading || categoriesLoading

  // Defensive fallbacks to avoid undefined.length access during early renders
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : []
  const provinces = Array.isArray(provincesRaw) ? provincesRaw : []
  const cities = Array.isArray(citiesRaw) ? citiesRaw : []

  // Simplified step transition function with Google Translate compatibility
  const safeSetStep = useCallback((newStep: LoginStep) => {
    if (!mountedRef.current) return

    try {
      // Use double requestAnimationFrame for better timing with React's rendering cycle
      // This gives Google Translate time to finish DOM manipulations before React re-renders
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (mountedRef.current) {
            try {
              setCurrentStep(newStep)
            } catch (error) {
              // Error setting step state
            }
          }
        })
      })
    } catch (error) {
      // Error in safeSetStep
    }
  }, [])

  // Global error handler for DOM errors (especially for Google Translate compatibility)
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.error && (
        (event.error.name === 'NotFoundError' && event.error.message.includes('removeChild')) ||
        (event.error.name === 'NotFoundError' && event.error.message.includes('appendChild')) ||
        (event.error.name === 'NotFoundError' && event.error.message.includes('insertBefore')) ||
        (event.error.message && (
          event.error.message.includes('removeChild') ||
          event.error.message.includes('appendChild') ||
          event.error.message.includes('insertBefore') ||
          event.error.message.includes('not a child')
        ))
      )) {
        // DOM manipulation error caught and handled (likely from translation)
        event.preventDefault()
        event.stopPropagation()
        return false
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.message && (
        event.reason.message.includes('removeChild') ||
        event.reason.message.includes('appendChild') ||
        event.reason.message.includes('insertBefore') ||
        event.reason.message.includes('not a child')
      )) {
        // DOM manipulation promise rejection caught and handled (likely from translation)
        event.preventDefault()
        return false
      }
    }

    window.addEventListener('error', handleGlobalError, true) // Use capture phase
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleGlobalError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  // Simplified cleanup effect
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false

      // Clear any pending nickname check timeout
      if (nicknameCheckTimeoutRef.current) {
        clearTimeout(nicknameCheckTimeoutRef.current)
        nicknameCheckTimeoutRef.current = null
      }

      // Abort any pending fetch requests
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort()
        } catch (error) {
          // Error aborting controller
        }
        abortControllerRef.current = null
      }
    }
  }, [])

  // Fetch categories from API when interests step is reached
  useEffect(() => {
    if (currentStep === 'interests' && !categoriesFetchedRef.current) {
      categoriesFetchedRef.current = true
      fetchCategories()
    }
  }, [currentStep, fetchCategories])

  // Update categoryOptions when Redux categories data changes
  const categoriesLength = (categories?.length || 0)
  useEffect(() => {
    if (categoriesLength > 0) {
      setCategoryOptions(categories)
    }
  }, [categoriesLength])

  // Global error boundary for DOM manipulation errors
  // Error handling removed - using React state instead of DOM manipulation



  // Format phone number with hyphens
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return ''
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`
  }

  // Basic validation functions
  const validatePhoneNumber = (phone: string) => {
    if (!phone) return '전화번호를 입력해주세요.'
    if (phone.length < 10) return '전화번호는 최소 10자리여야 합니다.'
    if (phone.length > 11) return '전화번호는 최대 11자리여야 합니다.'
    if (!/^[0-9]+$/.test(phone)) return '전화번호는 숫자만 입력 가능합니다.'
    return null
  }

  const validateVerificationCode = (code: string) => {
    if (!code) return '인증번호를 입력해주세요.'
    if (code.length !== 6) return '인증번호는 6자리여야 합니다.'
    if (!/^[0-9]+$/.test(code)) return '인증번호는 숫자만 입력 가능합니다.'
    return null
  }

  const validateNickname = (nickname: string) => {
    if (!nickname) return '닉네임을 입력해주세요.'
    if (nickname.length < 2) return '닉네임은 최소 2자리여야 합니다.'
    if (nickname.length > 20) return '닉네임은 최대 20자리여야 합니다.'
    return null
  }

  // Simplified nickname availability check with debouncing
  const checkNicknameAvailabilityDebounced = useCallback(async (nickname: string) => {
    if (!mountedRef.current || !nickname || nickname.length < 2) {
      return
    }

    // If user is keeping their existing nickname, mark as available
    if (user && user.nickname === nickname) {
      return
    }

    // Clear any existing timeout
    if (nicknameCheckTimeoutRef.current) {
      clearTimeout(nicknameCheckTimeoutRef.current)
      nicknameCheckTimeoutRef.current = null
    }

    // Debounce the check
    nicknameCheckTimeoutRef.current = setTimeout(async () => {
      if (!mountedRef.current) return

      try {
        await checkNicknameAvailability(nickname)
      } catch (error) {
        // Error checking nickname availability
      }
    }, 300) // Increased debounce time
  }, [checkNicknameAvailability, user])

  const validateProvince = (province: Province | string | undefined) => {
    if (!province || province === '' || (typeof province === 'string' && province.trim() === '')) return '시/도를 선택해주세요.'
    return null
  }

  const validateCity = (city: City | string | undefined) => {
    if (!city || city === '' || (typeof city === 'string' && city.trim() === '')) return '도시를 선택해주세요.'
    return null
  }


  const validateCategories = (categories: number[]) => {
    if (categories.length === 0) return '최소 1개의 관심사를 선택해주세요.'
    if (categories.length > 5) return '관심사는 최대 5개까지 선택 가능합니다.'
    return null
  }

  // Component mount effect - removed duplicate

  // Location data will be loaded when needed in the profile update step


  // Load data when profile step is reached
  // Use stable primitive dependency to avoid reruns from new array identity
  const provincesLength = (provinces?.length || 0)
  useEffect(() => {
    if (currentStep === 'profile' && provincesLength === 0) {
      fetchCities()
    }
  }, [currentStep, provincesLength, fetchCities])

  // Update allCities when Redux cities data changes
  const citiesLength = (cities?.length || 0)
  useEffect(() => {
    if (citiesLength > 0) {
      setAllCities(cities)
    }
  }, [citiesLength])

  // Filter cities when province changes
  useEffect(() => {
    if (selectedProvince && citiesLength > 0 && typeof selectedProvince === 'object') {
      const filtered = cities.filter(city => city.provinceId === selectedProvince.id)
      // Avoid state churn by checking shallow equality
      const sameLength = filtered.length === filteredCities.length
      const sameIds = sameLength && filtered.every((c, i) => c.id === filteredCities[i]?.id)
      if (!sameIds) setFilteredCities(filtered)
      if (selectedCity) setSelectedCity('') // Reset city when province changes
    } else if (filteredCities.length !== 0) {
      setFilteredCities([])
    }
  }, [selectedProvince, citiesLength])

  // Pre-populate user's city/province data when cities are loaded
  useEffect(() => {
    if (user && allCities.length > 0 && provinces.length > 0 && currentStep === 'profile') {
      // Try to find by cityId first
      if (user.cityId && !selectedCity) {
        const userCity = allCities.find(city => city.id === user.cityId)
        if (userCity) {
          const userProvince = provinces.find(province => province.id === userCity.provinceId)
          if (userProvince) {
            setSelectedProvince(userProvince)
            setSelectedCity(userCity)
            setProvinceSearchValue(userProvince.name)
            setCitySearchValue(userCity.name)
          }
        }
      } else if (user.province && user.city && !selectedCity && !selectedProvince) {
        // Fallback: try to find by province and city names
        const userProvince = provinces.find(p =>
          typeof p === 'object' ? p.name === user.province : p === user.province
        )
        if (userProvince) {
          const provinceObj = typeof userProvince === 'object' ? userProvince : provinces.find(p => typeof p === 'object' && p.name === userProvince)
          if (provinceObj && typeof provinceObj === 'object') {
            const filteredCities = allCities.filter(c => c.provinceId === provinceObj.id)
            const userCity = filteredCities.find(c => c.name === user.city)
            if (userCity) {
              setSelectedProvince(provinceObj)
              setSelectedCity(userCity)
              setProvinceSearchValue(provinceObj.name)
              setCitySearchValue(userCity.name)
            } else {
              // If city not found in database, just set province
              setSelectedProvince(provinceObj)
              setProvinceSearchValue(provinceObj.name)
              setCitySearchValue(user.city || '')
            }
          }
        }
      }
    }
  }, [user, allCities, provinces, currentStep, selectedCity, selectedProvince])

  // Reset nickname status when nickname changes
  useEffect(() => {
    if (!mountedRef.current) return

    if (userData.nickname) {
      // If user is keeping their existing nickname, mark as available
      if (user && user.nickname === userData.nickname) {
        // Nickname is available (user's own nickname)
        // Redux state will be managed by the checkNicknameAvailability action
      } else {
        // Reset nickname status for new nickname
        // Redux state will be managed by the checkNicknameAvailability action
      }
    }
  }, [userData.nickname, user])

  // Auto-focus OTP hidden input when verification step loads using stable ref
  useEffect(() => {
    if (currentStep !== 'verification') {
      // Reset resend help modal when leaving verification step
      setShowResendHelp(false)
      return
    }
    const timer = setTimeout(() => {
      if (!mountedRef.current) return
      try {
        const node = otpHiddenInputRef.current
        if (node && node.isConnected) {
          node.focus()
          setShowOtpCursor(true)
        }
      } catch (error) {
        // Error focusing OTP input
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [currentStep])

  // Handle edit mode - load user data and go to profile step
  useEffect(() => {
    if (isEditMode && isAuthenticated && user && token && !loading && mountedRef.current && !editModeInitializedRef.current) {
      // Mark as initialized to prevent re-running
      editModeInitializedRef.current = true

      // Set auth token for image uploads
      setAuthToken(token)

      // Load user data into form
      setUserData(prev => ({
        ...prev,
        nickname: user.nickname || '',
        statusMessage: user.statusMessage || '',
        province: user.province || '',
        city: user.city || '',
        categories: Array.isArray(user.categories) ? user.categories : []
      }))

      if (user.profileImage) {
        setProfileImage(user.profileImage)
      }

      // Fetch categories if not already loaded (needed for interests step)
      if (categories.length === 0 && !categoriesLoading) {
        fetchCategories()
      }

      // Fetch cities if not already loaded (needed for profile step)
      if (cities.length === 0 && !citiesLoading) {
        fetchCities()
      }

      // Go directly to profile step
      safeSetStep('profile')
    }

    // Reset edit mode initialization when leaving edit mode
    if (!isEditMode && editModeInitializedRef.current) {
      editModeInitializedRef.current = false
    }
  }, [isEditMode, isAuthenticated, user, token, loading, safeSetStep, categories.length, cities.length, categoriesLoading, citiesLoading, fetchCategories, fetchCities])

  // Redirect to home only if authenticated AND profile is complete
  // Profile image is optional for existing users
  // Skip this redirect if in edit mode
  useEffect(() => {
    if (!isEditMode && isAuthenticated && user && token) {
      const hasNickname = Boolean(user?.nickname && String(user.nickname).trim().length >= 2)
      const hasStatus = Boolean(user?.statusMessage && String(user.statusMessage).trim().length > 0)
      const hasProvince = Boolean(user?.province && String(user.province).trim().length > 0)
      const hasCity = Boolean(user?.city && String(user.city).trim().length > 0)
      const hasCategories = Array.isArray(user?.categories) && user.categories.length > 0
      // Profile image is optional for existing users
      const isProfileComplete = hasNickname && hasStatus && hasProvince && hasCity && hasCategories
      if (isProfileComplete) {
        navigate('/')
      }
    }
  }, [isEditMode, isAuthenticated, user, token, navigate])

  // Dynamic category options from database
  const [categoryOptions, setCategoryOptions] = useState<Array<{
    id: number
    name: string
    description: string
    image: string
  }>>([])

  // DOM safety check utility
  const isElementInDOM = (element: Element | null): boolean => {
    if (!element) return false
    try {
      // Check if element is still connected to the document
      return document.contains(element) && element.isConnected
    } catch (error) {
      // Error checking DOM containment
      return false
    }
  }

  // Simplified handlers
  const handleNext = useCallback(async () => {
    if (!mountedRef.current) return

    try {
      if (isBusy) return
      setIsLoading(true)
      setError('')

      switch (currentStep) {
        case 'welcome':
          safeSetStep('phone')
          break

        case 'phone':
          const phoneError = validatePhoneNumber(userData.phoneNumber)
          if (phoneError) {
            setError(phoneError)
            return
          }

          try {
            const result = await sendOtp(userData.phoneNumber)
            if (result.type === 'auth/sendOtp/fulfilled' && mountedRef.current) {
              safeSetStep('verification')
            } else if (mountedRef.current) {
              setError(otpError || '인증번호 전송에 실패했습니다. 다시 시도해주세요.')
            }
          } catch (error) {
            if (mountedRef.current) {
              setError(otpError || 'Failed to send OTP. Please try again.')
            }
          }
          break

        case 'verification':
          const codeError = validateVerificationCode(userData.verificationCode)
          if (codeError) {
            setError(codeError)
            return
          }

          try {
            // First verify OTP
            const verifyResult = await verifyOtp(userData.phoneNumber, userData.verificationCode)
            if (verifyResult.type !== 'auth/verifyOtp/fulfilled') {
              setError(verificationError || '인증번호 확인에 실패했습니다. 다시 시도해주세요.')
              return
            }

            // Then check if user exists
            const loginResult = await loginByPhone(userData.phoneNumber)
            if (loginResult.type === 'auth/loginByPhone/fulfilled' && mountedRef.current) {
              const loginData = loginResult.payload
              if (loginData?.success && loginData.data) {
                const user = loginData.data.user
                const token = loginData.data.token

                // Store token in component state for immediate use
                setAuthToken(token)

                // Store token and user data in Redux
                setTokenAction(token)
                setUserAction(user)

                // For existing users, check minimum required fields (profileImage is optional)
                const hasNickname = Boolean(user?.nickname && String(user.nickname).trim().length >= 2)
                const hasStatus = Boolean(user?.statusMessage && String(user.statusMessage).trim().length > 0)
                const hasProvince = Boolean(user?.province && String(user.province).trim().length > 0)
                const hasCity = Boolean(user?.city && String(user.city).trim().length > 0)
                const hasCategories = Array.isArray(user?.categories) && user.categories.length > 0
                // Profile image is optional for existing users - they can log in without it
                const isProfileComplete = hasNickname && hasStatus && hasProvince && hasCity && hasCategories

                if (isProfileComplete) {
                  // Existing user with complete profile (profileImage optional)
                  // Set user data and navigate directly to home
                  setUserData(prev => ({
                    ...prev,
                    nickname: user.nickname || '',
                    categories: user.categories || []
                  }))
                  if (user.profileImage) setProfileImage(user.profileImage)
                  setIsExistingUser(true)
                  // Navigate directly to home for existing users
                  navigate('/')
                  return
                } else {
                  // User exists but profile incomplete
                  setUserData(prev => ({
                    ...prev,
                    nickname: user.nickname || '',
                    province: user.province || '',
                    categories: user.categories || [],
                    statusMessage: user.statusMessage || ''
                  }))
                  if (user.profileImage) setProfileImage(user.profileImage)
                  safeSetStep('profile')
                }
              } else {
                // Fulfilled but success === false (e.g., 201 Created with { success:false, reason:'User not found' })
                try {
                  const registerResult = await registerNewUser(userData.phoneNumber)
                  if (registerResult.type === 'auth/registerNewUser/fulfilled' && mountedRef.current) {
                    // Obtain token via login after registration
                    const secondLogin = await loginByPhone(userData.phoneNumber)
                    if (secondLogin.type === 'auth/loginByPhone/fulfilled' && mountedRef.current) {
                      const secondData = secondLogin.payload
                      if (secondData?.success && secondData.data?.token) {
                        const token = secondData.data.token
                        const user = secondData.data.user
                        setAuthToken(token)
                        setTokenAction(token)
                        setUserAction(user)
                      }
                    }
                    setIsExistingUser(false)
                    safeSetStep('profile')
                  } else if (mountedRef.current) {
                    setError(registerError || 'Failed to create account')
                  }
                } catch (regErr) {
                  if (mountedRef.current) setError('Failed to create account. Please try again.')
                }
              }
            } else if (loginResult.type === 'auth/loginByPhone/rejected' && mountedRef.current) {
              // Network or server error while checking user status
              setError(loginError || 'Failed to check user status')
            } else if (mountedRef.current) {
              setError(loginError || 'Failed to check user status')
            }
          } catch (error) {
            if (mountedRef.current) {
              setError(verificationError || 'Failed to verify OTP. Please try again.')
            }
          }
          break

        case 'profile':
          const nicknameError = validateNickname(userData.nickname)
          if (nicknameError) {
            setError(nicknameError)
            return
          }

          // Check if user is keeping their existing nickname
          const isKeepingExistingNickname = user && user.nickname === userData.nickname

          if (!isKeepingExistingNickname) {
            if (nicknameAvailable === null) {
              setError('닉네임 중복 확인을 해주세요.')
              return
            }

            if (nicknameAvailable === false) {
              setError('이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.')
              return
            }
          }

          if (nicknameChecking) {
            setError('닉네임 확인 중입니다. 잠시만 기다려주세요.')
            return
          }

          // Validate required fields: statusMessage, province, city
          if (!userData.statusMessage || String(userData.statusMessage).trim().length === 0) {
            setError('자기소개를 입력해주세요.')
            return
          }

          const provinceErrorMsg = validateProvince(selectedProvince)
          if (provinceErrorMsg) {
            setError(provinceErrorMsg)
            return
          }

          const cityErrorMsg = validateCity(selectedCity)
          if (cityErrorMsg) {
            setError(cityErrorMsg)
            return
          }

          try {
            // Ensure token is available
            if (!authToken) {
              // Token not available for profile update
              return
            }

            const updateData = {
              userId: user?.userUuid || user?.id, // Use actual user ID from Redux state
              nickname: userData.nickname,
              province: typeof selectedProvince === 'object' && selectedProvince ? selectedProvince.name : null,
              city: typeof selectedCity === 'object' && selectedCity ? selectedCity.name : null,
              statusMessage: userData.statusMessage,
              profileImage: profileImage
            }

            const result = await updateUserProfile(updateData)
            if (result.type === 'auth/updateUserProfile/fulfilled' && mountedRef.current) {
              // Update Redux user state with new data to prevent showing old data
              if (result.payload?.data?.user) {
                setUserAction(result.payload.data.user)
              } else {
                // Fallback: update user state manually with form data
                setUserAction({
                  ...user,
                  nickname: userData.nickname,
                  statusMessage: userData.statusMessage,
                  province: typeof selectedProvince === 'object' && selectedProvince ? selectedProvince.name : (selectedProvince as string) || '',
                  city: typeof selectedCity === 'object' && selectedCity ? selectedCity.name : (selectedCity as string) || '',
                  profileImage: profileImage || user?.profileImage
                } as any)
              }
              // Profile updated successfully, go to interests step
              safeSetStep('interests')
            } else if (mountedRef.current) {
              setError(profileUpdateError || '프로필 업데이트에 실패했습니다. 다시 시도해주세요.')
            }
          } catch (error) {
            if (mountedRef.current) {
              setError(profileUpdateError || '프로필 업데이트 중 오류가 발생했습니다. 다시 시도해주세요.')
            }
          }
          break

        case 'interests':
          const categoriesError = validateCategories(userData.categories)
          if (categoriesError) {
            setError(categoriesError)
            return
          }

          try {
            // Ensure token is available
            if (!authToken) {
              // Token not available for categories update
              return
            }

            // Update user with categories
            const result = await updateUserCategories(user?.userUuid || user?.id, userData.categories)
            if (result.type === 'auth/updateUserCategories/fulfilled' && mountedRef.current) {
              // Categories updated successfully
              if (isEditMode) {
                // Update Redux user state with new categories
                if (result.payload?.data?.user) {
                  setUserAction(result.payload.data.user)
                } else {
                  // Fallback: update user state manually with form data
                  setUserAction({
                    ...user,
                    categories: userData.categories
                  } as any)
                }

                // Immediately redirect using window.location to prevent any re-renders
                // This causes a full page reload which ensures clean state and refreshes profile data
                // Don't reset editModeInitializedRef here - let the page reload handle cleanup
                // Ensure we use the correct returnToUrl (should be /web/Mypage/settings)
                // Add showDetails parameter to indicate we should show the user details view
                if (returnToUrl && returnToUrl !== '/') {
                  const url = new URL(returnToUrl, window.location.origin)
                  url.searchParams.set('showDetails', 'true')
                  window.location.replace(url.pathname + url.search)
                } else {
                  // Fallback to settings page if returnToUrl is not set
                  window.location.replace('/web/Mypage/settings?showDetails=true')
                }
              } else {
                // Normal flow - go to success step
                safeSetStep('success')
              }
            } else if (mountedRef.current) {
              setError(profileUpdateError || '관심사 업데이트에 실패했습니다. 다시 시도해주세요.')
            }
          } catch (error) {
            if (mountedRef.current) {
              setError(profileUpdateError || '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.')
            }
          }
          break
      }
    } catch (error) {
      // Error in handleNext
      if (mountedRef.current) {
        setError('처리 중 오류가 발생했습니다. 다시 시도해주세요.')
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [isBusy, currentStep, userData, selectedProvince, selectedCity, profileImage, nicknameAvailable, nicknameChecking, token, user, dispatch, safeSetStep, navigate, sendOtp, verifyOtp, loginByPhone, registerNewUser, updateUserProfile, updateUserCategories, otpError, verificationError, loginError, registerError, profileUpdateError, setTokenAction, setUserAction, isEditMode, returnToUrl, authToken])

  const handleBack = useCallback(() => {
    if (!mountedRef.current) return

    if (mountedRef.current) {
      setError('')
    }

    // In edit mode, if at profile step, go back to returnToUrl
    if (isEditMode && currentStep === 'profile') {
      navigate(returnToUrl)
      return
    }

    switch (currentStep) {
      case 'phone':
        safeSetStep('welcome')
        break
      case 'verification':
        safeSetStep('phone')
        break
      case 'profile':
        if (isEditMode) {
          navigate(returnToUrl)
        } else {
          safeSetStep('verification')
        }
        break
      case 'interests':
        safeSetStep('profile')
        break
      case 'success':
        safeSetStep('interests')
        break
    }
  }, [currentStep, isEditMode, returnToUrl, navigate, safeSetStep])


  const handleInputChange = useCallback((field: keyof UserData, value: string) => {
    if (!mountedRef.current) return

    if (error && mountedRef.current) {
      setError('')
    }
    setUserData(prev => ({ ...prev, [field]: value }))

    // Check nickname availability when nickname changes
    if (field === 'nickname') {
      checkNicknameAvailabilityDebounced(value)
    }
  }, [error, checkNicknameAvailabilityDebounced])

  const handleCategoryToggle = useCallback((categoryId: number) => {
    if (!mountedRef.current) return

    setUserData(prev => {
      const current = Array.isArray(prev.categories) ? prev.categories : []
      return ({
        ...prev,
        categories: current.includes(categoryId)
          ? current.filter(i => i !== categoryId)
          : current.length < 5
            ? [...current, categoryId]
            : current
      })
    })
  }, [])

  const handleResendCode = useCallback(async () => {
    if (!mountedRef.current) return

    setError('')

    try {
      const result = await sendOtp(userData.phoneNumber)
      if (result.type === 'auth/sendOtp/fulfilled' && mountedRef.current) {
        setError('')
        setShowResendHelp(false)
      } else if (mountedRef.current) {
        setError(otpError || 'Failed to resend OTP')
      }
    } catch (error) {
      // Error in handleResendCode
      if (mountedRef.current) {
        setError(otpError || '처리 중 오류가 발생했습니다. 다시 시도해주세요.')
      }
    }
  }, [userData.phoneNumber, sendOtp, otpError])

  // Progress indicator component - updated to match client design (pill-shaped green bg + multiple white dots)
  const renderProgress = () => {
    // Map current step to number of filled dots
    const getFilledDots = () => {
      switch (currentStep) {
        case 'phone':
          return 1 // First dot filled
        case 'verification':
          return 2 // Second dot filled  
        case 'profile':
        case 'interests':
        case 'success':
          return 3 // Third dot filled
        default:
          return 0
      }
    }

    const filledDots = getFilledDots()

    // Pill dimensions based on client requirements
    const getPillDimensions = (filledCount: number) => {
      if (filledCount === 1) return { width: 32, height: 23 } // First dot filled
      if (filledCount === 2) return { width: 54, height: 23 } // Second dot filled  
      if (filledCount === 3) return { width: 88, height: 23 } // Third dot filled
      return { width: 32, height: 23 }
    }

    const pillDimensions = getPillDimensions(filledDots)
    const graySize = 8   // gray dots size
    const gapPx = 12

    return (
      <Box className='flex items-center justify-center mb-2'>
        {/* Green pill with multiple white dots distributed across width */}
        <Box
          className='rounded-full bg-green-500 flex items-center relative'
          style={{
            width: pillDimensions.width,
            height: pillDimensions.height,
            display: filledDots > 0 ? 'flex' : 'none'
          }}
        >
          {Array.from({ length: Math.max(filledDots, 1) }, (_, i) => {
            let leftPosition = 0
            const dotSize = 8
            const padding = 8 // Increased padding from edges

            if (filledDots === 1) {
              // Single dot in center
              leftPosition = (pillDimensions.width - dotSize) / 2
            } else if (filledDots === 2) {
              // Two dots: with padding from edges
              leftPosition = i === 0 ? padding : pillDimensions.width - dotSize - padding
            } else if (filledDots === 3) {
              // Three dots: left with padding, center, right with padding
              if (i === 0) {
                leftPosition = padding // Left with padding
              } else if (i === 1) {
                leftPosition = (pillDimensions.width - dotSize) / 2 // Center
              } else {
                leftPosition = pillDimensions.width - dotSize - padding // Right with padding
              }
            }

            return (
              <Box
                key={i}
                className='rounded-full bg-white absolute'
                style={{
                  width: 8,
                  height: 8,
                  left: leftPosition,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  visibility: i < filledDots ? 'visible' : 'hidden'
                }}
              />
            )
          })}
        </Box>

        {/* Gray dots for remaining steps */}
        {Array.from({ length: 3 }, (_, i) => (
          <Box
            key={`gray-${i}`}
            className='rounded-full bg-gray-300'
            style={{
              width: graySize,
              height: graySize,
              opacity: 0.4,
              marginLeft: (i === 0 && filledDots > 0) || i > 0 ? `${gapPx}px` : 0,
              display: i < (3 - filledDots) ? 'block' : 'none'
            }}
          />
        ))}
      </Box>
    )
  }

  // Render functions
  const renderWelcome = () => (
    <Box className='text-center'>
      <Typography variant='h2' className='font-bold text-gray-900 mb-4 leading-tight'>
        취미📚🏃👨‍🍳가 만나는 곳,<br />
        이야기가 이어지다
      </Typography>
      <Typography variant='body1' className='text-gray-500 font-semibold mb-12 max-w-sm'>
        좋아하는 관심사의 모임이나 수업에 참여하고, 새로운 취향을 발견해 보세요.
      </Typography>
      <Box className='w-full max-w-sm space-y-3 mx-auto'>
        <Button
          variant='contained'
          size='large'
          onClick={handleNext}
          className='w-full h-14 hover:bg-gray-700 text-white rounded-lg text-base font-medium'
          sx={{
            backgroundColor: '#3D3D3D',
          }}
          fullWidth
        >
          전화번호로 시작하기
        </Button>
      </Box>
    </Box>
  )

  const renderPhoneInput = () => (
    <Box className='w-full h-full flex flex-col'>
      <div className='flex-1'>
        <Typography className='mb-2 mt-12 text-black font-semibold text-[28px] text-left'>
          전화번호 입력
        </Typography>
        <Typography className='mb-12 text-black text-[17px] text-left'>
          번호를 입력하여 본인 인증을 완료하세요.
        </Typography>

        {/* Phone Number Input Field - Clickable Area */}
        <Box
          className='flex items-center mt-20 mb-6 cursor-pointer'
          onClick={() => {
            if (!mountedRef.current) return

            try {
              const hiddenInput = phoneInputRef.current || document.getElementById('phone-input') as HTMLInputElement | null
              if (hiddenInput && mountedRef.current && isElementInDOM(hiddenInput)) {
                hiddenInput.focus()
                try {
                  if ((hiddenInput.value || '').length === 0) {
                    hiddenInput.setSelectionRange(0, 0)
                  }
                } catch (e) {
                  // Error setting selection range
                }
              }
            } catch (error) {
              // Error focusing phone input
            }
          }}
        >
          <Typography
            variant='h4'
            className='font-bold text-gray-900 underline underline-offset-4 mr-3'
            sx={{ fontSize: '2rem' }}
          >
            +82
          </Typography>
          <Box className='flex items-center'>
            {/* Blinking cursor - at front when empty, else after the number */}
            <Box
              className='w-0.5 h-8 bg-gray-900 mr-1'
              sx={{
                animation: 'blink 1s infinite',
                '@keyframes blink': {
                  '0%, 50%': { opacity: 1 },
                  '51%, 100%': { opacity: 0 }
                },
                visibility: (showPhoneCursor && userData.phoneNumber.length === 0) ? 'visible' : 'hidden'
              }}
            />
            <Typography
              variant='h3'
              className={`font-bold ${userData.phoneNumber ? 'text-gray-900' : 'text-gray-400'}`}
              sx={{
                fontSize: '2rem',
                lineHeight: 1,
                minHeight: '2rem'
              }}
            >
              {userData.phoneNumber ? formatPhoneNumber(userData.phoneNumber) : '010-1234-1234'}
            </Typography>
            <Box
              className='w-0.5 h-8 bg-gray-900 ml-1'
              sx={{
                animation: 'blink 1s infinite',
                '@keyframes blink': {
                  '0%, 50%': { opacity: 1 },
                  '51%, 100%': { opacity: 0 }
                },
                visibility: (showPhoneCursor && userData.phoneNumber.length > 0) ? 'visible' : 'hidden'
              }}
            />
          </Box>
        </Box>

        {/* Hidden input for actual value */}
        <input
          id="phone-input"
          type="tel"
          ref={phoneInputRef}
          value={userData.phoneNumber}
          onChange={(e) => {
            // Remove all non-numeric characters and limit to 11 digits
            const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 11)
            handleInputChange('phoneNumber', value)
          }}
          onFocus={(e) => {
            setShowPhoneCursor(true)
            try {
              if ((e.currentTarget.value || '').length === 0) {
                e.currentTarget.setSelectionRange(0, 0)
              }
            } catch (err) { }
          }}
          onBlur={() => setShowPhoneCursor(false)}
          className="absolute opacity-0 pointer-events-none"
          inputMode="numeric"
          autoComplete="tel"
          autoFocus
          maxLength={11}
        />
      </div>

      {/* Fixed bottom section */}
      <div className='fixed bottom-0 left-0 right-0 bg-white px-4 pb-4 pt-2'>
        {renderProgress()}
        <Button
          variant='contained'
          fullWidth
          onClick={() => {
            if (!userData.phoneNumber || userData.phoneNumber.length < 10) {
              setError('올바른 전화번호를 입력해주세요 (10자리 이상)')
              return
            }
            handleNext()
          }}
          disabled={isBusy}
          sx={{
            boxShadow: 'none !important',
            backgroundColor: '#ECECEC',
          }}
          className='h-14 hover:bg-gray-200 text-black rounded-2xl text-base font-medium mt-4'
        >
          <Box sx={{ display: isLoading ? 'block' : 'none' }}>
            <CircularProgress size={24} />
          </Box>
          <Box component='span' sx={{ display: isLoading ? 'none' : 'block' }}>
            로그인하기
          </Box>
        </Button>
      </div>
    </Box>
  )

  const renderVerification = () => (
    <Box className='w-full h-full flex flex-col'>
      <div className='flex-1'>
        <Typography className='mb-2 mt-16 text-black font-semibold text-[27px] text-left'>
          인증번호 입력
        </Typography>
        <Typography className='mb-6 mb-16 text-black text-[17px] text-left'>
          <span className='font-bold'>+82 {formatPhoneNumber(userData.phoneNumber)}</span> 번호로 인증번호를<br></br> 전송했습니다.
        </Typography>

        {/* OTP Input Fields */}
        <Box className='flex justify-center items-center gap-3 mt-20 mb-8'>
          {Array.from({ length: 6 }, (_, index) => {
            const digit = userData.verificationCode[index] || ''
            const isActive = digit !== ''
            const isCurrentField = index === userData.verificationCode.length && userData.verificationCode.length < 6

            return (
              <Box
                key={index}
                className={`w-12 h-16 flex items-center justify-center border-b-2 transition-all duration-200 cursor-pointer relative ${isActive
                  ? 'border-gray-800'
                  : 'border-gray-300'
                  }`}
                onClick={() => {
                  if (!mountedRef.current) return

                  try {
                    const hiddenInput = otpHiddenInputRef.current
                    if (hiddenInput && mountedRef.current && hiddenInput.isConnected) {
                      hiddenInput.focus()
                    }
                  } catch (error) {
                    // Error focusing OTP input
                  }
                }}
              >
                <Typography
                  variant='h3'
                  className={`font-bold transition-all duration-200 ${isActive ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  sx={{
                    fontSize: '2.5rem',
                    lineHeight: 1,
                    minHeight: '2.5rem'
                  }}
                >
                  {digit}
                </Typography>

                {/* Blinking cursor - show in current empty field or after last digit */}
                <Box
                  className='absolute w-0.5 h-8 bg-gray-900'
                  sx={{
                    animation: 'blink 1s infinite',
                    '@keyframes blink': {
                      '0%, 50%': { opacity: 1 },
                      '51%, 100%': { opacity: 0 }
                    },
                    visibility: (isCurrentField && showOtpCursor) ? 'visible' : 'hidden'
                  }}
                />
              </Box>
            )
          })}
        </Box>

        {/* Hidden input for actual value */}
        <input
          id="otp-input"
          type="text"
          ref={otpHiddenInputRef}
          value={userData.verificationCode}
          onChange={(e) => {
            const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
            handleInputChange('verificationCode', value)
          }}
          onFocus={() => setShowOtpCursor(true)}
          onBlur={() => setShowOtpCursor(false)}
          className="absolute opacity-0 pointer-events-none"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          style={{ zIndex: -1 }}
        />

        {/* Help text - Left aligned as per reference */}
        <Box className='flex items-center mb-6 text-left'>
          <Box
            className='inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[13px] leading-none mr-1'
            sx={{ backgroundColor: '#007AFF' }}
          >
            !
          </Box>
          <Typography
            fontSize={13}
            color='#007AFF'
            className='cursor-pointer'
            onClick={() => setShowResendHelp(true)}
            component='span'
          >
            인증번호를 받지 못하셨나요?
          </Typography>
        </Box>
        <Box
          key={`resend-help-${currentStep}`}
          className='fixed inset-0 z-50'
          sx={{
            display: showResendHelp ? 'flex' : 'none',
            pointerEvents: showResendHelp ? 'auto' : 'none',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Box
            className='absolute inset-0 bg-white/0'
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowResendHelp(false)
            }}
          />
          <Box className='relative w-full max-w-xs mx-4 bg-white/40 backdrop-blur-md rounded-4xl shadow-md'>
            <Box className='p-4 '>
              <Typography className='font-semibold text-[17px] text-black'>인증번호를 받지 못하셨나요?</Typography>
              <Typography className='text-black text-[17px] block mt-1'>인증번호를 다시 받거나, 고객지원을 통해 문제를 해결할 수 있습니다.</Typography>
              <Box className='mt-6 space-y-2'>
                <Button
                  fullWidth
                  variant='contained'
                  disabled={isLoading}
                  sx={{
                    fontWeight: 'medium',
                    backgroundColor: '#007AFF',
                    color: '#fff',
                    borderRadius: '9999px',
                    boxShadow: 'none',
                    '&:hover': { backgroundColor: '#1565c0' },
                    '&:disabled': { backgroundColor: '#ccc' },
                    fontSize: '17px',
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleResendCode()
                  }}
                >
                  <Box component='span' sx={{ display: isLoading ? 'block' : 'none' }}>
                    전송 중...
                  </Box>
                  <Box component='span' sx={{ display: isLoading ? 'none' : 'block' }}>
                    다시 보내기
                  </Box>
                </Button>
                <Button
                  fullWidth
                  variant='contained'

                  sx={{
                    backgroundColor: '#E5E7EB',
                    fontWeight: 'medium',
                    color: '#111827',
                    borderRadius: '9999px',
                    fontSize: '17px',
                    boxShadow: 'none',
                    '&:hover': { backgroundColor: '#D1D5DB' }
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowResendHelp(false)
                    window.open('https://support.thenoldam.com/')
                  }}
                >
                  고객지원으로 이동
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </div>

      {/* Fixed bottom section */}
      <div className='fixed bottom-0 left-0 right-0 bg-white px-4 pb-4 pt-2'>
        {renderProgress()}
        <Button
          variant='contained'
          fullWidth
          onClick={() => {
            if (userData.verificationCode.length !== 6) {
              setError('인증번호 6자리를 입력해주세요')
              return
            }
            handleNext()
          }}
          disabled={isBusy}
          sx={{
            boxShadow: 'none !important',
            backgroundColor: '#ECECEC',
          }}
          className='h-14 hover:bg-gray-200 text-black rounded-2xl text-base font-medium mt-4'
        >
          <Box sx={{ display: isLoading ? 'block' : 'none' }}>
            <CircularProgress size={24} />
          </Box>
          <Box component='span' sx={{ display: isLoading ? 'none' : 'block' }}>
            확인
          </Box>
        </Button>
      </div>
    </Box>
  )

  const renderProfile = () => (
    <Box className='w-full h-full flex flex-col'>
      <div className='flex-1 pb-20'>
        {/* Profile avatar with + overlay */}
        <Box className='mb-3'>
          <div className='relative inline-block'>
            <div className='w-20 h-20 rounded-full border-2 bg-white overflow-hidden relative'>
              <img
                src={profileImage || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}
                alt="Profile"
                className='w-full h-full object-cover'
                style={{
                  display: profileImage ? 'block' : 'none'
                }}
              />
              <div
                className='w-full h-full bg-gray-200 flex items-center justify-center absolute top-0 left-0'
                style={{
                  display: profileImage ? 'none' : 'flex'
                }}
              >
                {/* <span className='text-gray-500 text-xs'>사진</span> */}
              </div>
            </div>
            <div
              className='absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-400 transition-colors'
              onClick={async () => {
                if (imageUploading) return

                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/*'
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (!file) return

                  setImageUploading(true)
                  setError('')

                  try {
                    // Compress image first
                    // Compressing profile image...
                    const compressedDataUrl = await compressImage(file, {
                      maxWidth: 800,
                      maxHeight: 800,
                      quality: 0.85,
                      maxSizeMB: 1
                    })

                    // Convert to File
                    const compressedFile = new File(
                      [await (await fetch(compressedDataUrl)).blob()],
                      file.name,
                      { type: file.type }
                    )

                    // Upload compressed image to server
                    const formData = new FormData()
                    formData.append('image', compressedFile)

                    const response = await fetch('/api/upload/image', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${authToken}`
                      },
                      body: formData
                    })

                    const uploadResult = await response.json()

                    if (!uploadResult.success) {
                      throw new Error('Upload failed')
                    }

                    setProfileImage(uploadResult.data.imageUrl)
                  } catch (error) {
                    // Image upload error
                    setError('이미지 업로드에 실패했습니다. 다시 시도해주세요.')
                  } finally {
                    setImageUploading(false)
                  }
                }
                input.click()
              }}
            >
              {imageUploading ? (
                <CircularProgress size={16} sx={{ color: 'white' }} />
              ) : (
                <span className='text-white text-lg leading-none'>+</span>
              )}
            </div>
          </div>
        </Box>
        <Typography className='mb-2 font-semibold text-[27px] text-black'>
          정보 입력
        </Typography>
        <Typography className='mb-2 text-black text-[17px]'>
          닉네임와 상태 메시지를 입력하여,<br></br>
          다른 사람들에게 ‘나'를 소개해주세요.


        </Typography>
        <Typography className='mb-12 text-black text-[13px] block'>
          (정보들은 추후 언제든지 변경할 수 있어요.)
        </Typography>
        <Box className='mt-4 border-b border-gray-200 divide-y divide-gray-200 px-4'>
          {/* Nickname row */}
          <Box className='flex items-start py-0'>
            <Typography className='w-24 text-black text-[17px]'>닉네임</Typography>
            <Box className='flex-1 flex flex-col gap-1'>
              <Box className='flex items-center gap-2'>
                <TextField
                  variant='standard'
                  value={userData.nickname}
                  onChange={(e) => handleInputChange('nickname', e.target.value)}
                  placeholder='닉네임 입력'
                  InputProps={{ disableUnderline: true }}
                  fullWidth

                  sx={{
                    '& .MuiInputBase-input': {
                      padding: 0,
                      fontSize: '17px',
                      color: '#111827'
                    },
                    '& .MuiInputBase-input::placeholder': {
                      color: '#9ca3af',
                      opacity: 1
                    }
                  }}
                />
                <Button
                  size='small'
                  className='rounded-full w-32 hover:bg-green-900 px-3 py-1 normal-case'
                  disabled={nicknameChecking || isCheckingNicknameRef.current}
                  disableRipple
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()

                    // Throttle rapid clicks and safely close any open poppers
                    if (isCheckingNicknameRef.current || nicknameChecking) return
                    isCheckingNicknameRef.current = true
                    setTimeout(() => { isCheckingNicknameRef.current = false }, 400)
                    try {
                      const ae = document.activeElement as HTMLElement | null
                      if (ae && ae.blur && ae.isConnected) ae.blur()
                    } catch { }

                    if (!userData.nickname || userData.nickname.length < 2) {
                      setError('닉네임을 2자 이상 입력해주세요')
                      return
                    }

                    checkNicknameAvailability(userData.nickname)
                  }}
                  sx={{
                    minWidth: 0,
                    fontSize: '12px',
                    backgroundColor: nicknameAvailable === true ? '#E6F0FF' : '#E6F0FF',
                    color: nicknameAvailable === true ? '#007AFF' : '#0000FF',
                    '&:hover': {
                      backgroundColor: nicknameAvailable === true ? '#E6F0FF !important' : '#E6F0FF !important'
                    },
                    '&:disabled': {
                      backgroundColor: '#F3F4F6',
                      color: '#9CA3AF'
                    }
                  }}
                >
                  <Box sx={{ display: nicknameChecking ? 'block' : 'none' }}>
                    <CircularProgress size={12} sx={{ color: '#2563eb' }} />
                  </Box>
                  <Box component='span' sx={{ display: (!nicknameChecking && nicknameAvailable === true) ? 'block' : 'none' }}>
                    ✓ 사용가능
                  </Box>
                  <Box component='span' sx={{ display: (!nicknameChecking && nicknameAvailable === false) ? 'block' : 'none' }}>
                    ✗ 사용중
                  </Box>
                  <Box component='span' sx={{ display: (!nicknameChecking && nicknameAvailable === null) ? 'block' : 'none' }}>
                    중복 확인
                  </Box>
                </Button>
              </Box>
              {/* Reserve space for messages to prevent layout shift */}
              <Box className='h-5 flex items-start'>
                <Typography
                  className='text-red-500 text-[13px]'
                  sx={{ display: nicknameError ? 'block' : 'none' }}
                >
                  {nicknameError || ' '}
                </Typography>
                <Typography
                  variant='caption'
                  className='text-green-600 text-xs'
                  sx={{ display: (nicknameAvailable === true && !nicknameError) ? 'block' : 'none' }}
                >
                  사용 가능한 닉네임입니다.
                </Typography>
                <Typography
                  variant='caption'
                  className='text-gray-500 text-xs'
                  sx={{ display: (nicknameAvailable === null && userData.nickname && userData.nickname.length >= 2) ? 'block' : 'none' }}
                >
                  중복 확인 버튼을 클릭해주세요.
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Status message row */}
          <Box className='flex items-center py-3'>
            <Typography className='w-32 text-black text-[17px]'>자기소개</Typography>
            <TextField
              variant='standard'
              value={userData.statusMessage}
              onChange={(e) => handleInputChange('statusMessage', e.target.value)}
              placeholder='나를 소개하는 짧은 문장을 적어주세요'
              InputProps={{ disableUnderline: true }}
              fullWidth
              sx={{
                '& .MuiInputBase-input': { padding: 0, fontSize: '17px' },
                '& .MuiInputBase-input::placeholder': { color: '#9ca3af', opacity: 1 }
              }}
            />
          </Box>

          {/* Province row */}
          <Box className='flex items-center py-3'>
            <Typography className='w-24 text-black text-[17px]'>시/도</Typography>
            <Box className='flex-1 flex items-center gap-2'>
              <Autocomplete
                value={selectedProvince}
                onChange={(event, newValue) => {
                  if (!mountedRef.current) return
                  if (typeof newValue === 'string') {
                    setSelectedProvince(newValue)
                    setProvinceSearchValue(newValue)
                  } else {
                    setSelectedProvince(newValue)
                    if (newValue) {
                      setProvinceSearchValue(newValue.name)
                    } else {
                      setProvinceSearchValue('')
                    }
                  }
                }}
                inputValue={provinceSearchValue}
                onInputChange={(event, newInputValue) => {
                  if (!mountedRef.current) return
                  if (!selectedProvince) {
                    setProvinceSearchValue(newInputValue)
                  }
                }}
                options={provinces}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                isOptionEqualToValue={(option, value) => {
                  if (typeof option === 'string' || typeof value === 'string') {
                    return option === value
                  }
                  return option.id === value.id
                }}
                freeSolo
                clearOnBlur={false}
                disableClearable
                disablePortal
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant='standard'
                    placeholder='시/도를 선택하세요'
                    InputProps={{
                      ...params.InputProps,
                      disableUnderline: true,
                      sx: {
                        fontSize: '17px',
                        padding: 0
                      }
                    }}
                    sx={{
                      '& .MuiInputBase-input': {
                        padding: 0,
                        fontSize: '17px',
                        color: '#111827'
                      },
                      '& .MuiInputBase-input::placeholder': {
                        color: '#9ca3af',
                        opacity: 1
                      }
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props
                  return (
                    <Box component='li' key={key} {...otherProps}>
                      {typeof option === 'string' ? option : option.name}
                    </Box>
                  )
                }}
                noOptionsText='검색 결과가 없습니다'
                loading={provinces.length === 0}
                fullWidth
              />
              <IconButton
                size='small'
                onClick={() => {
                  if (!mountedRef.current) return
                  setSelectedProvince('')
                  setProvinceSearchValue('')
                  setSelectedCity('')
                  setCitySearchValue('')
                }}
                sx={{
                  minWidth: 'auto',
                  width: 24,
                  height: 24,
                  visibility: selectedProvince ? 'visible' : 'hidden'
                }}
                disabled={!selectedProvince}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </IconButton>
            </Box>
          </Box>

          {/* City row */}
          <Box className='flex items-center py-3'>
            <Typography className='w-24 text-black text-[17px]'>도시</Typography>
            <Box className='flex-1 flex items-center gap-2'>
              <Autocomplete
                value={selectedCity}
                onChange={(event, newValue) => {
                  if (!mountedRef.current) return
                  if (typeof newValue === 'string') {
                    setSelectedCity(newValue)
                    setCitySearchValue(newValue)
                  } else {
                    setSelectedCity(newValue)
                    if (newValue) {
                      setCitySearchValue(newValue.name)
                    } else {
                      setCitySearchValue('')
                    }
                  }
                }}
                inputValue={citySearchValue}
                onInputChange={(event, newInputValue) => {
                  if (!mountedRef.current) return
                  if (!selectedCity) {
                    setCitySearchValue(newInputValue)
                  }
                }}
                options={filteredCities}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                isOptionEqualToValue={(option, value) => {
                  if (typeof option === 'string' || typeof value === 'string') {
                    return option === value
                  }
                  return option.id === value.id
                }}
                disabled={!selectedProvince}
                freeSolo
                clearOnBlur={false}
                disableClearable
                disablePortal
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant='standard'
                    placeholder={selectedProvince ? '도시를 선택하세요' : '먼저 시/도를 선택하세요'}
                    InputProps={{
                      ...params.InputProps,
                      disableUnderline: true,
                      sx: {
                        fontSize: '17px',
                        padding: 0
                      }
                    }}
                    sx={{
                      '& .MuiInputBase-input': {
                        padding: 0,
                        fontSize: '17px',
                        color: selectedProvince ? '#111827' : '#9ca3af'
                      },
                      '& .MuiInputBase-input::placeholder': {
                        color: '#9ca3af',
                        opacity: 1
                      }
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props
                  return (
                    <Box component='li' key={key} {...otherProps}>
                      {typeof option === 'string' ? option : option.name}
                    </Box>
                  )
                }}
                noOptionsText='검색 결과가 없습니다'
                loading={filteredCities.length === 0 && selectedProvince ? true : false}
                fullWidth
              />
              <IconButton
                size='small'
                onClick={() => {
                  if (!mountedRef.current) return
                  setSelectedCity('')
                  setCitySearchValue('')
                }}
                sx={{
                  minWidth: 'auto',
                  width: 24,
                  height: 24,
                  visibility: selectedCity ? 'visible' : 'hidden'
                }}
                disabled={!selectedCity}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </IconButton>
            </Box>
          </Box>

        </Box>
      </div>

      {/* Fixed bottom section */}
      <div className='fixed bottom-0 left-0 right-0 bg-white px-4 pb-4 pt-2'>
        {renderProgress()}
        <Button
          variant='contained'
          fullWidth
          onClick={() => {
            if (!userData.nickname || userData.nickname.length < 2) {
              setError('닉네임을 2자 이상 입력해주세요')
              return
            }
            // City and province are optional - no validation required
            // Check if user is keeping their existing nickname
            const isKeepingExistingNickname = user && user.nickname === userData.nickname

            if (!isKeepingExistingNickname && nicknameAvailable !== true) {
              setError('닉네임 중복 확인을 해주세요')
              return
            }
            handleNext()
          }}
          disabled={nicknameChecking || isBusy}
          sx={{
            boxShadow: 'none !important',
            backgroundColor: '#ECECEC',
            '&:active': {
              backgroundColor: '#ECECEC !important'
            }
          }}
          className='h-14 hover:bg-gray-200 text-black rounded-2xl text-base font-medium mt-4'
        >
          확인
        </Button>
      </div>
    </Box>
  )

  const renderInterests = () => (
    <Box className='w-full h-full flex flex-col'>
      <div className='flex-1 pb-20'>
        <Typography className='mb-2 font-semibold text-[27px] text-black'>
          관심사 선택하기
        </Typography>
        <Typography className='text-black text-[17px]'>
          요즘 관심을 가지시는 카테고리를 선택해주세요.
        </Typography>
        <Typography fontSize={15} className='mb-6 text-black block'>
          (추후 관심사에 따라 맞춤형 콘텐츠를 제공해드려요)
        </Typography>
        {categoriesLoading ? (
          <Box className='flex justify-center items-center h-32'>
            <CircularProgress />
          </Box>
        ) : (
          <Box className='grid grid-cols-2 gap-4 mb-12'>
            {categoryOptions.map((category) => {

              return (
                <Box
                  key={category.id}
                  onClick={() => handleCategoryToggle(category.id)}
                  className={`h-20 text-sm relative overflow-hidden cursor-pointer flex items-center justify-center ${userData.categories.includes(category.id)
                    ? 'ring-2 ring-blue-500 ring-offset-2'
                    : ''
                    }`}
                  sx={{
                    backgroundImage: `url(${category.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    borderRadius: '8px',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: userData.categories.includes(category.id)
                        ? 'rgba(0, 0, 0, 0.4)'
                        : 'rgba(0, 0, 0, 0.2)',
                      zIndex: 1,
                      borderRadius: '8px'
                    },
                  }}
                >
                  <Typography
                    sx={{
                      position: 'relative',
                      zIndex: 3,
                      color: 'white',
                      fontWeight: 'bold',
                      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.9), 0 0 8px rgba(0, 0, 0, 0.8)',
                      fontSize: '0.875rem',
                      lineHeight: 1.2,
                      textAlign: 'center'
                    }}
                  >
                    {category.name}
                  </Typography>
                </Box>
              )
            })}
          </Box>
        )}

        <Typography variant='body2' className='mb-4 text-gray-500'>
          {/* 선택된 관심사: {userData.categories.length}/5개 */}
        </Typography>

      </div>

      {/* Fixed bottom section */}
      <Box sx={{ zIndex: 1000 }} className='fixed bottom-0 left-0 right-0 bg-white px-4 pb-4 pt-2'>
        {renderProgress()}
        <Button
          variant='contained'
          fullWidth
          onClick={handleNext}
          sx={{
            boxShadow: 'none !important',
            backgroundColor: '#ECECEC',
          }}

          className='h-14 hover:bg-gray-200 text-black rounded-2xl text-base font-medium mt-4'
        >
          확인
        </Button>
      </Box>
    </Box>
  )

  const renderSuccess = () => {
    return (
      <Box className='w-full h-full flex flex-col'>
        <div className='flex-1 mt-8'>
          <Typography className='mb-2 font-semibold text-[27px] text-black'>
            로그인 완료!
          </Typography>
          <Typography className='mb-8 text-black text-[17px]'>
            @{user?.nickname || userData.nickname || '사용자'} 님 {isExistingUser ? '다시 만나게 되어 반가워요!' : '만나게 되어 반가워요!'}
          </Typography>
        </div>

        {/* Fixed bottom section */}
        <div className='fixed bottom-0 left-0 right-0 bg-white px-4 pb-4 pt-2'>
          {renderProgress()}
          <Button
            variant='contained'
            fullWidth
            sx={{
              boxShadow: 'none !important',
              backgroundColor: '#ECECEC',
            }}
            className='h-14 box-shadow-none hover:bg-gray-200 text-black rounded-2xl font-medium mt-4'
            onClick={() => {
              // Direct navigation to home page since Redux state is already updated
              navigate('/')
            }}
            disabled={isBusy}
          >
            시작하기
          </Button>
        </div>
      </Box>
    )
  }

  // Render all steps at once, show/hide with CSS for Google Translate compatibility
  const renderAllSteps = () => {
    return (
      <>
        <Box sx={{ display: currentStep === 'phone' ? 'block' : 'none' }}>
          {renderPhoneInput()}
        </Box>
        <Box sx={{ display: currentStep === 'verification' ? 'block' : 'none' }}>
          {renderVerification()}
        </Box>
        <Box sx={{ display: currentStep === 'profile' ? 'block' : 'none' }}>
          {renderProfile()}
        </Box>
        <Box sx={{ display: currentStep === 'interests' ? 'block' : 'none' }}>
          {renderInterests()}
        </Box>
        <Box sx={{ display: currentStep === 'success' ? 'block' : 'none' }}>
          {renderSuccess()}
        </Box>
      </>
    )
  }

  // Show loading during initial auth check only
  if (loading) {
    return (
      <div className='flex min-h-screen justify-center items-center'>
        <CircularProgress size={24} />
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-white flex flex-col mx-auto'>
      {/* Welcome Screen */}
      <div
        className='flex-1 flex flex-col justify-center px-4 py-8 max-w-md mx-auto w-full'
        style={{ display: currentStep === 'welcome' ? 'flex' : 'none' }}
      >
        {/* Logo/Branding - Top Left */}
        <div>
          <div className='flex items-center'>
            <Image
              src='/images/custom/nd-logo.png'
              alt='ND Logo'
              width={135}
              height={40}
            />
          </div>
        </div>

        {/* Main Content - Centered */}
        <div className='flex-1 flex flex-col justify-start mt-20 text-left'>
          {/* Main Heading with Emojis */}
          <Typography sx={{ letterSpacing: '-0.48px' }} className='font-bold text-[44px] text-black mb-4 leading-tight'>
            취미📚🏃👨‍🍳가 <br /> 만나는 곳,<br />
            이야기가 이어지다
          </Typography>

          {/* Description */}
          <Typography sx={{ letterSpacing: '-0.48px', color: '#8E8E93' }} className='text-[17px] font-semibold mb-12 max-w-sm'>
            좋아하는 관심사의 모임이나 수업에 참여하고, <br /> 새로운 취향을 발견해 보세요.
          </Typography>
        </div>

        {/* Action Button */}
        <div className='w-full max-w-sm'>
          <Button
            variant='contained'
            size='large'
            onClick={handleNext}
            className='w-full h-14 hover:bg-gray-700 text-white rounded-3xl text-[17px] font-semibold'
            sx={{
              backgroundColor: '#3D3D3D',
              letterSpacing: '-0.08px',
            }}
            fullWidth
          >
            전화번호로 시작하기
          </Button>
        </div>

        {/* Footer Disclaimer */}
        <div className='mt-6'>
          <Typography sx={{ letterSpacing: '-0.48px', color: '#8E8E93' }} className='text-left leading-relaxed max-w-sm text-[10px]'>
            "전화번호로 시작하기"를 탭하면 당사의 이용약관·개인정보처리방침·커뮤니티 기본 규칙 준수에 동의하게 됩니다. 당사가 데이터를 처리하는 방식은 개인정보처리방침과 쿠키 정책에서 확인하실 수 있습니다.
          </Typography>
        </div>

        {/* Error message for welcome screen */}
        <div
          className='absolute top-4 left-4 right-4 z-10 flex justify-center'
          style={{ display: error ? 'flex' : 'none' }}
        >
          <div className='max-w-sm'>
            <Alert severity='error' className='mb-4'>
              {error || ' '}
            </Alert>
          </div>
        </div>
      </div>

      {/* Step content for all other steps */}
      <div
        className='min-h-screen bg-white flex flex-col'
        style={{ display: currentStep !== 'welcome' ? 'flex' : 'none' }}
      >
        {/* Header with back button - exclude success step */}
        <div
          className='flex items-center mt-2 max-w-md mx-auto w-full px-4'
          style={{ visibility: currentStep !== 'success' ? 'visible' : 'hidden' }}
        >
          <IconButton
            onClick={handleBack}
            className='mr-4 pt-4 px-0'
            size='small'
            aria-label='뒤로'
            disabled={currentStep === 'success'}
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              className='w-6 h-6 text-gray-800'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M15 18l-6-6 6-6' />
            </svg>
          </IconButton>
        </div>

        {/* Error message - only show for non-welcome steps */}
        <div
          className='px-6 pt-4'
          style={{ display: error ? 'block' : 'none' }}
        >
          <div className='max-w-sm mx-auto'>
            <Alert severity='error' className='mb-4'>
              {error || ' '}
            </Alert>
          </div>
        </div>

        {/* Step content */}
        <div className='flex-1 p-4 flex flex-col'>
          <div className='max-w-md mx-auto w-full flex flex-col h-full'>
            {renderAllSteps()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
