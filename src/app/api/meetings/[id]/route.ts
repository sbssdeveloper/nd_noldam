// import { NextRequest, NextResponse } from 'next/server'
// import { verifyToken } from '@/utils/auth'
// import { prisma } from '@/utils/prisma'
// import { Prisma } from '@prisma/client'
// import { NotificationService } from '@/app/web/config/NotificationService'
// import { NOTIFICATION_TYPES } from '@/app/web/config/notifications'
// import { isAdminTokenValid } from '@/apiConfigs/admin'

// const notificationService = new NotificationService()
// import { ensureMeetingStatusUpToDate } from '@/utils/meetingStatusUpdater'

// function normalizeProfileImage(image: string | null | undefined, origin?: string): string | null {
//   if (!image) return null

//   let value = image.trim()
//   if (!value) return null

//   if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
//     try {
//       const parsed = JSON.parse(value)
//       if (typeof parsed === 'string') {
//         value = parsed
//       } else if (Array.isArray(parsed) && parsed.length > 0) {
//         const first = parsed[0]
//         if (typeof first === 'string') {
//           value = first
//         } else if (first && typeof first === 'object' && typeof first.url === 'string') {
//           value = first.url
//         }
//       } else if (parsed && typeof parsed === 'object' && typeof parsed.url === 'string') {
//         value = parsed.url
//       }
//     } catch (error) {
//       // Ignore parse errors and continue with the raw value
//     }
//   }

//   value = value.replace(/\\/g, '/')
//   if (!value) return null

//   if (value.startsWith('data:')) {
//     return value
//   }

//   if (value.startsWith('//')) {
//     return `https:${value}`
//   }

//   if (/^https?:\/\//i.test(value)) {
//     return value
//   }

//   const envBase = (process.env.NEXT_PUBLIC_ASSET_BASE_URL || process.env.ASSET_BASE_URL || '').trim().replace(/\/+$/, '')
//   const normalized = value.startsWith('/') ? value : `/${value}`

//   if (envBase) {
//     return `${envBase}${normalized}`
//   }

//   if (origin) {
//     return `${origin}${normalized}`
//   }

//   return normalized
// }

// export async function GET(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id } = await params
//     const meetingId = parseInt(id)
    
//     if (isNaN(meetingId)) {
//       return NextResponse.json(
//         { error: 'Invalid meeting ID' },
//         { status: 400 }
//       )
//     }

//     await ensureMeetingStatusUpToDate(meetingId)

//     // Check if user is admin
//     const adminToken = request.cookies.get('admin_auth_token')?.value
//     const isAdmin = adminToken && isAdminTokenValid(adminToken)

//     // Get current user for draft visibility check
//     let currentUserId: number | null = null
//     try {
//       const payload = await verifyToken(request)
//       if (payload && (payload.uid || payload.userId)) {
//         currentUserId = parseInt((payload.uid || payload.userId) as string)
//       }
//     } catch (authError) {
//       // Ignore auth errors - user is not authenticated
//     }

//     // First, check if meeting exists at all (for debugging)
//     const meetingExists = await prisma.meeting.findUnique({
//       where: { id: meetingId },
//       select: { id: true, status: true, userId: true }
//     })

//     if (!meetingExists) {
//       console.error(`Meeting ${meetingId} does not exist in database`)
//       return NextResponse.json(
//         { error: 'Meeting not found' },
//         { status: 404 }
//       )
//     }

//     // Log meeting status for debugging
//     console.log(`Meeting ${meetingId} exists. Status: ${meetingExists.status}, userId: ${meetingExists.userId}, isAdmin: ${isAdmin}, currentUserId: ${currentUserId}`)

//     // Visibility rules:
//     // - Admins can see ALL meetings regardless of status
//     // - "approved" → visible to everyone
//     // - "pending", "reject", "completed", "draft" → visible only to creator
//     const whereClause: any = { id: meetingId }
    
//     // If not admin, apply visibility rules
//     if (!isAdmin) {
//       const visibilityConditions: any[] = [
//         { status: 'approved' } // Show approved meetings to everyone
//       ]
      
//       // Show pending/reject/completed/draft only to creator
//       if (currentUserId) {
//         visibilityConditions.push({
//           status: { in: ['pending', 'reject', 'completed', 'draft'] },
//           userId: currentUserId
//         })
//       }
      
//       whereClause.OR = visibilityConditions
      
//       // Check if meeting would be visible
//       const isVisible = meetingExists.status === 'approved' || 
//         (currentUserId && meetingExists.userId === currentUserId && 
//          ['pending', 'reject', 'completed', 'draft'].includes(meetingExists.status))
      
//       if (!isVisible) {
//         console.error(`Meeting ${meetingId} is not visible. Status: ${meetingExists.status}, userId: ${meetingExists.userId}, currentUserId: ${currentUserId}`)
//         return NextResponse.json(
//           { error: 'Meeting not found' },
//           { status: 404 }
//         )
//       }
//     }
    
