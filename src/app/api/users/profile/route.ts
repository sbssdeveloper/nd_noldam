import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { verifyToken } from '@/utils/auth'
import { successResponse, errorResponse } from '@/utils/general'

export async function GET(request: NextRequest) {
  try {
    // Profile API called
    
    // Get authenticated user from JWT token
    const payload = await verifyToken(request)
    
    if (!payload || (!payload.uid && !payload.userId)) {
      // No valid token payload found
      return NextResponse.json(
        errorResponse('Unauthorized', 401),
        { status: 401 }
      )
    }

    // Support querying other users by id via ?userId=
    const url = new URL(request.url)
    const queryUserId = url.searchParams.get('userId')
    // Query userId

    let userId: number;

    if (queryUserId) {
      // If userId is provided in query params, use it
      userId = parseInt(queryUserId)
      if (isNaN(userId) || userId <= 0) {
        // Invalid query user ID
        return NextResponse.json(
          errorResponse('Invalid user ID. User ID must be a positive integer.', 400),
          { status: 400 }
        )
      }
    } else {
      // If no userId provided, use current user from token
      const currentUserIdString = payload.uid || payload.userId
      if (!currentUserIdString) {
        // No user ID found in token payload
        return NextResponse.json(
          errorResponse('No user ID found in token', 401),
          { status: 401 }
        )
      }
      
      userId = parseInt(currentUserIdString as string)
      if (isNaN(userId) || userId <= 0) {
        // Invalid user ID from token
        return NextResponse.json(
          errorResponse('Invalid user ID in token', 401),
          { status: 401 }
        )
      }
    }
    
    // Final userId

    // Fetch user with optimized data loading - only counts and limited data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        activeCommunityBadge: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            description: true
          }
        },
        // Only get counts, not full data - huge performance improvement
        _count: {
          select: {
            followers: true,
            following: true,
            meetings: true,
            participants: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        errorResponse(`User with ID ${userId} not found`, 404),
        { status: 404 }
      )
    }

    // Load followers/following only when specifically requested (pagination later)
    const loadDetailedSocial = false // Can be controlled via query param
    let followersList: any[] = []
    let followingList: any[] = []
    
    if (loadDetailedSocial) {
      // Only load limited followers (max 20) with basic info
      const followers = await prisma.follower.findMany({
        where: { userId },
        take: 20,
        orderBy: { startedOn: 'desc' },
        select: {
          followingUser: {
            select: {
              id: true,
              nickname: true,
              profileImage: true,
              status: true
            }
          },
          startedOn: true
        }
      })
      
      followersList = followers.map(f => ({
        ...f.followingUser,
        startedOn: f.startedOn
      }))

      // Only load limited following (max 20) with basic info
      const following = await prisma.follower.findMany({
        where: { following: userId },
        take: 20,
        orderBy: { startedOn: 'desc' },
        select: {
          user: {
            select: {
              id: true,
              nickname: true,
              profileImage: true,
              status: true
            }
          },
          startedOn: true
        }
      })
      
      followingList = following.map(f => ({
        ...f.user,
        startedOn: f.startedOn
      }))
    }

    // User found - use optimized counts
    const followersCount = user._count.followers
    const followingCount = user._count.following
    const meetingsCreatedCount = user._count.meetings
    const meetingsJoinedCount = user._count.participants

    // Meetings data - load separately and limited
    const meetingsCreated: any[] = []
    const meetingsJoined: any[] = []

    const profileData = {
      user: {
        id: user.id,
        nickname: user.nickname,
        phoneNumber: user.phoneNumber,
        statusMessage: user.statusMessage,
        profileImage: user.profileImage,
        city: user.city,
        province: user.province,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        activeCommunityBadge: user.activeCommunityBadge || null
      },
      profile: user.profile ? {
        fullName: user.profile.fullName,
        dob: user.profile.dob,
        email: user.profile.email,
        nationality: user.profile.nationality,
        gender: user.profile.gender,
        description: user.profile.description,
        ageVerified: user.profile.ageVerified,
        agreePersonal: user.profile.agreePersonal,
        agreeThirdParty: user.profile.agreeThirdParty,
        verifiedAt: user.profile.verifiedAt,
        publicVisibility: user.profile.publicVisibility,
        feedPrivacy: user.profile.feedPrivacy ?? true,
        meetingsPrivacy: user.profile.meetingsPrivacy ?? true,
        badgesPrivacy: user.profile.badgesPrivacy ?? true
      } : null,
      stats: {
        followersCount,
        followingCount,
        meetingsCreatedCount,
        meetingsJoinedCount
      },
      // Return limited data or empty arrays - load separately when needed
      followers: followersList,
      following: followingList,
      meetingsCreated,
      meetingsJoined
    }

    return NextResponse.json(
      successResponse(profileData, 'Profile data retrieved successfully'),
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      errorResponse('Internal server error', 500),
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user from JWT token
    const payload = await verifyToken(request)
    
    if (!payload || (!payload.uid && !payload.userId)) {
      return NextResponse.json(
        errorResponse('Unauthorized', 401),
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      publicVisibility, 
      feedPrivacy, 
      meetingsPrivacy, 
      badgesPrivacy,
      tabType 
    } = body
    
    // Get current user ID from token
    const currentUserIdString = payload.uid || payload.userId
    if (!currentUserIdString) {
      return NextResponse.json(
        errorResponse('No user ID found in token', 401),
        { status: 401 }
      )
    }
    
    const userId = parseInt(currentUserIdString as string)
    if (isNaN(userId) || userId <= 0) {
      return NextResponse.json(
        errorResponse('Invalid user ID in token', 401),
        { status: 401 }
      )
    }

    // Prepare update data based on what's being updated
    let updateData: any = {}
    
    // Handle individual tab privacy updates
    if (tabType) {
      if (tabType === 'feed' && typeof feedPrivacy === 'boolean') {
        updateData.feedPrivacy = feedPrivacy
      } else if (tabType === 'meetings' && typeof meetingsPrivacy === 'boolean') {
        updateData.meetingsPrivacy = meetingsPrivacy
      } else if (tabType === 'badges' && typeof badgesPrivacy === 'boolean') {
        updateData.badgesPrivacy = badgesPrivacy
      } else {
        return NextResponse.json(
          errorResponse('Invalid tab type or privacy value', 400),
          { status: 400 }
        )
      }
    } else if (typeof publicVisibility === 'boolean') {
      // Handle global privacy update (legacy support)
      updateData.publicVisibility = publicVisibility
    } else {
      return NextResponse.json(
        errorResponse('No valid privacy setting provided', 400),
        { status: 400 }
      )
    }

    // Update or create profile with privacy settings
    try {
      const updatedProfile = await prisma.profile.upsert({
        where: { userId },
        update: updateData,
        create: { 
          userId, 
          publicVisibility: publicVisibility ?? true,
          feedPrivacy: feedPrivacy ?? true,
          meetingsPrivacy: meetingsPrivacy ?? true,
          badgesPrivacy: badgesPrivacy ?? true,
          terms: false,
          ageVerified: false
        }
      })

      return NextResponse.json(
        successResponse({
          publicVisibility: updatedProfile.publicVisibility,
          feedPrivacy: updatedProfile.feedPrivacy,
          meetingsPrivacy: updatedProfile.meetingsPrivacy,
          badgesPrivacy: updatedProfile.badgesPrivacy
        }, 'Profile privacy updated successfully'),
        { status: 200 }
      )
    } catch (dbError) {
      // If the new fields don't exist yet, fall back to updating only publicVisibility
      if (tabType) {
        const fallbackProfile = await prisma.profile.upsert({
          where: { userId },
          update: { publicVisibility: publicVisibility ?? true },
          create: { 
            userId, 
            publicVisibility: publicVisibility ?? true,
            terms: false,
            ageVerified: false
          }
        })
        
        return NextResponse.json(
          successResponse({
            publicVisibility: fallbackProfile.publicVisibility,
            message: 'Profile privacy updated (fallback mode - new fields not available yet)'
          }, 'Profile privacy updated successfully'),
          { status: 200 }
        )
      }
      
      throw dbError
    }
  } catch (error) {
    return NextResponse.json(
      errorResponse('Internal server error', 500),
      { status: 500 }
    )
  }
}
