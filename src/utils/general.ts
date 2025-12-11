import { startOfDay, endOfDay } from 'date-fns'

import { fromZonedTime } from 'date-fns-tz'

const DEFAULT_TIMEZONE = 'Asia/Kolkata'

// String utilities
export const ensurePrefix = (str: string, prefix: string) => (str.startsWith(prefix) ? str : `${prefix}${str}`)
export const withoutSuffix = (str: string, suffix: string) =>
  str.endsWith(suffix) ? str.slice(0, -suffix.length) : str
export const withoutPrefix = (str: string, prefix: string) => (str.startsWith(prefix) ? str.slice(prefix.length) : str)

// Initials utility
export const getInitials = (string: string) =>
  string.split(/\s/).reduce((response, word) => (response += word.slice(0, 1)), '')

// OTP Storage (in-memory storage for testing purposes)
export const otpStorage = new Map<string, { code: string; expiresAt: Date; isUsed: boolean }>()

export const getRandomNumber = () => {
  const randomNumber = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000
  return randomNumber
}

export const getUtcRangeFromLocalDateTime = (
  fromDate: string,
  toDate: string,
  timezone = DEFAULT_TIMEZONE
) => {
  const localFromDate = new Date(fromDate)
  const localToDate = new Date(toDate)
  
  const utcStart = fromZonedTime(startOfDay(localFromDate), timezone)
  const utcEnd = fromZonedTime(endOfDay(localToDate), timezone)

  return { utcStart, utcEnd }
}

// Admin functionality removed
// export const isAdmin = (userType: string = '') => {
//   if (userType === 'admin' || userType === 'superadmin') return true
//   return false
// }

// Standardized response format
export const successResponse = (data: any = null, message: string = 'Success') => {
  return {
    success: true,
    message,
    data
  }
}

export const errorResponse = (reason: string, statusCode: number = 201) => {
  return {
    success: false,
    reason,
    statusCode
  }
}

// Resource not found but can be created - use 201
export const resourceNotFoundResponse = (reason: string = 'Resource not found') => {
  return {
    success: false,
    reason,
    statusCode: 201
  }
}

// Validation errors - use 201 (not 400)
export const validationErrorResponse = (reason: string = 'Validation error') => {
  return {
    success: false,
    reason,
    statusCode: 201
  }
}

// Business logic errors - use 201 (not 400)
export const businessLogicErrorResponse = (reason: string = 'Business logic error') => {
  return {
    success: false,
    reason,
    statusCode: 201
  }
}

// Legacy functions for backward compatibility (deprecated)
export const unAuthorizedResponse = () => {
  return errorResponse('Unauthorized access', 201)
}

export const forbiddenResponse = () => {
  return errorResponse('Forbidden access', 201)
}

export const invalidRequestResponse = (message: string = 'Invalid request') => {
  return errorResponse(message, 201)
}

export const serverErrorResponse = (message: string = 'Internal server error') => {
  return errorResponse(message, 500)
}