//     const meeting = await prisma.meeting.findFirst({
//       where: whereClause,
//       include: {
//         user: {
//           select: {
//             id: true,
//             nickname: true,
//             phoneNumber: true,
//             profileImage: true,
//             city: true,
//             province: true,
//             activeCommunityBadge: {
//               select: {
//                 id: true,
//                 name: true,
//                 imageUrl: true
//               }
//             }
//           }
//         },
//         participants: {
//           include: {
//             user: {
//               select: {
//                 id: true,
//                 nickname: true,
//                 profileImage: true,
//                 activeCommunityBadge: {
//                   select: {
//                     id: true,
//                     name: true,
//                     imageUrl: true
//                   }
//                 }
//               }
//             }
//           }
//         }
//       }
//     })

//     if (!meeting) {
//       // Log for debugging
//       console.error(`Meeting ${meetingId} not found after query. isAdmin: ${isAdmin}, currentUserId: ${currentUserId}, whereClause:`, JSON.stringify(whereClause))
      
//       // If meeting exists but wasn't returned, provide more details
//       if (meetingExists) {
//         return NextResponse.json(
//           { 
//             error: 'Meeting not found',
//             details: `Meeting exists but is not visible. Status: ${meetingExists.status}, Meeting Owner: ${meetingExists.userId}, Current User: ${currentUserId || 'not authenticated'}, Is Admin: ${isAdmin}`
//           },
//           { status: 404 }
//         )
//       }
      
//       return NextResponse.json(
//         { error: 'Meeting not found' },
//         { status: 404 }
//       )
//     }

//     // Fetch category and activity names based on IDs
//     const categoryIds = meeting.categories.map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id))
//     const activityIds = meeting.activities.map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id))

//     // Get like count and user's like status
//     const [categories, activities, likeCount, userLike] = await Promise.all([
//       categoryIds.length > 0 ? prisma.category.findMany({ where: { id: { in: categoryIds } } }) : [],
//       activityIds.length > 0 ? prisma.activity.findMany({ where: { id: { in: activityIds } } }) : [],
//       prisma.meetingLikes.count({
//         where: { meetingId: meetingId }
//       }),
//       currentUserId ? prisma.meetingLikes.findFirst({
//         where: {
//           userId: currentUserId,
//           meetingId: meetingId
//         }
//       }) : null
//     ])

//     const origin = request.nextUrl?.origin

//     const normalizeUser = (user: any) => {
//       if (!user) return user
//       return {
//         ...user,
//         profileImage: normalizeProfileImage(user.profileImage, origin)
//       }
//     }

//     // For admins, show ALL participants; for regular users, only show confirmed ones
//     const participantsToReturn = isAdmin 
//       ? meeting.participants 
//       : meeting.participants.filter((p: any) => p.paymentStatus === 'confirmed')
    
//     const normalizedMeeting = {
//       ...meeting,
//       user: normalizeUser(meeting.user),
//       // Return participants based on user role
//       participants: participantsToReturn.map((participant: any) => ({
//         ...participant,
//         user: normalizeUser(participant.user)
//       }))
//     }

//     // Transform the data - return single meeting object, not array
//     return NextResponse.json({
//       ...normalizedMeeting,
//       categoryNames: categories.map(c => c.name),
//       activityNames: activities.map(a => a.name),
//       likesCount: likeCount,
//       isLiked: !!userLike,
//       // Add participant count for reference (all for admin, confirmed for regular users)
//       confirmedParticipantCount: participantsToReturn.length
//     })
//   } catch (error) {
//     return NextResponse.json(
//       { error: 'Failed to fetch meeting detail' },
//       { status: 500 }
//     )
//   }
// }

// // Helper: normalize frequency to lowercase set
// function normalizeFrequency(input: string | null | undefined): 'none' | 'weekly' | 'biweekly' | 'monthly' {
//   const value = (input || 'none').toString().trim().toLowerCase()
//   if (value === 'weekly') return 'weekly'
//   if (value === 'biweekly' || value === 'bi-weekly' || value === '2weeks' || value === '2-week' || value === 'every 2 weeks') return 'biweekly'
//   if (value === 'monthly') return 'monthly'
//   return 'none'
// }

// // Helper: add months preserving day/time as best-effort
// function addMonths(date: Date, months: number): Date {
//   const d = new Date(date.getTime())
//   const targetMonth = d.getMonth() + months
//   const day = d.getDate()
//   d.setMonth(targetMonth)
//   // Handle month-end overflow by clamping day
//   if (d.getDate() < day) {
//     d.setDate(0)
//   }
//   return d
// }

// // Helper: next occurrence from frequency
// function nextFromFrequency(current: Date, freq: 'none' | 'weekly' | 'biweekly' | 'monthly'): Date {
//   if (freq === 'weekly') return new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000)
//   if (freq === 'biweekly') return new Date(current.getTime() + 14 * 24 * 60 * 60 * 1000)
//   if (freq === 'monthly') return addMonths(current, 1)
//   return current
// }

// export async function POST(request: NextRequest) {
//   try {
//     // Auth
//     const payload = await verifyToken(request)
//     if (!payload || (!payload.uid && !payload.userId)) {
//       return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
//     }

