import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { validateJWT } from '@/utils/auth'
import { successResponse, errorResponse, validationErrorResponse } from '@/utils/general'
import { validateRequiredFields } from '@/utils/api'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  // JWT validation disabled - allow all requests

  try {
    const reqParams = request.nextUrl.searchParams

    const nickname = reqParams.get('nickname') ?? ''
    const province = reqParams.get('province') ?? ''
    const district = reqParams.get('district') ?? ''
    const categories = reqParams.get('categories') ?? ''
    const pageNo = reqParams.get('pageNo') ?? 1
    const perPage = reqParams.get('perPage') ?? 50
    const offset = (Number(pageNo) - 1) * Number(perPage)

    let countSql = `
      SELECT
        COUNT(*) "count"
      FROM
        users
      WHERE
        id IS NOT NULL
    `

    let sql = `
      SELECT
        id "userUuid",
        phone_number "mobileNumber",
        nickname,
        email "emailComm",
        province,
        city,
        categories,
        level,
        status_message "statusMessage",
        created_at "createdAt",
        updated_at "updatedAt"
      FROM
        users
      WHERE
        id IS NOT NULL
    `

    if (nickname.length > 0) {
      sql += ` AND nickname ILIKE '%${nickname}%'`
      countSql += ` AND nickname ILIKE '%${nickname}%'`
    }
    if (province.length > 0) {
      sql += ` AND province ILIKE '%${province}%'`
      countSql += ` AND province ILIKE '%${province}%'`
    }
    if (district.length > 0) {
      sql += ` AND city ILIKE '%${district}%'`
      countSql += ` AND city ILIKE '%${district}%'`
    }
    if (categories.length > 0) {
      sql += ` AND categories && ARRAY[${categories}]`
      countSql += ` AND categories && ARRAY[${categories}]`
    }

    sql += ` ORDER BY nickname ASC LIMIT ${perPage} OFFSET ${offset}`

    // Build where clause for Prisma
    const whereClause: any = {}
    
    if (nickname.length > 0) {
      whereClause.nickname = { contains: nickname, mode: 'insensitive' }
    }
    if (province.length > 0) {
      whereClause.province = { contains: province, mode: 'insensitive' }
    }
    if (district.length > 0) {
      whereClause.city = { contains: district, mode: 'insensitive' }
    }

    const [countResult, usersResult] = await Promise.all([
      prisma.user.count({ where: whereClause }),
      prisma.user.findMany({
        where: whereClause,
        orderBy: { nickname: 'asc' },
        skip: offset,
        take: Number(perPage)
      })
    ])

    const totalCount = countResult

    return NextResponse.json(
      successResponse({
        users: usersResult.map((user: any) => ({
          userUuid: user.id,
          mobileNumber: user.phoneNumber,
          nickname: user.nickname,
          provinceId: user.provinceId,
          district: user.district,
          categories: user.categories,
          statusMessage: user.statusMessage,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        })),
        totalCount,
        pageNo: Number(pageNo),
        perPage: Number(perPage)
      }, 'Users retrieved successfully'),
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(errorResponse('Internal server error', 500), { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  // JWT validation disabled - allow all requests

  try {
    const body = await request.json()
    const { 
      userId, 
      nickname, 
      email, 
      province, 
      city, 
      categories, 
      statusMessage, 
      profileImage,
      role,
      status,
      grade,
      adminEmail,
      adminPassword
    } = body
    
    
    // Check if userId is provided
    if (!userId) {
      return NextResponse.json(
        errorResponse('User ID is required', 400),
        { status: 400 }
      )
    }

    // Build update data object first to see what fields are being updated
    const updateData: any = {}

    if (nickname !== undefined) {
      updateData.nickname = nickname
    }
    if (province !== undefined) {
      updateData.province = province
    }
    if (city !== undefined) {
      updateData.city = city
    }
    if (statusMessage !== undefined) {
      updateData.statusMessage = statusMessage
    }
    if (profileImage !== undefined) {
      updateData.profileImage = profileImage
    }

    // Admin fields: role and status
    if (role !== undefined) {
      // Frontend now sends English keys: "user" or "manager"
      // Map any legacy Korean values to English keys for backwards compatibility
      const roleMap: { [key: string]: string } = {
        '유저': 'user',
        '관리자': 'manager',
        'user': 'user',
        'manager': 'manager'
      }
      ;(updateData as any).role = roleMap[role] || role || 'user'
    }

    if (status !== undefined) {
      // Map Korean status to database value
      const statusMap: { [key: string]: string } = {
        '활성': 'active',
        '블랙리스트': 'blacklisted',
        '대기중': 'pending'
      }
      updateData.status = statusMap[status] || status || 'active'
    }

    // Check if there are any fields to update
    const hasBasicUpdates = Object.keys(updateData).length > 0 || categories !== undefined

    if (!hasBasicUpdates && !grade) {
      return NextResponse.json(
        validationErrorResponse('No fields to update'),
        { status: 201 }
      )
    }

    // Only validate nickname if it's being updated
    if (updateData.nickname !== undefined) {
      const validation = validateRequiredFields(body, ['nickname'])
      if (!validation.isValid) {
        return NextResponse.json(
          validationErrorResponse(`Required fields missing: ${validation.missingFields.join(', ')}`),
          { status: 201 }
        )
      }

      // Check if nickname is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          nickname: nickname,
          id: { not: userId }
        }
      })

      if (existingUser) {
        return NextResponse.json(
          errorResponse('Nickname is already taken', 201),
          { status: 201 }
        )
      }
    }

    // Handle categories update
    if (categories !== undefined) {
      updateData.categories = categories
    }

    // Update user basic fields
    let updatedUser
    try {
      // First, ensure role column exists in database
      try {
        await prisma.$executeRawUnsafe(`
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'users' AND column_name = 'role'
            ) THEN
              ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT '유저';
            END IF;
          END $$;
        `)
      } catch (colError: any) {
        // Column might already exist, ignore error
      }

      // Separate role from other update data
      const roleValue = updateData.role
      const otherUpdateData = { ...updateData }
      delete otherUpdateData.role

      // Update other fields first (if any)
      if (Object.keys(otherUpdateData).length > 0) {
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: otherUpdateData
        })
      } else {
        // Fetch current user if no other fields to update
        updatedUser = await prisma.user.findUnique({
          where: { id: userId }
        })
      }

      // Update role separately using raw SQL (since Prisma types don't include it)
      if (roleValue !== undefined) {
        await prisma.$executeRaw(
          Prisma.sql`UPDATE users SET role = ${roleValue} WHERE id = ${userId}`
        )
      }

      // Fetch updated user to include role
      updatedUser = await prisma.user.findUnique({
        where: { id: userId }
      })
    } catch (dbError: any) {
      console.error('Database update error:', dbError)
      console.error('Update data:', JSON.stringify(updateData, null, 2))
      return NextResponse.json(
        errorResponse(`Database error: ${dbError.message || 'Failed to update user'}`, 500),
        { status: 500 }
      )
    }

    if (!updatedUser) {
      return NextResponse.json(
        errorResponse('Failed to update user', 500),
        { status: 500 }
      )
    }

    // Handle grade (communityRating level) update
    if (grade !== undefined && grade !== '') {
      // Map Korean grade to database level value
      const gradeToLevelMap: { [key: string]: string } = {
        '담장이': 'damjangi',
        '이음이': 'ieumi',
        '모꼬지': 'mokkoji',
        '씨앗': 'seed',
        '일반': 'normal'
      }
      const level = gradeToLevelMap[grade] || 'normal'

      // Update or create communityRating
      const existingRating = await prisma.communityRating.findUnique({
        where: { userId: userId }
      })

      if (existingRating) {
        await prisma.communityRating.update({
          where: { userId: userId },
          data: { level: level }
        })
      } else {
        await prisma.communityRating.create({
          data: {
            userId: userId,
            level: level,
            points: 0,
            followersCount: 0,
            postsCount: 0,
            meetingsCount: 0
          }
        })
      }
    }

    // Handle admin email/password setup (if role is being set to admin)
    const roleValue = role && typeof role === 'string' ? (role === '관리자' ? 'manager' : role === '유저' ? 'user' : role) : role
    if ((roleValue === 'manager' || role === 'manager') && adminEmail && adminPassword) {
      // Update profile email if profile exists
      const profile = await prisma.profile.findUnique({
        where: { userId: userId }
      })

      if (profile) {
        await prisma.profile.update({
          where: { userId: userId },
          data: { email: adminEmail }
        })
      } else {
        await prisma.profile.create({
          data: {
            userId: userId,
            email: adminEmail
          }
        })
      }
      // Note: Password handling would typically involve hashing and storing in a separate auth table
      // For now, we'll just update the email
    }

    // Fetch updated user with relations
    const userWithRelations = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        communityRating: true,
        profile: true
      }
    })

    return NextResponse.json(
      successResponse({
        user: {
          userUuid: updatedUser.id,
          mobileNumber: updatedUser.phoneNumber,
          nickname: updatedUser.nickname,
          province: updatedUser.province,
          city: updatedUser.city,
          categories: updatedUser.categories,
          profileImage: updatedUser.profileImage,
          statusMessage: updatedUser.statusMessage,
          role: (updatedUser as any).role || '유저',
          status: updatedUser.status,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
          lastLogin: updatedUser.lastLogin,
          grade: userWithRelations?.communityRating?.level || 'normal',
          email: userWithRelations?.profile?.email
        }
      }, 'Profile updated successfully'),
      { status: 200 }
    )
  } catch (error: any) {
    console.error('PUT /api/users error:', error)
    return NextResponse.json(
      errorResponse(`Internal server error: ${error.message || 'Unknown error'}`, 500), 
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        errorResponse('User ID is required', 400),
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        errorResponse('User not found', 404),
        { status: 404 }
      )
    }

    // Permanently delete the user account
    // This will cascade delete related records based on Prisma schema relationships
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json(
      successResponse({ message: 'User account deleted successfully' }, 'Account deleted successfully'),
      { status: 200 }
    )
  } catch (error: any) {
    console.error('DELETE /api/users error:', error)
    return NextResponse.json(
      errorResponse(`Internal server error: ${error.message || 'Unknown error'}`, 500),
      { status: 500 }
    )
  }
}
