import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { validateRequiredFields } from '@/utils/api'

import { prisma } from '@/utils/prisma'
import { successResponse, errorResponse, validationErrorResponse } from '@/utils/general'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber: rawPhoneNumber, code, module = 'LOGIN' } = body

  //  Validate required fields
    const validation = validateRequiredFields(body, ['phoneNumber', 'code'])
    if (!validation.isValid) {
      return NextResponse.json(
        validationErrorResponse(`Required fields missing: ${validation.missingFields.join(', ')}`),
        { status: 400 }
      )
    }

   // Normalize phone number (digits only)
    const phoneNumber = String(rawPhoneNumber || '').replace(/\D/g, '')

  //  Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        validationErrorResponse('OTP must be 6 digits'),
        { status: 400 }
      )
    }

   // TEMPORARY BYPASS: Accept OTP '111111' without DB checks
    // if (code == '111111') {
    //   return NextResponse.json(
    //     successResponse({ phoneNumber }, 'OTP verified successfully'),
    //     { status: 200 }
    //   )
    // } else {
    //   return NextResponse.json(
    //     validationErrorResponse('Invalid or expired OTP'),
    //     { status: 201 }
    //   )
    // }

   
    try {
    
      const otpRecord = await prisma.oTP.findFirst({
        where: {
          phoneNumber: phoneNumber,
          code: code,
          isUsed: false,
          expiresAt: {
            gt: new Date()
          }
        }
      })

      if (!otpRecord) {
        return NextResponse.json(
          validationErrorResponse('Invalid or expired OTP'),
          { status: 400 }
        )
      }

      await prisma.oTP.update({
        where: { id: otpRecord.id },
        data: { isUsed: true }
      })

      return NextResponse.json(
        successResponse({ phoneNumber }, 'OTP verified successfully'),
        { status: 200 }
      )
    } catch (error) {
      return NextResponse.json(
        errorResponse('Failed to verify OTP', 500),
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

// import { prisma } from '@/utils/prisma'
// import { successResponse, errorResponse, validationErrorResponse } from '@/utils/general'

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json()
//     const { phoneNumber, code, module = 'LOGIN' } = body

//     // Validate required fields
//     const validation = validateRequiredFields(body, ['phoneNumber', 'code'])
//     if (!validation.isValid) {
//       return NextResponse.json(
//         validationErrorResponse(`Required fields missing: ${validation.missingFields.join(', ')}`),
//         { status: 201 }
//       )
//     }

//     // Validate OTP format (6 digits)
//     // if (!/^\d{6}$/.test(code)) {
//     //   return NextResponse.json(
//     //     validationErrorResponse('OTP must be 6 digits'),
//     //     { status: 201 }
//     //   )
//     // }

//     // TEMPORARY BYPASS: Accept OTP '111111' without DB checks
//     if (code == '111111') {
//       return NextResponse.json(
//         successResponse({ phoneNumber }, 'OTP verified successfully'),
//         { status: 200 }
//       )
//     } else {
//       return NextResponse.json(
//         validationErrorResponse('Invalid or expired OTP'),
//         { status: 201 }
//       )
//     }

//     /*
//     // ORIGINAL DB VERIFICATION (TEMPORARILY DISABLED)
//     try {
//       // Verify OTP from database
//       const otpRecord = await prisma.oTP.findFirst({
//         where: {
//           phoneNumber: phoneNumber,
//           code: code,
//           isUsed: false,
//           expiresAt: {
//             gt: new Date()
//           }
//         }
//       })

//       if (!otpRecord) {
//         return NextResponse.json(
//           validationErrorResponse('Invalid or expired OTP'),
//           { status: 201 }
//         )
//       }

//       // Mark OTP as used
//       await prisma.oTP.update({
//         where: { id: otpRecord.id },
//         data: { isUsed: true }
//       })

//       return NextResponse.json(
//         successResponse({ phoneNumber }, 'OTP verified successfully'),
//         { status: 200 }
//       )
//     } catch (error) {
//       console.error('Verify OTP error:', error)
//       return NextResponse.json(
//         errorResponse('Failed to verify OTP', 500),
//         { status: 500 }
//       )
//     }
//     */
//   } catch (error) {
//     console.error('Verify OTP error:', error)
//     return NextResponse.json(
//       errorResponse('Internal server error', 500),
//       { status: 500 }
//     )
//   }
// }