//     const userId = parseInt((payload.uid || payload.userId) as string)
//     if (!userId || Number.isNaN(userId)) {
//       return NextResponse.json({ success: false, error: 'Invalid user' }, { status: 401 })
//     }

//     const body = await request.json()

//     // Enforce age verification before allowing creation
//     const profile = await prisma.profile.findUnique({ where: { userId } })
//     if (!profile) {
//       return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 400 })
//     }

//     // Require dob, 18+, ageVerified, consents
//     const dob = profile.dob ? new Date(profile.dob) : null
//     const agreePersonal = (profile as any).agreePersonal === true
//     const agreeThirdParty = (profile as any).agreeThirdParty === true
//     const ageVerified = profile.ageVerified === true

//     const computeAge = (d: Date | null) => {
//       if (!d) return 0
//       const now = new Date()
//       let age = now.getFullYear() - d.getFullYear()
//       const m = now.getMonth() - d.getMonth()
//       if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
//       return age
//     }

//     const age = computeAge(dob)
//     if (!(dob && age >= 18 && ageVerified && agreePersonal && agreeThirdParty)) {
//       return NextResponse.json({
//         success: false,
//         error: 'Age verification required (18+, consents) before creating a meeting.'
//       }, { status: 403 })
//     }

//     // Normalize frequency (lowercase)
//     const meetingFrequency = normalizeFrequency(body.meetingFrequency)

//     // Build parent meeting (parent is the first occurrence)
//     const meetingTime = new Date(`${body.dateValue ?? ''}T${body.timeValue ?? ''}`)
    
//     // Validate meeting time
//     if (isNaN(meetingTime.getTime())) {
//       return NextResponse.json({ success: false, error: 'Invalid meeting date or time' }, { status: 400 })
//     }

//     // Validate richContent length (max 10MB)
//     if (body.richContent && body.richContent.length > 10 * 1024 * 1024) {
//       return NextResponse.json({ success: false, error: 'Rich content is too large (max 10MB)' }, { status: 400 })
//     }

//     // Process fee breakdown
//     const feeBreakdown = body.feeBreakdown ? {
//       contentProduction: Boolean(body.feeBreakdown.contentProduction),
//       hostSpot: Boolean(body.feeBreakdown.hostSpot),
//       noShowFee: Boolean(body.feeBreakdown.noShowFee),
//       royalties: Boolean(body.feeBreakdown.royalties),
//       materialCost: Boolean(body.feeBreakdown.materialCost),
//       refreshmentFee: Boolean(body.feeBreakdown.refreshmentFee),
//       other: Boolean(body.feeBreakdown.other),
//       otherReason: body.feeBreakdown.otherReason || ''
//     } : Prisma.JsonNull

//     // Coerce arrays to string arrays to satisfy Prisma schema
//     const activities: string[] = Array.isArray(body.selectedActivities)
//       ? body.selectedActivities.map((v: any) => String(v))
//       : Array.isArray(body.activities)
//         ? body.activities.map((v: any) => String(v))
//         : []

//     const categories: string[] = Array.isArray(body.categories)
//       ? body.categories.map((v: any) => String(v))
//       : body.selectedCategory != null
//         ? [String(body.selectedCategory)]
//         : []

//     const parsedFee = Number.parseFloat(String(body.feeAmount ?? 0))
//     const safeFee = Number.isFinite(parsedFee) ? parsedFee : 0

//     const meetingData = {
//       userId,
//       meetingName: body.clubName ?? body.meetingName ?? 'Untitled',
//       description: body.description ?? null,
//       meetingTime,
//       roadNameAddress: body.roadNameLotNumber ?? '',
//       detailedAddress: body.detailedAddress ?? '',
//       minNum: Number(body.minParticipants ?? body.minNum ?? 0),
//       maxNum: Number(body.maxParticipants ?? body.maxNum ?? 0),
//       fee: safeFee, // Convert feeAmount to decimal safely
//       hasFee: body.feeOption === 'yes' || body.feeOption === '있음', // Support both English and Korean
//       feeBreakdown: feeBreakdown,
//       activities,
//       categories,
//       meetingBackground: body.backgroundImage ?? null,

//       meetingFrequency,
//       duration: Number(body.duration ?? 60),
//       recurrenceEndOn: body.recurrenceEndOn ? new Date(body.recurrenceEndOn) : null,
//       meetingConsentPersonal: body.meetingConsentPersonal ?? false,
//       meetingConsentGuidelines: body.meetingConsentGuidelines ?? false,
      
//       // New status field - defaults to 'approved' if not provided
//       // New status field - defaults to 'pending' if not provided (requires admin approval)
//       status: body.status ?? 'pending',
//       parent_meeting: body.parent_meeting ?? null
//     }


//     const parentMeeting = await prisma.meeting.create({
//       data: meetingData
//     })

//     // Create or update schedule row (one per parent)
//     const secondOccurrence = meetingFrequency === 'none' ? meetingTime : nextFromFrequency(meetingTime, meetingFrequency)


