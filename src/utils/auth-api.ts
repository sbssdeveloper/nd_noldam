import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { jwtVerify } from 'jose'
import { prisma } from '@/utils/prisma'

export interface AuthenticatedUser {
  id: number
  phoneNumber: string
  nickname?: string
  profileImage?: string
  city?: string
  province?: string
  categories: number[]
  status: string
}

export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Try to get token from NextAuth
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'development-secret-key-change-in-production' 
    })

    if (token?.user) {
      const user = token.user as any
      return {
        id: parseInt(user.id),
        phoneNumber: user.phoneNumber,
        nickname: user.nickname,
        profileImage: user.profileImage,
        city: user.city,
        province: user.province,
        categories: user.categories || [],
        status: user.status
      }
    }

    // Fallback: Try to get user from Authorization header
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)

      // Verify JWT token using jose
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments')
      const { payload } = await jwtVerify(token, secret, {
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE
      }).catch(() => ({ payload: null as any }))

      const userId = (payload as any)?.userId
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            phoneNumber: true,
            nickname: true,
            profileImage: true,
            city: true,
            province: true,
            categories: true,
            status: true
          }
        })

        if (user) {
          return user
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error getting authenticated user:', error)
    return null
  }
}

export function createAuthResponse(message: string, status: number = 401) {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}
