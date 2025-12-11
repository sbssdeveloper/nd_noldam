import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { validateRequiredFields } from '@/utils/api'

import { getRandomNumber, insertOtp } from '@/utils/db-utils'
import { sendSignupVerificationCode } from '@/lib/sms/biztalk'
import { prisma } from '@/utils/prisma'

import { successResponse, errorResponse, validationErrorResponse } from '@/utils/general'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber: rawPhoneNumber, module } = body


    const validation = validateRequiredFields(body, ['phoneNumber', 'module'])
    if (!validation.isValid) {
      return NextResponse.json(
        validationErrorResponse(`Required fields missing: ${validation.missingFields.join(', ')}`),
        { status: 400 }
      )
    }

    const phoneNumber = String(rawPhoneNumber || '').replace(/\D/g, '')

    if (!phoneNumber || phoneNumber.length < 8) {
      return NextResponse.json(
        validationErrorResponse('Invalid phone number'),
        { status: 400 }
      )
    }

 
    const moduleUpper = String(module || '').toUpperCase()
    if (!['LOGIN', 'SIGNUP', 'FORGOTPW'].includes(moduleUpper)) {
      return NextResponse.json(
        validationErrorResponse('Invalid module. Must be LOGIN, SIGNUP, or FORGOTPW'),
        { status: 400 }
      )
    }

    if (moduleUpper === 'SIGNUP') {
      const existingUser = await prisma.user.findFirst({
        where: { phoneNumber }
      })
      
      if (existingUser) {
        return NextResponse.json(
          errorResponse('User with this phone number already exists', 400),
          { status: 400 }
        )
      }
    }


    const otp = getRandomNumber()
    
    try {
      console.log('[OTP] inserting', { phoneNumber, module: moduleUpper })
     
      const otpId = await insertOtp('', phoneNumber, otp, moduleUpper)
      console.log('[OTP] inserted', { otpId })
      
      if (!otpId) {
        return NextResponse.json(
          errorResponse('Failed to generate OTP', 500),
          { status: 500 }
        )
      }

      
      try {
        console.log('[OTP] sending via BizTalk', { phoneNumber })
        await sendSignupVerificationCode(phoneNumber, String(otp))
        console.log('[OTP] sent')
      } catch (smsError: any) {
        // Allow success in non-production or when explicitly permitted via env flag
        const allowFallback = process.env.ALLOW_FAKE_SMS === '1' || process.env.NODE_ENV !== 'production'
        console.error('[OTP] SMS send failed:', smsError?.message || smsError)
        if (!allowFallback) {
          return NextResponse.json(
            errorResponse(smsError?.message || 'Failed to send OTP', 500),
            { status: 500 }
          )
        }
      
        console.warn('[OTP] Falling back to success (dev mode). OTP stored in DB but SMS not sent.')
      }
      
      return NextResponse.json(
        successResponse({ phoneNumber, module: moduleUpper }, 'OTP sent successfully'),
        { status: 200 }
      )
    } catch (error: any) {
      console.error('[OTP] internal failure:', error?.message || error)
      return NextResponse.json(
        errorResponse(error?.message || 'Failed to send OTP', 500),
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      errorResponse('Internal server error', 500),
      { status: 500 }
    )
  }
}

// import { NextResponse } from 'next/server'
// import type { NextRequest } from 'next/server'
// import { validateRequiredFields } from '@/utils/api'

// import { getRandomNumber, insertOtp } from '@/utils/db-utils'
// import { prisma } from '@/utils/prisma'

// import { successResponse, errorResponse, validationErrorResponse } from '@/utils/general'

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json()
//     const { phoneNumber, module } = body

//     const validation = validateRequiredFields(body, ['phoneNumber', 'module'])
//     if (!validation.isValid) {
//       return NextResponse.json(
//         validationErrorResponse(`Required fields missing: ${validation.missingFields.join(', ')}`),
//         { status: 201 }
//       )
//     }

    
//     if (!['LOGIN', 'SIGNUP', 'FORGOTPW'].includes(module)) {
//       return NextResponse.json(
//         validationErrorResponse('Invalid module. Must be LOGIN, SIGNUP, or FORGOTPW'),
//         { status: 201 }
//       )
//     }

   
//     if (module === 'SIGNUP') {
//       const existingUser = await prisma.user.findFirst({
//         where: { phoneNumber }
//       })
      
//       if (existingUser) {
//         return NextResponse.json(
//           errorResponse('User with this phone number already exists', 201),
//           { status: 201 }
//         )
//       }
//     }


//     const otp = getRandomNumber()
    
//     try {
      
//       const otpId = await insertOtp('', phoneNumber, otp, module)
      
//       if (!otpId) {
//         return NextResponse.json(
//           errorResponse('Failed to generate OTP', 500),
//           { status: 500 }
//         )
//       }

      
      
//       return NextResponse.json(
//         successResponse({ phoneNumber, module }, 'OTP sent successfully'),
//         { status: 200 }
//       )
//     } catch (error) {
//       console.error('Database error in send-otp:', error)
//       return NextResponse.json(
//         errorResponse('Failed to send OTP', 500),
//         { status: 500 }
//       )
//     }
//   } catch (error) {
//     console.error('Send OTP error:', error)
//     return NextResponse.json(
//       errorResponse('Internal server error', 500),
//       { status: 500 }
//     )
//   }
// }