//     await prisma.meetingSchedule.create({
//       data: {
//         meetingId: parentMeeting.id,
//         scheduleType: meetingFrequency,
//         parentMeetingStartOn: meetingTime,
//         nextMeetingOn: secondOccurrence,
//         recurrenceEndOn: parentMeeting.recurrenceEndOn,
//         timezone: body.timezone ?? 'Asia/Seoul',
//         status: 'active'
//       }
//     })

//     // Auto-add meeting to home page display (Type A with public scope)
//     // This ensures newly created meetings appear on the home page immediately
//     try {
//       // Check if a public Type A setting exists for this category
//       const category = categories[0] // Use first category
//       const categoryId = category ? await prisma.category.findFirst({
//         where: { name: category },
//         select: { id: true }
//       }) : null

//       if (categoryId) {
//         // Find or create a public Type A type_settings record
//         let typeASetting = await prisma.typeSettings.findFirst({
//           where: {
//             type: 'type_A',
//             scope: 'public',
//             categories: { has: categoryId.id }
//           }
//         })

//         if (!typeASetting) {
//           // Create a new Type A setting for this category
//           typeASetting = await prisma.typeSettings.create({
//             data: {
//               type: 'type_A',
//               scope: 'public',
//               title: `${category} 모임`,
//               description: `${category} 관련 모임`,
//               image: body.backgroundImage || '/images/default-meeting.jpg',
//               categories: [categoryId.id],
//               meetings: [parentMeeting.id]
//             }
//           })
//         } else {
//           // Update existing Type A setting to include this meeting
//           const currentMeetings = Array.isArray(typeASetting.meetings) ? typeASetting.meetings : []
//           if (!currentMeetings.includes(parentMeeting.id)) {
//             await prisma.typeSettings.update({
//               where: { id: typeASetting.id },
//               data: {
//                 meetings: [...currentMeetings, parentMeeting.id]
//               }
//             })
//           }
//         }
//       }
//     } catch (typeSettingsError) {
//       // Log error but don't fail meeting creation
//     }

//     // Automatically create a group chat room for the meeting
//     try {
//       // Check if chat room already exists (safety check)
//       const existingRoom = await (prisma as any).chatRoom.findFirst({
//         where: {
//           meetingId: parentMeeting.id,
//           type: 'group',
//           isActive: true
//         }
//       })

//       if (!existingRoom) {
//         // Create group chat room
//         const chatRoom = await (prisma as any).chatRoom.create({
//           data: {
//             type: 'group',
//             name: parentMeeting.meetingName,
//             avatar: parentMeeting.meetingBackground || null,
//             meetingId: parentMeeting.id,
//             createdBy: userId,
//             allowParticipantChat: true,
//             lastActivity: new Date(),
//             isActive: true
//           }
//         })

//         // Add meeting creator as host in the chat room
//         await (prisma as any).chatParticipant.create({
//           data: {
//             roomId: chatRoom.id,
//             userId: userId,
//             role: 'host',
//             joinedAt: new Date(),
//             isActive: true
//           }
//         })
//       }
//     } catch (chatRoomError) {
//       // Log error but don't fail meeting creation
//       console.error('Error creating chat room for meeting:', chatRoomError)
//     }

//     // If recurring: no need to create child now (parent is month/week 1)
//     // If none: parent is the only occurrence; schedule row exists mainly for consistency

//     return NextResponse.json({ success: true, data: { id: parentMeeting.id } }, { status: 200 })
//     } catch (error: any) {
//     return NextResponse.json({ success: false, error: error?.message || 'Failed to create meeting' }, { status: 500 })
//   }
// }


// export async function PUT(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     // Check for admin authentication via cookie first
//     let isAdmin = false
//     let userId: number | null = null

//     try {
//       const adminToken = request.cookies.get('admin_auth_token')?.value
//       if (adminToken && isAdminTokenValid(adminToken)) {
//         isAdmin = true
//         // For admin access, find an admin user from the database
//         const adminUser = await prisma.user.findFirst({
//           where: {
//             role: {
//               in: ['admin', 'manager', '관리자']
//             }
//           },
//           select: { id: true }
//         })
//         if (adminUser) {
//           userId = adminUser.id
//         }
//       }
//     } catch (adminAuthError) {
//       console.error('Admin auth check error:', adminAuthError)
//     }

//     // If not admin, try JWT token authentication
//     if (!isAdmin) {
//       const payload = await verifyToken(request)
//       if (!payload || (!payload.uid && !payload.userId)) {
//         return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
//       }

//       userId = parseInt((payload.uid || payload.userId) as string)
//       if (!userId || Number.isNaN(userId)) {
//         return NextResponse.json({ success: false, error: 'Invalid user' }, { status: 401 })
//       }

//       // Check if user is admin or manager (allow admins to edit any meeting)
//       try {
//         const user = await prisma.user.findUnique({
//           where: { id: userId },
//           select: { role: true }
//         })
//         // Check if user has admin or manager role
//         isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === '관리자'
//       } catch (error) {
//         console.error('Error checking user role:', error)
//       }
//     }

//     if (!userId) {
//       return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
//     }

//     const { id } = await params
//     const meetingId = parseInt(id)
    
//     if (isNaN(meetingId)) {
//       return NextResponse.json({ success: false, error: 'Invalid meeting ID' }, { status: 400 })
//     }

