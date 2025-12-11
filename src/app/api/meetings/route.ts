import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/utils/auth'
import { prisma } from '@/utils/prisma'
import { Prisma } from '@prisma/client'
import { updateCompletedMeetings } from '@/utils/meetingStatusUpdater'
import { isAdminTokenValid } from '@/apiConfigs/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'type_A' or 'type_B'
    const meetingIds = searchParams.get('meetingIds') // Comma-separated meeting IDs
    const userId = searchParams.get('userId') // User ID for filtering
    const meetingType = searchParams.get('meetingType') // 'all', 'created', 'participated'

    try {
      await updateCompletedMeetings()
    } catch (statusUpdateError) {
      console.error('Failed updating meeting statuses before fetch:', statusUpdateError)
    }

    // Check if user is admin
    const adminToken = request.cookies.get('admin_auth_token')?.value
    const isAdmin = adminToken && isAdminTokenValid(adminToken)

    // Get current user for draft visibility check
    let currentUserId: number | null = null
    try {
      const payload = await verifyToken(request)
      if (payload && (payload.uid || payload.userId)) {
        currentUserId = parseInt((payload.uid || payload.userId) as string)
      }
    } catch (authError) {
      // Ignore auth errors - user is not authenticated
    }

    let whereClause = {}

    // Visibility rules:
    // - "approved" → visible to everyone
    // - "pending", "reject", "completed", "draft" → visible only to creator

    if (meetingIds) {
      const ids = meetingIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      whereClause = { 
        id: { in: ids },
        OR: [
          { status: 'approved' }, // Show approved meetings to everyone
          // Show pending/reject/completed/draft only to creator
          ...(currentUserId ? [
            { status: { in: ['pending', 'reject', 'completed', 'draft'] }, userId: currentUserId }
          ] : [])
        ]
      }
    } else if (userId && meetingType) {
      const userIdNum = parseInt(userId)
      if (meetingType === 'created') {
        // Only meetings created by this user - show all statuses to the creator
        whereClause = { 
          userId: userIdNum
          // No status filter - creator can see all their meetings regardless of status
        }
      } else if (meetingType === 'participated') {
        // Only meetings this user participated in
        whereClause = {
          AND: [
            {
              participants: {
                some: {
                  userId: userIdNum
                }
              }
            },
            {
              OR: [
                { status: 'approved' }, // Show approved meetings they participated in
                // Show pending/reject/completed/draft only if they're the creator
                ...(currentUserId === userIdNum ? [
                  { status: { in: ['pending', 'reject', 'completed', 'draft'] }, userId: userIdNum }
                ] : [])
              ]
            }
          ]
        }
      } else if (meetingType === 'all') {
        // All meetings related to this user (created OR participated)
        whereClause = {
          OR: [
            // User's created meetings - show all statuses
            { userId: userIdNum },
            // Meetings they participated in - only approved or their own pending/reject/completed/draft
            {
              AND: [
                {
                  participants: {
                    some: {
                      userId: userIdNum
                    }
                  }
                },
                {
                  OR: [
                    { status: 'approved' },
                    ...(currentUserId === userIdNum ? [
                      { status: { in: ['pending', 'reject', 'completed', 'draft'] }, userId: userIdNum }
                    ] : [])
                  ]
                }
              ]
            }
          ]
        }
      }
    } else {
      // No specific filters - general listing
      // If admin, show ALL meetings regardless of status
      if (isAdmin) {
        whereClause = {} // No status filter for admin - show all meetings
      } else {
        // Show only approved to everyone, show pending/reject/completed/draft only to creator
        whereClause = {
          OR: [
            { status: 'approved' }, // Show approved meetings to everyone
            // Show pending/reject/completed/draft only to creator
            ...(currentUserId ? [
              { status: { in: ['pending', 'reject', 'completed', 'draft'] }, userId: currentUserId }
            ] : [])
          ]
        }
      }
    }

    const meetings = await prisma.meeting.findMany({
      where: whereClause,
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
            }
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                profileImage: true,
                activeCommunityBadge: {
                  select: {
                    id: true,
                    name: true,
                    imageUrl: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform the data to match the expected format
    const transformedData = meetings.map(meeting => {
      const meetingWithApproval = meeting as any // Type assertion for fields not yet in generated types
      
      // Count confirmed participants (exclude pending payments)
      const confirmedParticipants = meeting.participants?.filter((p: any) => p.paymentStatus === 'confirmed') || []
      const currentParticipants = confirmedParticipants.length
      
      return {
        id: meeting.id,
        image: meeting.meetingBackground,
        title: meeting.meetingName,
        category: meeting.categories.join(', '),
        location: meeting.roadNameAddress, // Use roadNameAddress instead of city
        members: meeting.maxNum,
        date: (() => {
          const date = meeting.meetingTime;
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          const day = date.getDate();
          const time = date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
          });
          return `${year}.${month}.${day} ${time}`;
        })(),
        description: meeting.description,
        meetingAddress: `${meeting.roadNameAddress} ${meeting.detailedAddress}`.trim(), // Combine addresses
        roadNameAddress: meeting.roadNameAddress,
        detailedAddress: meeting.detailedAddress,
        fee: meeting.fee,
        status: meetingWithApproval.status ?? 'draft', // Include meeting status
        userId: meeting.userId, // Add userId for ownership check
        currentParticipants: currentParticipants, // Add participant count
        meetingTime: meeting.meetingTime, // Include meetingTime for date display
        user: {
          id: meeting.user?.id, // Add user id for ownership check
          name: meeting.user?.nickname || 'User',
          level: 2, // Default level, you can modify this based on your logic
          profileImage: meeting.user?.profileImage,
          city: meeting.user?.city,
          province: meeting.user?.province
        },
        memberType: 'recruiting' // Default, you can modify this based on your logic
      }
    })

    return NextResponse.json(transformedData)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    )
  }
}

