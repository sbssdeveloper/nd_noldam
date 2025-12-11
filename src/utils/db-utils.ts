
import { jwtVerify, SignJWT } from 'jose'

import bcrypt from 'bcryptjs'

import { prisma } from '@/utils/prisma'

// get readable user type
export const getReadableUserType = (userType: string = '') => {
  if (userType === 'user') return 'USER'
  return 'USER' // Default to USER
}

// get reset password details
export const getResetPasswordDetails = async (userUuid = '', otpId = 0, otp = 0) => {
  const resetPasswordDetails = await prisma.oTP.findMany({
    where: {
      phoneNumber: userUuid,
      id: otpId,
      code: otp.toString(),
      isUsed: false
    },
    select: {
      id: true,
      code: true,
      createdAt: true
    }
  })

  return resetPasswordDetails
}

// get the user details
export const getUserDetails = async (whereField: string, needle: number = 0) => {
  let whereClause: any = {}

  if (needle === 0) whereClause = { email: whereField }
  else if (needle === 1) whereClause = { phoneNumber: whereField }
  else if (needle === 2) whereClause = { id: whereField }
  else if (needle === 3) whereClause = { nickname: whereField }

  const userDetails = await prisma.user.findMany({
    where: whereClause
  })

  return userDetails
}

// insert otp
export const insertOtp = async (
  uuid: string = '',
  phoneNumber: string = '',
  otp: number = 0,
  module: string = ''
) => {
  try {
    // First, remove expired OTPs
    await prisma.oTP.deleteMany({
      where: {
        expiresAt: {
          lt: new Date() // Delete OTPs that have expired
        }
      }
    })
    
    // Remove any existing OTP for this phone number (replace old with new)
    await prisma.oTP.deleteMany({
      where: {
        phoneNumber: phoneNumber,
        isUsed: false
      }
    })
    
    const result = await prisma.oTP.create({
      data: {
        phoneNumber: phoneNumber,
        code: otp.toString(),
        expiresAt: new Date(Date.now() +  60 * 1000) // 5 minutes from now
      }
    })
    
    return result.id
  } catch (error) {
    console.error('Error inserting OTP:', error)
    return false
  }
}

// generates JWT
export const generateJWT = async (uuid: string = '', userType: string = '') => {
  const encoder = new TextEncoder()
  const jwtSecretKey = encoder.encode(process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments')
  const token = await new SignJWT({
    uid: uuid,
    role: getReadableUserType(userType)
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(process.env.JWT_ISSUER || 'StarterKit')
    .setAudience(process.env.JWT_AUDIENCE || 'starter-kit-app')
    .setExpirationTime(process.env.JWT_EXPIRY_STRING || '7d')
    .sign(jwtSecretKey)

  return token
}

// hash password
export const hashPassword = async (password: string) => {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

// compare password
export const comparePassword = async (password: string, hashedPassword: string) => {
  return await bcrypt.compare(password, hashedPassword)
}

// get random number for OTP
export const getRandomNumber = () => {
  const randomNumber = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000
  return randomNumber
}