//     // Check if meeting exists
//     const existingMeeting = await prisma.meeting.findUnique({
//       where: { id: meetingId }
//     })

//     if (!existingMeeting) {
//       return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 })
//     }

//     // Only check ownership if user is not an admin
//     if (!isAdmin && existingMeeting.userId !== userId) {
//       return NextResponse.json({ success: false, error: 'Unauthorized to edit this meeting' }, { status: 403 })
//     }

//     const body = await request.json()

//     // Normalize frequency
//     const meetingFrequency = normalizeFrequency(body.meetingFrequency)

//     // Build meeting time
//     const meetingTime = new Date(`${body.dateValue ?? ''}T${body.timeValue ?? ''}`)
    
//     if (isNaN(meetingTime.getTime())) {
//       return NextResponse.json({ success: false, error: 'Invalid meeting date or time' }, { status: 400 })
//     }

//     // Validate richContent length
//     if (body.description && body.description.length > 10 * 1024 * 1024) {
//       return NextResponse.json({ success: false, error: 'Rich content is too large (max 10MB)' }, { status: 400 })
//     }

//     // Process fee breakdown
//     const feeBreakdown = body.feeBreakdown ? {
//       contentProduction: Boolean(body.feeBreakdown.contentProduction),
//       hostSpot: Boolean(body.feeBreakdown.hostSpot),
//       noShowFee: Boolean(body.feeBreakdown.noShowFee),
//       royalties: Boolean(body.feeBreakdown.royalties),
//       materialCost: Boolean(body.feeBreakdown.materialCost),
//       refreshmentFee: Boolean(body.feeBreakdown.refreshmentFee),
//       other: Boolean(body.feeBreakdown.other),
//       otherReason: body.feeBreakdown.otherReason || ''
//     } : Prisma.JsonNull

//     // Coerce arrays to string arrays
//     const activities: string[] = Array.isArray(body.selectedActivities)
//       ? body.selectedActivities.map((v: any) => String(v))
//       : Array.isArray(body.activities)
//         ? body.activities.map((v: any) => String(v))
//         : []

//     // Only process categories if explicitly provided, otherwise preserve existing
//     let categories: string[] | undefined = undefined
//     if (body.categories !== undefined) {
//       categories = Array.isArray(body.categories)
//         ? body.categories.map((v: any) => String(v))
//         : []
//     } else if (body.selectedCategory != null) {
//       categories = [String(body.selectedCategory)]
//     }
//     // If categories is undefined, it won't be included in updateData, preserving existing categories

//     const parsedFee = Number.parseFloat(String(body.feeAmount ?? 0))
//     const safeFee = Number.isFinite(parsedFee) ? parsedFee : 0

//     const updateData: any = {
//       meetingName: body.clubName ?? body.meetingName ?? existingMeeting.meetingName,
//       description: body.description ?? existingMeeting.description,
//       meetingTime,
//       roadNameAddress: body.roadNameLotNumber ?? body.roadNameAddress ?? existingMeeting.roadNameAddress,
//       detailedAddress: body.detailedAddress ?? existingMeeting.detailedAddress,
//       minNum: Number(body.minParticipants ?? body.minNum ?? existingMeeting.minNum),
//       maxNum: Number(body.maxParticipants ?? body.maxNum ?? existingMeeting.maxNum),
//       fee: safeFee,
//       hasFee: body.feeOption === 'yes' || body.feeOption === '있음',
//       feeBreakdown: feeBreakdown,
//       activities,
//       meetingBackground: body.backgroundImage ?? existingMeeting.meetingBackground,
//       meetingFrequency,
//       duration: Number(body.duration ?? existingMeeting.duration),
//       recurrenceEndOn: body.recurrenceEndOn ? new Date(body.recurrenceEndOn) : existingMeeting.recurrenceEndOn,
//       meetingConsentPersonal: body.meetingConsentPersonal ?? existingMeeting.meetingConsentPersonal,
//       meetingConsentGuidelines: body.meetingConsentGuidelines ?? existingMeeting.meetingConsentGuidelines,
      
//       // Update status and parent_meeting if provided
//       status: body.status !== undefined ? body.status : existingMeeting.status,
//       parent_meeting: body.parent_meeting ?? existingMeeting.parent_meeting
//     }

//     // Only include categories in update if explicitly provided
//     if (categories !== undefined) {
//       updateData.categories = categories
//     }

//     // Update the meeting
//     const updatedMeeting = await prisma.meeting.update({
//       where: { id: meetingId },
//       data: updateData
//     })

//     // Update meeting schedule if exists
//     const secondOccurrence = meetingFrequency === 'none' ? meetingTime : nextFromFrequency(meetingTime, meetingFrequency)
    
//     await prisma.meetingSchedule.updateMany({
//       where: { meetingId: meetingId },
//       data: {
//         scheduleType: meetingFrequency,
//         parentMeetingStartOn: meetingTime,
//         nextMeetingOn: secondOccurrence,
//         recurrenceEndOn: updatedMeeting.recurrenceEndOn
//       }
//     })