// Helper: normalize frequency to lowercase set
function normalizeFrequency(input: string | null | undefined): 'none' | 'weekly' | 'biweekly' | 'monthly' {
  const value = (input || 'none').toString().trim().toLowerCase()
  if (value === 'weekly') return 'weekly'
  if (value === 'biweekly' || value === 'bi-weekly' || value === '2weeks' || value === '2-week' || value === 'every 2 weeks') return 'biweekly'
  if (value === 'monthly') return 'monthly'
  return 'none'
}

// Helper: add months preserving day/time as best-effort
function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime())
  const targetMonth = d.getMonth() + months
  const day = d.getDate()
  d.setMonth(targetMonth)
  // Handle month-end overflow by clamping day
  if (d.getDate() < day) {
    d.setDate(0)
  }
  return d
}

// Helper: next occurrence from frequency
function nextFromFrequency(current: Date, freq: 'none' | 'weekly' | 'biweekly' | 'monthly'): Date {
  if (freq === 'weekly') return new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000)
  if (freq === 'biweekly') return new Date(current.getTime() + 14 * 24 * 60 * 60 * 1000)
  if (freq === 'monthly') return addMonths(current, 1)
  return current
}

export async function POST(request: NextRequest) {
  try {
    // Auth
    const payload = await verifyToken(request)
    if (!payload || (!payload.uid && !payload.userId)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt((payload.uid || payload.userId) as string)
    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ success: false, error: 'Invalid user' }, { status: 401 })
    }

    const body = await request.json()

    // Enforce age verification before allowing creation
    const profile = await prisma.profile.findUnique({ where: { userId } })
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 400 })
    }

    // Require dob, 18+, ageVerified, consents
    const dob = profile.dob ? new Date(profile.dob) : null
    const agreePersonal = (profile as any).agreePersonal === true
    const agreeThirdParty = (profile as any).agreeThirdParty === true
    const ageVerified = profile.ageVerified === true

    const computeAge = (d: Date | null) => {
      if (!d) return 0
      const now = new Date()
      let age = now.getFullYear() - d.getFullYear()
      const m = now.getMonth() - d.getMonth()
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
      return age
    }

    const age = computeAge(dob)
    if (!(dob && age >= 18 && ageVerified && agreePersonal && agreeThirdParty)) {
      return NextResponse.json({
        success: false,
        error: 'Age verification required (18+, consents) before creating a meeting.'
      }, { status: 403 })
    }

    // Normalize frequency (lowercase)
    const meetingFrequency = normalizeFrequency(body.meetingFrequency)

    // Build parent meeting (parent is the first occurrence)
    const meetingTime = new Date(`${body.dateValue ?? ''}T${body.timeValue ?? ''}`)
    
    // Validate meeting time
    if (isNaN(meetingTime.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid meeting date or time' }, { status: 400 })
    }

    // Validate richContent length (max 10MB)
    if (body.richContent && body.richContent.length > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Rich content is too large (max 10MB)' }, { status: 400 })
    }

    // Process fee breakdown
    const feeBreakdown = body.feeBreakdown ? {
      contentProduction: Boolean(body.feeBreakdown.contentProduction),
      hostSpot: Boolean(body.feeBreakdown.hostSpot),
      noShowFee: Boolean(body.feeBreakdown.noShowFee),
      royalties: Boolean(body.feeBreakdown.royalties),
      materialCost: Boolean(body.feeBreakdown.materialCost),
      refreshmentFee: Boolean(body.feeBreakdown.refreshmentFee),
      other: Boolean(body.feeBreakdown.other),
      otherReason: body.feeBreakdown.otherReason || ''
    } : Prisma.JsonNull

    // Coerce arrays to string arrays to satisfy Prisma schema
    const activities: string[] = Array.isArray(body.selectedActivities)
      ? body.selectedActivities.map((v: any) => String(v))
      : Array.isArray(body.activities)
        ? body.activities.map((v: any) => String(v))
        : []

    const categories: string[] = Array.isArray(body.categories)
      ? body.categories.map((v: any) => String(v))
      : body.selectedCategory != null
        ? [String(body.selectedCategory)]
        : []

    const parsedFee = Number.parseFloat(String(body.feeAmount ?? 0))
    const safeFee = Number.isFinite(parsedFee) ? parsedFee : 0

    const meetingData = {
      userId,
      meetingName: body.clubName ?? body.meetingName ?? 'Untitled',
      description: body.description ?? null,
      meetingTime,
      roadNameAddress: body.roadNameLotNumber ?? '',
      detailedAddress: body.detailedAddress ?? '',
      minNum: Number(body.minParticipants ?? body.minNum ?? 0),
      maxNum: Number(body.maxParticipants ?? body.maxNum ?? 0),
      fee: safeFee, // Convert feeAmount to decimal safely
      hasFee: body.feeOption === 'yes' || body.feeOption === '있음', // Support both English and Korean
      feeBreakdown: feeBreakdown,
      activities,
      categories,
      meetingBackground: body.backgroundImage ?? null,

      meetingFrequency,
      duration: Number(body.duration ?? 60),
      recurrenceEndOn: body.recurrenceEndOn ? new Date(body.recurrenceEndOn) : null,
      meetingConsentPersonal: body.meetingConsentPersonal ?? false,
      meetingConsentGuidelines: body.meetingConsentGuidelines ?? false,
      
      // New status field - defaults to 'pending' if not provided (requires admin approval)
      status: body.status ?? 'pending',
      parent_meeting: body.parent_meeting ?? null
    }


    const parentMeeting = await prisma.meeting.create({
      data: meetingData
    })

    // Create or update schedule row (one per parent)
    const secondOccurrence = meetingFrequency === 'none' ? meetingTime : nextFromFrequency(meetingTime, meetingFrequency)


    await prisma.meetingSchedule.create({
      data: {
        meetingId: parentMeeting.id,
        scheduleType: meetingFrequency,
        parentMeetingStartOn: meetingTime,
        nextMeetingOn: secondOccurrence,
        recurrenceEndOn: parentMeeting.recurrenceEndOn,
        timezone: body.timezone ?? 'Asia/Seoul',
        status: 'active'
      }
    })

    // Auto-add meeting to home page display (Type A with public scope)
    // This ensures newly created meetings appear on the home page immediately
    try {
      // Check if a public Type A setting exists for this category
      const category = categories[0] // Use first category
      const categoryId = category ? await prisma.category.findFirst({
        where: { name: category },
        select: { id: true }
      }) : null

      if (categoryId) {
        // Find or create a public Type A type_settings record
        let typeASetting = await prisma.typeSettings.findFirst({
          where: {
            type: 'type_A',
            scope: 'public',
            categories: { has: categoryId.id }
          }
        })

        if (!typeASetting) {
          // Create a new Type A setting for this category
          typeASetting = await prisma.typeSettings.create({
            data: {
              type: 'type_A',
              scope: 'public',
              title: `${category} 모임`,
              description: `${category} 관련 모임`,
              image: body.backgroundImage || '/images/default-meeting.jpg',
              categories: [categoryId.id],
              meetings: [parentMeeting.id]
            }
          })
        } else {
          // Update existing Type A setting to include this meeting
          const currentMeetings = Array.isArray(typeASetting.meetings) ? typeASetting.meetings : []
          if (!currentMeetings.includes(parentMeeting.id)) {
            await prisma.typeSettings.update({
              where: { id: typeASetting.id },
              data: {
                meetings: [...currentMeetings, parentMeeting.id]
              }
            })
          }
        }
      }
    } catch (typeSettingsError) {
      // Log error but don't fail meeting creation
    }

    // Automatically create a group chat room for the meeting
    try {
      // Check if chat room already exists (safety check)
      const existingRoom = await (prisma as any).chatRoom.findFirst({
        where: {
          meetingId: parentMeeting.id,
          type: 'group',
          isActive: true
        }
      })

      if (!existingRoom) {
        // Create group chat room
        const chatRoom = await (prisma as any).chatRoom.create({
          data: {
            type: 'group',
            name: parentMeeting.meetingName,
            avatar: parentMeeting.meetingBackground || null,
            meetingId: parentMeeting.id,
            createdBy: userId,
            allowParticipantChat: true,
            lastActivity: new Date(),
            isActive: true
          }
        })

        // Add meeting creator as host in the chat room
        await (prisma as any).chatParticipant.create({
          data: {
            roomId: chatRoom.id,
            userId: userId,
            role: 'host',
            joinedAt: new Date(),
            isActive: true
          }
        })
      }
    } catch (chatRoomError) {
      // Log error but don't fail meeting creation
      console.error('Error creating chat room for meeting:', chatRoomError)
    }

    // If recurring: no need to create child now (parent is month/week 1)
    // If none: parent is the only occurrence; schedule row exists mainly for consistency

    return NextResponse.json({ success: true, data: { id: parentMeeting.id } }, { status: 200 })
    } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to create meeting' }, { status: 500 })
  }
}
