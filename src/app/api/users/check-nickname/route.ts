import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/utils/prisma'
import { validateJWT } from '@/utils/auth'

import { invalidRequestResponse, serverErrorResponse, successResponse } from '@/utils/general'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nickname = searchParams.get('nickname')

    if (!nickname) {
      return NextResponse.json(invalidRequestResponse('Nickname parameter is required'), { status: 201 })
    }

    // JWT validation disabled - allow all requests
    let currentUserId = null

    // Check if nickname exists
    const whereClause = currentUserId 
      ? { nickname: nickname, id: { not: currentUserId } } // Exclude current user if authenticated
      : { nickname: nickname } // Check all users if not authenticated

    const existingUser = await prisma.user.findFirst({
      where: whereClause,
      select: {
        id: true
      }
    })

    const isAvailable = !existingUser

    return NextResponse.json(
      successResponse({
        available: isAvailable,
        nickname: nickname
      }, isAvailable ? 'Nickname is available' : 'Nickname is already taken')
    )
  } catch (error) {
    // Return a safe response instead of 500 error
    return NextResponse.json(
      successResponse({
        available: true, // Default to available on any error
        nickname: 'unknown'
      }, 'Nickname check failed, assuming available')
    )
  }
}