//     return NextResponse.json({ success: true, data: { id: updatedMeeting.id } }, { status: 200 })
//   } catch (error: any) {
//     return NextResponse.json({ success: false, error: error?.message || 'Failed to update meeting' }, { status: 500 })
//   }
// }

// export async function DELETE(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     // Check for admin authentication via cookie first
//     let isAdmin = false
//     let userId: number | null = null

//     try {
//       const adminToken = request.cookies.get('admin_auth_token')?.value
//       if (adminToken && isAdminTokenValid(adminToken)) {
//         isAdmin = true
//         // For admin access, find an admin user from the database
//         const adminUser = await prisma.user.findFirst({
//           where: {
//             role: {
//               in: ['admin', 'manager', '관리자']
//             }
//           },
//           select: { id: true }
//         })
//         if (adminUser) {
//           userId = adminUser.id
//         }
//       }
//     } catch (adminAuthError) {
//       console.error('Admin auth check error:', adminAuthError)
//     }

//     // If not admin, try JWT token authentication
//     if (!isAdmin) {
//       const payload = await verifyToken(request)
//       if (!payload || (!payload.uid && !payload.userId)) {
//         return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
//       }

//       userId = parseInt((payload.uid || payload.userId) as string)
//       if (!userId || Number.isNaN(userId)) {
//         return NextResponse.json({ success: false, error: 'Invalid user' }, { status: 401 })
//       }

//       // Check if user is admin or manager
//       try {
//         const user = await prisma.user.findUnique({
//           where: { id: userId },
//           select: { role: true }
//         })
//         isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === '관리자'
//       } catch (error) {
//         console.error('Error checking user role:', error)
//       }
//     }

//     if (!userId) {
//       return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
//     }

//     const { id } = await params
//     const meetingId = parseInt(id)

//     if (Number.isNaN(meetingId)) {
//       return NextResponse.json({ success: false, error: 'Invalid meeting ID' }, { status: 400 })
//     }

//     const meeting = await prisma.meeting.findUnique({
//       where: { id: meetingId },
//       include: {
//         participants: {
//           select: {
//             userId: true
//           }
//         },
//         user: {
//           select: {
//             nickname: true
//           }
//         }
//       }
//     })

//     if (!meeting) {
//       return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 })
//     }

//     // Only check ownership if user is not an admin
//     if (!isAdmin && meeting.userId !== userId) {
//       return NextResponse.json({ success: false, error: 'Unauthorized to delete this meeting' }, { status: 403 })
//     }

//     await prisma.meeting.delete({ where: { id: meetingId } })

//     const participantIds = (meeting.participants || [])
//       .map((participant: any) => participant.userId)
//       .filter((id: number) => id !== meeting.userId)

//     if (participantIds.length > 0) {
//       try {
//         await notificationService.createBatchNotifications(
//           participantIds,
//           NOTIFICATION_TYPES.MEETING_DELETED_BY_HOST,
//           {
//             hostName: meeting.user?.nickname || 'Host',
//             meetingName: meeting.meetingName,
//             meetingId
//           },
//           {
//             relatedId: meetingId,
//             relatedType: 'meeting'
//           }
//         )
//       } catch (notificationError) {
//         console.error('Meeting deletion notification error:', notificationError)
//       }
//     }

//     return NextResponse.json({ success: true }, { status: 200 })
//   } catch (error: any) {
//     return NextResponse.json({ success: false, error: error?.message || 'Failed to delete meeting' }, { status: 500 })
//   }
// }


import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/utils/auth'
import { prisma } from '@/utils/prisma'
import { Prisma } from '@prisma/client'
import { NotificationService } from '@/app/web/config/NotificationService'
import { NOTIFICATION_TYPES } from '@/app/web/config/notifications'
import { isAdminTokenValid } from '@/apiConfigs/admin'

const notificationService = new NotificationService()
import { ensureMeetingStatusUpToDate } from '@/utils/meetingStatusUpdater'

