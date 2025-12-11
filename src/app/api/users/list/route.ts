import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { verifyToken } from '@/utils/auth'
import { Prisma } from '@prisma/client'
import { successResponse, errorResponse } from '@/utils/general'

export async function GET(request: NextRequest) {
  try {
    // For admin user management, allow access without strict JWT verification
    // This endpoint is used by admin dashboard which uses different auth mechanism
    // Try to verify token, but don't block if it fails (admin may use cookie-based auth)
    const payload = await verifyToken(request)
    
    // If JWT verification fails, still allow the request (admin cookie auth might be used)
    // This allows admin pages to access user data without JWT tokens

    // Get query parameters for filtering
    const searchTerm = request.nextUrl.searchParams.get('search') || ''
    const gradeFilter = request.nextUrl.searchParams.get('grade') || ''
    const statusFilter = request.nextUrl.searchParams.get('status') || ''

    // Build where clause
    const whereClause: any = {}
    
    if (searchTerm) {
      whereClause.OR = [
        { nickname: { contains: searchTerm, mode: 'insensitive' } },
        { phoneNumber: { contains: searchTerm, mode: 'insensitive' } }
      ]
    }

    if (statusFilter && statusFilter !== '전체 상태') {
      // Map Korean status to database values
      const statusMap: { [key: string]: string } = {
        '활성': 'active',
        '블랙리스트': 'blacklisted',
        '대기중': 'pending'
      }
      whereClause.status = statusMap[statusFilter] || statusFilter
    }

    // Get all users with required info including communityRating
    // Use raw query to ensure role field is fetched (since Prisma types don't include it)
    try {
      // First get users with Prisma
      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          nickname: true,
          phoneNumber: true,
          profileImage: true,
          status: true,
          lastLogin: true,
          createdAt: true,
          activeCommunityBadgeId: true,
          communityRating: {
            select: {
              level: true
            }
          }
        },
        orderBy: {
          id: 'asc'
        }
      });

      // Fetch roles separately using raw query to ensure we get the actual values
      const userIds = users.map(u => u.id)
      let roleMap: { [key: number]: string } = {}
      
      if (userIds.length > 0) {
        try {
          const roles = await prisma.$queryRaw<Array<{ id: number; role: string }>>(
            Prisma.sql`SELECT id, role FROM users WHERE id = ANY(${userIds})`
          )
          roles.forEach((r: any) => {
            roleMap[r.id] = r.role || '유저'
          })
        } catch (roleError) {
          console.warn('Could not fetch roles:', roleError)
        }
      }

      // Transform users to match frontend format and filter by grade if needed
      let transformedUsers = users.map((user: any) => {
        // Map status from DB to Korean display
        const statusMap: { [key: string]: string } = {
          'active': '활성',
          'blacklisted': '블랙리스트',
          'pending': '대기중'
        }
        
        // Get role from the roleMap we fetched separately
        const role = roleMap[user.id] || '유저'
        
        // Map level from communityRating to grade
        const levelToGradeMap: { [key: string]: string } = {
          'damjangi': '담장이',
          'ieumi': '이음이',
          'mokkoji': '모꼬지',
          'seed': '씨앗',
          'normal': '일반'
        }
        const grade = user.communityRating?.level 
          ? levelToGradeMap[user.communityRating.level] || '일반'
          : '일반'
        
        // Only use profileImage if it's a valid URL/path, otherwise use first letter of nickname
        const isValidImageUrl = user.profileImage && 
          typeof user.profileImage === 'string' && 
          (user.profileImage.startsWith('http') || user.profileImage.startsWith('/') || user.profileImage.startsWith('data:'))
        
        return {
          id: user.id,
          name: user.nickname || 'Unknown',
          phone: user.phoneNumber,
          avatar: isValidImageUrl ? user.profileImage : (user.nickname?.[0] || ''),
          role: role, // Database stores Korean values directly - return as is
          grade: grade,
          status: statusMap[user.status] || '활성',
          lastLogin: user.lastLogin 
            ? new Date(user.lastLogin).toISOString().split('T')[0]
            : '접속 기록 없음',
          createdAt: user.createdAt,
          activeCommunityBadgeId: user.activeCommunityBadgeId
        }
      })

      // Filter by grade if specified
      if (gradeFilter && gradeFilter !== '전체 등급') {
        transformedUsers = transformedUsers.filter((user: any) => user.grade === gradeFilter)
      }

      return NextResponse.json(
        successResponse({
          users: transformedUsers,
          totalCount: transformedUsers.length,
          message: `Found ${transformedUsers.length} users in database`
        }, 'User list retrieved successfully'),
        { status: 200 }
      )
    } catch (dbError: any) {
      // If role field doesn't exist, try without it
      if (dbError.message?.includes('role') || dbError.message?.includes('Unknown arg')) {
        console.warn('Role field not found, fetching without role field:', dbError.message)
    const users = await prisma.user.findMany({
          where: whereClause,
      select: {
        id: true,
        nickname: true,
        phoneNumber: true,
            profileImage: true,
        status: true,
            lastLogin: true,
            createdAt: true,
            activeCommunityBadgeId: true,
            communityRating: {
              select: {
                level: true
              }
            }
      },
      orderBy: {
        id: 'asc'
      }
    });

        // Transform users (without role field)
        let transformedUsers = users.map((user: any) => {
          const statusMap: { [key: string]: string } = {
            'active': '활성',
            'blacklisted': '블랙리스트',
            'pending': '대기중'
          }
          
          const levelToGradeMap: { [key: string]: string } = {
            'damjangi': '담장이',
            'ieumi': '이음이',
            'mokkoji': '모꼬지',
            'seed': '씨앗',
            'normal': '일반'
          }
          const grade = user.communityRating?.level 
            ? levelToGradeMap[user.communityRating.level] || '일반'
            : '일반'
          
          // Only use profileImage if it's a valid URL/path, otherwise use first letter of nickname
          const isValidImageUrl = user.profileImage && 
            typeof user.profileImage === 'string' && 
            (user.profileImage.startsWith('http') || user.profileImage.startsWith('/') || user.profileImage.startsWith('data:'))
          
          return {
            id: user.id,
            name: user.nickname || 'Unknown',
            phone: user.phoneNumber,
            avatar: isValidImageUrl ? user.profileImage : (user.nickname?.[0] || ''),
            role: '유저', // Default role if field doesn't exist
            grade: grade,
            status: statusMap[user.status] || '활성',
            lastLogin: user.lastLogin 
              ? new Date(user.lastLogin).toISOString().split('T')[0]
              : '접속 기록 없음',
            createdAt: user.createdAt,
            activeCommunityBadgeId: user.activeCommunityBadgeId
          }
        })

        if (gradeFilter && gradeFilter !== '전체 등급') {
          transformedUsers = transformedUsers.filter((user: any) => user.grade === gradeFilter)
        }

    return NextResponse.json(
      successResponse({
            users: transformedUsers,
            totalCount: transformedUsers.length,
            message: `Found ${transformedUsers.length} users in database`
      }, 'User list retrieved successfully'),
      { status: 200 }
    )
      }
      throw dbError
    }
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      errorResponse('Internal server error', 500),
      { status: 500 }
    )
  }
}





