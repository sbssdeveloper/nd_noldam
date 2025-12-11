// Auth utilities that don't depend on the store

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

import { prisma } from '@/utils/prisma'
import { getUserDetails } from '@/utils/db-utils'

// JWT Payload interface
export interface JWTPayload {
  uid: string
  role: string
  iat: number
  exp: number
}

// Local JWT payload interface for server-side
interface ServerJWTPayload {
  uid: string
  userId?: string
  role: string
  iat: number
  exp: number
}

// JWT Token utilities
// Check if token is expired
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as JWTPayload
    const currentTime = Math.floor(Date.now() / 1000)
    return payload.exp < currentTime
  } catch (error) {
    return true // If we can't decode the token, consider it expired
  }
}

// Decode JWT token
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    if (!token || typeof token !== 'string') {
      return null
    }
    
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }
    
    const payload = JSON.parse(atob(parts[1])) as JWTPayload
    return payload
  } catch (error) {
    return null
  }
}

// Get user ID from token
export const getUserIdFromToken = (token: string): string | null => {
  const payload = decodeToken(token)
  return payload?.uid || null
}

// Check if token is valid (not expired and has required fields)
export const isTokenValid = (token: string): boolean => {
  if (!token) return false
  
  const payload = decodeToken(token)
  if (!payload) return false
  
  if (isTokenExpired(token)) return false
  
  return !!(payload.uid && payload.role)
}

// Check if user is authenticated
export const isAuthenticated = (token?: string): boolean => {
  return !!(token && isTokenValid(token))
}

// Get auth headers
export const getAuthHeaders = (token?: string): Record<string, string> => {
  if (token && isTokenValid(token)) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }
  
  return {
    'Content-Type': 'application/json'
  }
}

// Get auth header
export const getAuthHeader = (token?: string) => {
  return token && isTokenValid(token) ? `Bearer ${token}` : null
}

// Handle auth error
export const handleAuthError = (error: any) => {
  console.error('Auth Error:', error)
  
  if (error.response) {
    return {
      status: 'failed',
      reason: error.response.data?.reason || 'Authentication failed',
      errorcode: error.response.data?.errorcode || 'AUTH001'
    }
  }
  
  return {
    status: 'failed',
    reason: error.message || 'Authentication error',
    errorcode: 'AUTH001'
  }
}

// Redirect logic helpers
export const shouldRedirectToHome = (isAuthenticated: boolean, loading: boolean, user: any) => {
  return isAuthenticated && !loading && user
}

export const shouldRedirectToLogin = (isAuthenticated: boolean, loading: boolean, user: any) => {
  return !isAuthenticated && !loading && !user
}

// Clear persisted authentication data
export const clearPersistedAuth = () => {
  // Clear localStorage/sessionStorage if needed
  if (typeof window !== 'undefined') {
    localStorage.removeItem('persist:noldam-root')
    sessionStorage.removeItem('persist:noldam-root')
  }
}

// JWT validation for API routes
export const validateJWT = async (authHeader: string | null = null) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, reason: 'Missing or invalid token' }
  }
  try {
    const token = authHeader.split(' ')[1]
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments')
    const { payload } = await jwtVerify(token, secret)
    const userDetails = await getUserDetails((payload?.uid || '') as string, 2)
    if (userDetails.length === 0) return { valid: false, reason: 'Invalid token', errorcode: 'AUTH001' }
    return { valid: true, userDetails: { userUuid: userDetails[0].id, userType: 'user' } }
  } catch {
    return { valid: false, reason: 'Unauthorized', errorcode: 'AUTH002' }
  }
}

// JWT generation
export const generateJWT = async (uuid: string = '', userType: string = '') => {
  const encoder = new TextEncoder()
  const jwtSecretKey = encoder.encode(process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments')
  const token = await new SignJWT({
    uid: uuid,
    role: getReadableUserType(userType)
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(process.env.JWT_EXPIRY_STRING || '24h')
    .sign(jwtSecretKey)

  return token
}

// Get readable user type
export const getReadableUserType = (userType: string = '') => {
  if (userType === 'user') return 'USER'
  if (userType === 'moderator') return 'MODERATOR'
  return 'USER' // Default to USER
}

// Next.js server-side token verification
export async function verifyToken(request: NextRequest): Promise<ServerJWTPayload | null> {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments')
    const { payload } = await jwtVerify(token, secret)
    
    return payload as unknown as ServerJWTPayload
  } catch (error) {
    console.error('Token verification error:', error)

    return null
  }
}

// Next.js server-side user authentication
export async function authenticateUser(request: NextRequest): Promise<{ user: any; payload: ServerJWTPayload } | null> {
  try {
    const payload = await verifyToken(request)

    if (!payload) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(payload.userId || '0') }
    })

    if (!user) {
      return null
    }

    return { user, payload }
  } catch (error) {
    console.error('Authentication error:', error)

    return null
  }
}

// Next.js middleware wrapper for authentication
export function withAuth(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const authResult = await authenticateUser(request)
    
    if (!authResult) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Add user to request context
    const requestWithUser = Object.assign(request, { user: authResult.user })
    
    return handler(requestWithUser)
  }
}
