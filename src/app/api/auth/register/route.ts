import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { validateRequiredFields } from '@/utils/api'

import { generateJWT } from '@/utils/db-utils'
import { prisma } from '@/utils/prisma'
import { sendSignupCompleteMessage } from '@/lib/sms/biztalk'

import { successResponse, errorResponse, validationErrorResponse } from '@/utils/general'

export async function POST(request: NextRequest) {
  try {
    // Check if required environment variables are set
    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        errorResponse('Server configuration error', 500),
        { status: 500 }
      )
    }
    
    // Test database connection
    try {
      await prisma.$connect()
    } catch (dbError) {
      return NextResponse.json(
        errorResponse('Database connection failed', 500),
        { status: 500 }
      )
    }
    
    const body = await request.json()
    const { phoneNumber } = body
    

    // Validate required fields - only phoneNumber is required for initial registration
    const validation = validateRequiredFields(body, ['phoneNumber'])
    if (!validation.isValid) {
      return NextResponse.json(
        validationErrorResponse(`Required fields missing: ${validation.missingFields.join(', ')}`),
        { status: 201 }
      )
    }


    // Check if user already exists by phone number
    const existingUserByPhone = await prisma.user.findFirst({
      where: {
        phoneNumber: phoneNumber
      }
    })
    
    
    if (existingUserByPhone) {
      // If user exists, return existing user data
      const token = await generateJWT(existingUserByPhone.id.toString(), 'user')
      return NextResponse.json(
        successResponse({
        user: {
          userUuid: existingUserByPhone.id,
          mobileNumber: existingUserByPhone.phoneNumber,
          nickname: existingUserByPhone.nickname,
          province: null,
          city: existingUserByPhone.city,
          categories: existingUserByPhone.categories || [],
          statusMessage: existingUserByPhone.statusMessage,
          createdAt: existingUserByPhone.createdAt,
          updatedAt: existingUserByPhone.updatedAt
        },
          token
        }, 'User found successfully'),
        { status: 200 }
      )
    }

    
    // Create new user with minimal required data (nullable fields left null)

    const newUser = await prisma.user.create({
      data: {
        phoneNumber: phoneNumber,
        categories: []
      }
    })

    
    if (!newUser) {
      return NextResponse.json(
        errorResponse('Failed to create user', 500),
        { status: 500 }
      )
    }

    // Send KakaoTalk welcome message for new user registration
    try {
      // Use nickname if available, otherwise use default '회원' (template will add '님')
      const memberName = newUser.nickname || '회원'
      await sendSignupCompleteMessage({
        recipientPhone: phoneNumber,
        memberName: memberName
      })
      console.log('[Register] KakaoTalk welcome message sent to new user:', newUser.id)
    } catch (kakaoError: any) {
      console.error('[Register] Failed to send KakaoTalk welcome message:', kakaoError)
      // Don't fail registration if notification fails
    }

    // Generate JWT token
    const token = await generateJWT(newUser.id.toString(), 'user')

    return NextResponse.json(
      successResponse({
        user: {
          userUuid: newUser.id,
          mobileNumber: newUser.phoneNumber,
          nickname: newUser.nickname,
          province: newUser.province,
          city: newUser.city,
          categories: newUser.categories || [],
          statusMessage: newUser.statusMessage,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt
        },
        token
      }, 'User created successfully'),
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      errorResponse('Internal server error', 500),
      { status: 500 }
    )
  }
}
