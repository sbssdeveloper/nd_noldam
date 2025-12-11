import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { prisma } from '@/utils/prisma'
import { generateJWT } from '@/utils/db-utils'
import { successResponse, errorResponse, resourceNotFoundResponse } from '@/utils/general'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json(
        errorResponse('Phone number is required', 201),
        { status: 201 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findFirst({
      where: { phoneNumber }
    })

    if (!user) {
      return NextResponse.json(
        resourceNotFoundResponse('User not found'),
        { status: 201 }
      )
    }

    // No need to fetch province/country data since we store names directly

    // Generate JWT token
    const token = await generateJWT(user.id.toString(), 'user')

    return NextResponse.json(
      successResponse({
        user: {
          userUuid: user.id,
          mobileNumber: user.phoneNumber,
          nickname: user.nickname,
          province: user.province,
          city: user.city,
          categories: user.categories,
          statusMessage: user.statusMessage,
          profileImage: user.profileImage,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        token
      }, 'Login successful'),
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      errorResponse('Failed to login', 500),
      { status: 500 }
    )
  }
}
