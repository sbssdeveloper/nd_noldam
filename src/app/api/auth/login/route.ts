import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'

import { validateRequiredFields } from '@/utils/api'

import { getUserDetails, generateJWT } from '@/utils/db-utils'
import { invalidRequestResponse, serverErrorResponse, successResponse } from '@/utils/general'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { phoneNumber, nickname } = body

    // Validate required fields
    const validation = validateRequiredFields(body, ['phoneNumber', 'nickname'])
    if (!validation.isValid) {
      return NextResponse.json(invalidRequestResponse(`Required fields missing: ${validation.missingFields.join(', ')}`), { status: 201 })
    }

    try {
      // Find user by phone number
      const userDetails = await getUserDetails(phoneNumber, 1)
      if (userDetails.length === 0) {
        return NextResponse.json(
          invalidRequestResponse('User not found'),
          { status: 201 }
        )
      }

      // Find user by nickname
      const userByNickname = await getUserDetails(nickname, 3)
      if (userByNickname.length === 0) {
        return NextResponse.json(
          invalidRequestResponse('User not found'),
          { status: 201 }
        )
      }

      // Use phone number login if available, otherwise use nickname
      const user = userDetails.length > 0 ? userDetails[0] : (await getUserDetails(nickname, 3))[0]

      // Generate JWT token
      const token = await generateJWT(user.id.toString(), 'user')

      return NextResponse.json(
        successResponse({
          user: {
            id: user.id,
            phoneNumber: user.phoneNumber,
            nickname: user.nickname,
            statusMessage: user.statusMessage,
            province: user.province,
            city: user.city,
            categories: user.categories,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          },
          token
        }, 'Login successful'),
        { status: 200 }
      )
    } catch (error) {
      return NextResponse.json(
        serverErrorResponse(),
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(serverErrorResponse(), { status: 500 })
  }
}
