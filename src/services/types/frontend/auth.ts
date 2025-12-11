// Frontend Authentication Types

export type LoginStep = 'welcome' | 'phone' | 'verification' | 'profile' | 'interests' | 'success'

export interface UserData {
  phoneNumber: string
  verificationCode: string
  nickname: string
  statusMessage: string
  province: string
  city?: string // Changed from district to city to match database schema
  categories: number[] // Changed from interests: string[] to categories: number[]
}

export interface LoginFormData {
  phoneNumber: string
  nickname?: string
}

export interface OTPFormData {
  phoneNumber: string
  code: string
}

export interface RegistrationFormData {
  phoneNumber: string
  nickname: string
  statusMessage?: string
  province: string
  city: string // Changed from district to city to match database schema
  categories: number[] // Changed from interests: string[] to categories: number[]
  level?: number
}

// Interface for the actual registration API request (only phoneNumber)
export interface RegistrationRequest {
  phoneNumber: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  // Login flow states
  otpLoading: boolean
  otpError: string | null
  verificationLoading: boolean
  verificationError: string | null
  loginLoading: boolean
  loginError: string | null
  registerLoading: boolean
  registerError: string | null
  nicknameChecking: boolean
  nicknameError: string | null
  nicknameAvailable: boolean | null
  profileUpdateLoading: boolean
  profileUpdateError: string | null
  categoriesLoading: boolean
  categoriesError: string | null
  categories: any[]
  citiesLoading: boolean
  citiesError: string | null
  provinces: any[]
  cities: any[]
}

import type { User } from '@/services/userApi';

// Re-export User type from userApi
export type { User };

export interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}
