import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/utils/auth'
import { prisma } from '@/utils/prisma'
import { BadgeService } from '@/app/web/config/BadgeService'

export const dynamic = 'force-dynamic'
export const maxDuration = 30 // Increase timeout to 30 seconds for this heavy endpoint

export async function GET(request: NextRequest) {
    try {
      // Temporary fix: Update Type A settings with empty categories to be public
      // Wrap in try-catch to prevent blocking if this fails
      try {
        await prisma.typeSettings.updateMany({
          where: {
            type: 'type_A',
            scope: 'categories',
            categories: { isEmpty: true }
          },
          data: {
            scope: 'public'
          }
        })
      } catch (updateError) {
        // Log but don't fail the request
        console.warn('Failed to update type settings:', updateError)
      }

    // Resolve user (supports cookie or header token). Do not require header exclusively
    let user = null
    let userCategories: string[] = []
      try {
        const payload = await verifyToken(request)
        if (payload && (payload.uid || payload.userId)) {
          const userIdString = payload.uid || payload.userId
          if (userIdString) {
            const userId = parseInt(userIdString)
            if (!isNaN(userId) && userId > 0) {
            user = await prisma.user.findUnique({
              where: { id: userId },
              select: {
                id: true,
                nickname: true,
                profileImage: true,
                city: true,
                province: true,
                categories: true
              }
            })
            userCategories = user?.categories ? user.categories.map(String) : []
            }
          }
        }
      } catch (error) {
      // User not authenticated, showing public data only
    }

    // Fetch home page settings for slider (status active)
    const rawHomePageSettings = await prisma.homePageSettings.findMany({
      where: { status: 'active' },
      orderBy: { createDate: 'desc' }
    })

    // Scope filtering for sliders
    const scopeFilterForSliders = (setting: any) => {
      const scope = (setting as any).scope || 'public'
      const cats = ((setting as any).categories || []).map(String)
      if (!user) return scope !== 'categories'
      // logged in: include public and category match
      if (scope !== 'categories') return true
      return cats.length > 0 && cats.some((c: string) => userCategories.includes(c))
    }

    const homePageSettings = rawHomePageSettings.filter(scopeFilterForSliders)

    // Fetch user details for home page settings
    const userIds = homePageSettings.map(setting => setting.userId).filter((id): id is number => id !== null)
    const users = userIds.length > 0 ? await prisma.user.findMany({
      where: {
        id: { in: userIds }
      },
      select: {
        id: true,
        nickname: true,
        profileImage: true,
        city: true,
        province: true,
        activeCommunityBadge: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        },
        activeCommunityBadgeId: true
      }
    }) : []

    const userMap = new Map(users.map(user => [user.id, user]))

    // Fetch type settings with scope and deactivation filtering
    const now = new Date()
    
    // Check all Type A settings in database (without any filters)
    const allTypeAInDB = await prisma.typeSettings.findMany({
      where: { type: 'type_A' },
      select: {
        id: true,
        type: true,
        title: true,
        scope: true,
        createDate: true,
        deactivationDate: true,
        meetings: true,
        categories: true
      },
      orderBy: { createDate: 'desc' }
    })
    
    // Fetch type settings (status active) and keep expiration filter for BOTH A and B
    const typeSettings = await prisma.typeSettings.findMany({
      where: {
        status: 'active',
            OR: [
              { deactivationDate: null },
              { deactivationDate: { gt: now } }
        ]
      },
      orderBy: { createDate: 'desc' }
    })
    
    // Debug: Show Type A settings from DB query
    const typeAFromDB = typeSettings.filter(s => s.type === 'type_A')

    // Filter type settings based on scope
    // - public: show to everyone
    // - categories: show ONLY to logged-in users whose category IDs intersect with the setting's categories
    const filteredTypeSettings = typeSettings.filter(setting => {
      if (setting.scope === 'public') {
        return true
      }
      if (setting.scope === 'categories') {
        // If categories array is empty, it matches no one (not public)
        if (!Array.isArray(setting.categories) || setting.categories.length === 0) {
          return false
        }
        if (!user) {
          return false
        }
        if (!Array.isArray(userCategories) || userCategories.length === 0) {
          return false
        }
        // Convert setting categories to strings for comparison (userCategories are strings)
        const settingCategoryStrings = setting.categories.map(String)
        const hasMatchingCategory = settingCategoryStrings.some((catId: string) => userCategories.includes(catId))
        return hasMatchingCategory
      }
      return false
    })

    // Split Type A and Type B
    const allTypeASettings = filteredTypeSettings.filter(setting => setting.type === 'type_A')
    const allTypeBSettings = filteredTypeSettings.filter(setting => setting.type === 'type_B')
    
    // Sort by lastUpdated/createDate desc
    const sortByNewest = (a: any, b: any) => {
      const dateA = new Date(a.lastUpdated || a.createDate)
      const dateB = new Date(b.lastUpdated || b.createDate)
      return dateB.getTime() - dateA.getTime()
    }
    const sortedTypeASettings = [...allTypeASettings].sort(sortByNewest)
    
    // Type A selection logic (all matches):
    // - Logged out: all public
    // - Logged in: category-matching first, then public; both groups sorted newest first
    const typeAMatchesCategory = (s: any) => s.scope === 'categories' && Array.isArray(s.categories) && s.categories.length > 0 && s.categories.map(String).some((id: string) => userCategories.includes(id))
    const typeAPublic = (s: any) => s.scope === 'public'

    let typeASettings: any[] = []
    if (!user || userCategories.length === 0) {
      typeASettings = sortedTypeASettings.filter(typeAPublic)
      } else {
      const catFirst = sortedTypeASettings.filter(typeAMatchesCategory)
      const publics = sortedTypeASettings.filter(typeAPublic)
      typeASettings = [...catFirst, ...publics]
    }

    // Type B selection logic (all matches): same as Type A order: category-first then public
    const sortedTypeB = [...allTypeBSettings].sort(sortByNewest)
    const typeBMatchesCategory = (s: any) => s.scope === 'categories' && Array.isArray(s.categories) && s.categories.length > 0 && s.categories.map(String).some((id: string) => userCategories.includes(id))
    const typeBPublic = (s: any) => s.scope === 'public'
    let typeBSettings: any[] = []
    if (!user || userCategories.length === 0) {
      typeBSettings = sortedTypeB.filter(typeBPublic)
    } else {
      const catFirstB = sortedTypeB.filter(typeBMatchesCategory)
      const publicsB = sortedTypeB.filter(typeBPublic)
      typeBSettings = [...catFirstB, ...publicsB]
    }

    // Collect all selected meeting IDs from both Type A and Type B settings
    const selectedMeetingIds = Array.from(new Set([
      ...typeASettings.flatMap(s => Array.isArray(s.meetings) ? s.meetings : []),
      ...typeBSettings.flatMap(s => Array.isArray(s.meetings) ? s.meetings : [])
    ])) as number[]

    // Fetch only selected meetings once
    let meetingsById = new Map<number, any>()
    if (selectedMeetingIds.length > 0) {
      const meetings = await prisma.meeting.findMany({
        where: { 
          id: { in: selectedMeetingIds },
          // Hide draft meetings from other users
          OR: [
            { status: { not: 'draft' } }, // Show non-draft meetings to everyone
            ...(user ? [{ status: 'draft', userId: user.id }] : []) // Show user's own drafts
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              profileImage: true,
              city: true,
              province: true,
              activeCommunityBadge: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true
                }
              },
              activeCommunityBadgeId: true
            }
          }
        }
      })

      // Like counts for all selected meetings
      const likeCounts = await prisma.meetingLikes.groupBy({
        by: ['meetingId'],
        where: { meetingId: { in: selectedMeetingIds } },
        _count: { meetingId: true }
      })
      const likeCountMap = new Map<number, number>(likeCounts.map(item => [item.meetingId as number, item._count.meetingId]))

      // Get user's likes if authenticated
      let userLikesMap = new Map<number, boolean>()
      if (user && user.id) {
        const userLikes = await prisma.meetingLikes.findMany({
          where: {
            userId: user.id,
            meetingId: { in: selectedMeetingIds }
          },
          select: { meetingId: true }
        })
        userLikesMap = new Map(userLikes.map(like => [like.meetingId, true]))
      }

      meetingsById = new Map<number, any>(meetings.map(m => [m.id, {
        ...m,
        _count: { MeetingLikes: likeCountMap.get(m.id) || 0 },
        isLiked: userLikesMap.get(m.id) || false
      }]))
    }

    const badgeUserIds = new Set<number>()
    userIds.forEach(id => { if (typeof id === 'number') badgeUserIds.add(id) })
    meetingsById.forEach((meeting: any) => {
      if (meeting?.user?.id) {
        badgeUserIds.add(meeting.user.id)
      }
    })

    const badgeMap = badgeUserIds.size > 0
      ? await BadgeService.ensureCommunityBadgesForUsers(Array.from(badgeUserIds))
      : {}

    const resolveBadgeForUser = (
      userId: number | null | undefined,
      badge?: { id?: number | null; name?: string | null; imageUrl?: string | null } | null
    ) => {
      if (!userId && !badge) return null
      const fallback = badge ?? null
      const ensured = userId != null ? badgeMap[userId] ?? fallback : fallback
      if (!ensured) return null
      return {
        id: ensured.id ?? null,
        name: ensured.name ?? null,
        imageUrl: ensured.imageUrl ?? null
      }
    }

    // Transform home page settings for slider
    const sliderData = homePageSettings.map(setting => {
      const sliderUser = setting.userId ? userMap.get(setting.userId) : null
      const badge = sliderUser ? resolveBadgeForUser(sliderUser.id, sliderUser.activeCommunityBadge) : null
      return {
        id: setting.id,
        image: setting.image,
        title: setting.title,
        subtitle: setting.content,
        redirectUrl: (setting as any).redirectUrl,
        target: (setting as any).target,
        scope: (setting as any).scope || 'public',
        categories: (setting as any).categories || [],
        meetings: (setting as any).meetings || [], // Include meetings array for navigation
        user: sliderUser ? {
          id: sliderUser.id,
          name: sliderUser.nickname || 'User',
          level: 2,
          profileImage: sliderUser.profileImage,
          city: sliderUser.city,
          province: sliderUser.province,
          activeCommunityBadge: badge
        } : {
          name: 'Admin',
          level: 3
        }
      }
    })

    // Transform Type A data: ONLY selected meetings in setting.meetings
    const typeAData = typeASettings.map(setting => {
      const meetingIds = Array.isArray(setting.meetings) ? setting.meetings : []
      const relatedMeetings = meetingIds
        .map((id: number) => meetingsById.get(id))
        .filter(Boolean)

      return {
        id: setting.id,
        image: setting.image,
        title: setting.title,
        description: setting.description,
        scope: (setting as any).scope || 'public',
        categories: (setting as any).categories || [],
        meetings: relatedMeetings.map((meeting: any) => ({
          id: meeting.id,
          image: meeting.meetingBackground,
          title: meeting.meetingName,
          category: Array.isArray(meeting.categories) ? meeting.categories.join(', ') : meeting.categories || '',
          location: meeting.city,
          members: meeting.maxNum,
          date: meeting.meetingTime.toLocaleString('ko-KR', {
            year: '2-digit',
            month: 'numeric',
            day: 'numeric',
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          description: meeting.description,
          user: {
            id: meeting.user?.id ?? null,
            name: meeting.user?.nickname || 'User',
            level: 2,
            profileImage: meeting.user?.profileImage,
            city: meeting.user?.city,
            province: meeting.user?.province,
            activeCommunityBadge: resolveBadgeForUser(meeting.user?.id, meeting.user?.activeCommunityBadge)
          },
          memberType: 'recruiting',
          likesCount: meeting._count?.MeetingLikes || 0,
          isLiked: meeting.isLiked || false
        }))
      }
    })

    // Transform Type B data: ONLY selected meetings in setting.meetings
    const typeBData = typeBSettings.map(setting => {
      const meetingIds = Array.isArray(setting.meetings) ? setting.meetings : []
      const relatedMeetings = meetingIds
        .map((id: number) => meetingsById.get(id))
        .filter(Boolean)

      return {
        id: setting.id,
        image: setting.image,
        title: setting.title,
        description: setting.description,
        scope: (setting as any).scope || 'public',
        categories: (setting as any).categories || [],
        meetings: relatedMeetings.map((meeting: any) => ({
          id: meeting.id,
          image: meeting.meetingBackground,
          title: meeting.meetingName,
          category: Array.isArray(meeting.categories) ? meeting.categories.join(', ') : meeting.categories || '',
          location: meeting.city,
          members: meeting.maxNum,
          date: meeting.meetingTime.toLocaleString('ko-KR', {
            year: '2-digit',
            month: 'numeric',
            day: 'numeric',
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          description: meeting.description,
          user: {
            id: meeting.user?.id ?? null,
            name: meeting.user?.nickname || 'User',
            level: 2,
            profileImage: meeting.user?.profileImage,
            city: meeting.user?.city,
            province: meeting.user?.province,
            activeCommunityBadge: resolveBadgeForUser(meeting.user?.id, meeting.user?.activeCommunityBadge)
          },
          memberType: 'recruiting',
          likesCount: meeting._count?.MeetingLikes || 0,
          isLiked: meeting.isLiked || false
        }))
      }
    })

    // Ensure response is properly formatted and sent
    const responseData = {
      sliderData,
      typeAData,
      typeBData
    }

    // Create response with proper headers to prevent chunked encoding issues
    const response = NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'close' // Close connection after response to prevent chunked encoding issues
      }
    })

    return response
  } catch (error) {
    console.error('Error fetching home page data:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    
    // Return error response with proper headers
    return NextResponse.json(
      { 
        error: 'Failed to fetch home page data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'close'
        }
      }
    )
  }
}