function normalizeProfileImage(image: string | null | undefined, origin?: string): string | null {
  if (!image) return null

  let value = image.trim()
  if (!value) return null

  if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed === 'string') {
        value = parsed
      } else if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0]
        if (typeof first === 'string') {
          value = first
        } else if (first && typeof first === 'object' && typeof first.url === 'string') {
          value = first.url
        }
      } else if (parsed && typeof parsed === 'object' && typeof parsed.url === 'string') {
        value = parsed.url
      }
    } catch (error) {
      // Ignore parse errors and continue with the raw value
    }
  }

  value = value.replace(/\\/g, '/')
  if (!value) return null

  if (value.startsWith('data:')) {
    return value
  }

  if (value.startsWith('//')) {
    return `https:${value}`
  }

  if (/^https?:\/\//i.test(value)) {
    return value
  }

  const envBase = (process.env.NEXT_PUBLIC_ASSET_BASE_URL || process.env.ASSET_BASE_URL || '').trim().replace(/\/+$/, '')
  const normalized = value.startsWith('/') ? value : `/${value}`

  if (envBase) {
    return `${envBase}${normalized}`
  }

  if (origin) {
    return `${origin}${normalized}`
  }

  return normalized
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const meetingId = parseInt(id)
    
    if (isNaN(meetingId)) {
      return NextResponse.json(
        { error: 'Invalid meeting ID' },
        { status: 400 }
      )
    }

    await ensureMeetingStatusUpToDate(meetingId)

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

    const meeting = await prisma.meeting.findFirst({
      where: { 
        id: meetingId,
        // Hide draft meetings from other users
        OR: [
          { status: { not: 'draft' } }, // Show non-draft meetings to everyone
          ...(currentUserId ? [{ status: 'draft', userId: currentUserId }] : []) // Show user's own drafts
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            phoneNumber: true,
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
      }
    })

    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }

    // Fetch category and activity names based on IDs
    const categoryIds = meeting.categories.map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id))
    const activityIds = meeting.activities.map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id))

    // Get like count and user's like status
    const [categories, activities, likeCount, userLike] = await Promise.all([
      categoryIds.length > 0 ? prisma.category.findMany({ where: { id: { in: categoryIds } } }) : [],
      activityIds.length > 0 ? prisma.activity.findMany({ where: { id: { in: activityIds } } }) : [],
      prisma.meetingLikes.count({
        where: { meetingId: meetingId }
      }),
      currentUserId ? prisma.meetingLikes.findFirst({
        where: {
          userId: currentUserId,
          meetingId: meetingId
        }
      }) : null
    ])

    const origin = request.nextUrl?.origin

    const normalizeUser = (user: any) => {
      if (!user) return user
      return {
        ...user,
        profileImage: normalizeProfileImage(user.profileImage, origin)
      }
    }

    // Filter participants to only include confirmed ones (exclude pending payments)
    const confirmedParticipants = meeting.participants.filter((p: any) => p.paymentStatus === 'confirmed')
    
    const normalizedMeeting = {
      ...meeting,
      user: normalizeUser(meeting.user),
      // Only return confirmed participants
      participants: confirmedParticipants.map((participant: any) => ({
        ...participant,
        user: normalizeUser(participant.user)
      }))
    }

    // Transform the data - return single meeting object, not array
    return NextResponse.json({
      ...normalizedMeeting,
      categoryNames: categories.map(c => c.name),
      activityNames: activities.map(a => a.name),
      likesCount: likeCount,
      isLiked: !!userLike,
      // Add confirmed participant count for reference
      confirmedParticipantCount: confirmedParticipants.length
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch meeting detail' },
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
      
      // New status field - defaults to 'approved' if not provided
      status: body.status ?? 'approved',
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


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check for admin authentication via cookie first
    let isAdmin = false
    let userId: number | null = null

    try {
      const adminToken = request.cookies.get('admin_auth_token')?.value
      if (adminToken && isAdminTokenValid(adminToken)) {
        isAdmin = true
        // For admin access, find an admin user from the database
        const adminUser = await prisma.user.findFirst({
          where: {
            role: {
              in: ['admin', 'manager', '관리자']
            }
          },
          select: { id: true }
        })
        if (adminUser) {
          userId = adminUser.id
        }
      }
    } catch (adminAuthError) {
      console.error('Admin auth check error:', adminAuthError)
    }

    // If not admin, try JWT token authentication
    if (!isAdmin) {
      const payload = await verifyToken(request)
      if (!payload || (!payload.uid && !payload.userId)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }

      userId = parseInt((payload.uid || payload.userId) as string)
      if (!userId || Number.isNaN(userId)) {
        return NextResponse.json({ success: false, error: 'Invalid user' }, { status: 401 })
      }

      // Check if user is admin or manager (allow admins to edit any meeting)
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true }
        })
        // Check if user has admin or manager role
        isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === '관리자'
      } catch (error) {
        console.error('Error checking user role:', error)
      }
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const meetingId = parseInt(id)
    
    if (isNaN(meetingId)) {
      return NextResponse.json({ success: false, error: 'Invalid meeting ID' }, { status: 400 })
    }

    // Check if meeting exists
    const existingMeeting = await prisma.meeting.findUnique({
      where: { id: meetingId }
    })

    if (!existingMeeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 })
    }

    // Only check ownership if user is not an admin
    if (!isAdmin && existingMeeting.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized to edit this meeting' }, { status: 403 })
    }

    const body = await request.json()

    // Normalize frequency
    const meetingFrequency = normalizeFrequency(body.meetingFrequency)

    // Build meeting time
    const meetingTime = new Date(`${body.dateValue ?? ''}T${body.timeValue ?? ''}`)
    
    if (isNaN(meetingTime.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid meeting date or time' }, { status: 400 })
    }

    // Validate richContent length
    if (body.description && body.description.length > 10 * 1024 * 1024) {
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

    // Coerce arrays to string arrays
    const activities: string[] = Array.isArray(body.selectedActivities)
      ? body.selectedActivities.map((v: any) => String(v))
      : Array.isArray(body.activities)
        ? body.activities.map((v: any) => String(v))
        : []

    // Only process categories if explicitly provided, otherwise preserve existing
    let categories: string[] | undefined = undefined
    if (body.categories !== undefined) {
      categories = Array.isArray(body.categories)
        ? body.categories.map((v: any) => String(v))
        : []
    } else if (body.selectedCategory != null) {
      categories = [String(body.selectedCategory)]
    }
    // If categories is undefined, it won't be included in updateData, preserving existing categories

    const parsedFee = Number.parseFloat(String(body.feeAmount ?? 0))
    const safeFee = Number.isFinite(parsedFee) ? parsedFee : 0

    const updateData: any = {
      meetingName: body.clubName ?? body.meetingName ?? existingMeeting.meetingName,
      description: body.description ?? existingMeeting.description,
      meetingTime,
      roadNameAddress: body.roadNameLotNumber ?? body.roadNameAddress ?? existingMeeting.roadNameAddress,
      detailedAddress: body.detailedAddress ?? existingMeeting.detailedAddress,
      minNum: Number(body.minParticipants ?? body.minNum ?? existingMeeting.minNum),
      maxNum: Number(body.maxParticipants ?? body.maxNum ?? existingMeeting.maxNum),
      fee: safeFee,
      hasFee: body.feeOption === 'yes' || body.feeOption === '있음',
      feeBreakdown: feeBreakdown,
      activities,
      meetingBackground: body.backgroundImage ?? existingMeeting.meetingBackground,
      meetingFrequency,
      duration: Number(body.duration ?? existingMeeting.duration),
      recurrenceEndOn: body.recurrenceEndOn ? new Date(body.recurrenceEndOn) : existingMeeting.recurrenceEndOn,
      meetingConsentPersonal: body.meetingConsentPersonal ?? existingMeeting.meetingConsentPersonal,
      meetingConsentGuidelines: body.meetingConsentGuidelines ?? existingMeeting.meetingConsentGuidelines,
      
      // Update status and parent_meeting if provided
      status: body.status !== undefined ? body.status : existingMeeting.status,
      parent_meeting: body.parent_meeting ?? existingMeeting.parent_meeting
    }

    // Only include categories in update if explicitly provided
    if (categories !== undefined) {
      updateData.categories = categories
    }

    // Update the meeting
    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: updateData
    })

    // Update meeting schedule if exists
    const secondOccurrence = meetingFrequency === 'none' ? meetingTime : nextFromFrequency(meetingTime, meetingFrequency)
    
    await prisma.meetingSchedule.updateMany({
      where: { meetingId: meetingId },
      data: {
        scheduleType: meetingFrequency,
        parentMeetingStartOn: meetingTime,
        nextMeetingOn: secondOccurrence,
        recurrenceEndOn: updatedMeeting.recurrenceEndOn
      }
    })

    return NextResponse.json({ success: true, data: { id: updatedMeeting.id } }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to update meeting' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check for admin authentication via cookie first
    let isAdmin = false
    let userId: number | null = null

    try {
      const adminToken = request.cookies.get('admin_auth_token')?.value
      if (adminToken && isAdminTokenValid(adminToken)) {
        isAdmin = true
        // For admin access, find an admin user from the database
        const adminUser = await prisma.user.findFirst({
          where: {
            role: {
              in: ['admin', 'manager', '관리자']
            }
          },
          select: { id: true }
        })
        if (adminUser) {
          userId = adminUser.id
        }
      }
    } catch (adminAuthError) {
      console.error('Admin auth check error:', adminAuthError)
    }

    // If not admin, try JWT token authentication
    if (!isAdmin) {
      const payload = await verifyToken(request)
      if (!payload || (!payload.uid && !payload.userId)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }

      userId = parseInt((payload.uid || payload.userId) as string)
      if (!userId || Number.isNaN(userId)) {
        return NextResponse.json({ success: false, error: 'Invalid user' }, { status: 401 })
      }

      // Check if user is admin or manager via role
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true }
        })
        isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === '관리자'
      } catch (error) {
        console.error('Error checking user role:', error)
      }
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const meetingId = parseInt(id)

    if (Number.isNaN(meetingId)) {
      return NextResponse.json({ success: false, error: 'Invalid meeting ID' }, { status: 400 })
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        participants: {
          select: {
            userId: true
          }
        },
        user: {
          select: {
            nickname: true
          }
        }
      }
    })

    if (!meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 })
    }

    // Only check ownership if user is not an admin
    if (!isAdmin && meeting.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized to delete this meeting' }, { status: 403 })
    }

    await prisma.meeting.delete({ where: { id: meetingId } })

    const participantIds = (meeting.participants || [])
      .map((participant: any) => participant.userId)
      .filter((id: number) => id !== meeting.userId)

    if (participantIds.length > 0) {
      try {
        await notificationService.createBatchNotifications(
          participantIds,
          NOTIFICATION_TYPES.MEETING_DELETED_BY_HOST,
          {
            hostName: meeting.user?.nickname || 'Host',
            meetingName: meeting.meetingName,
            meetingId
          },
          {
            relatedId: meetingId,
            relatedType: 'meeting'
          }
        )
      } catch (notificationError) {
        console.error('Meeting deletion notification error:', notificationError)
      }
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to delete meeting' }, { status: 500 })
  }
}
