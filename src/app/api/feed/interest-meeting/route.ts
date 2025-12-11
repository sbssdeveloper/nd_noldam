import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { verifyToken } from '@/utils/auth'

// Section 2: Get meetings based on user's interested categories
export async function GET(request: NextRequest) {
  try {
    // Try to get user info, but don't require it
    const payload = await verifyToken(request)
    let userCategories: string[] = []
    
    if (payload && (payload.uid || payload.userId)) {
      const userId = parseInt((payload.uid || payload.userId) as string)
      if (userId && !Number.isNaN(userId)) {
        // Get user's interested categories if authenticated
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { categories: true }
        })
        userCategories = (user?.categories || []).map(String)
      }
    }

    // If no user or no categories, show popular meetings from all categories
    if (userCategories.length === 0) {
      // Return popular meetings if user has no interests
      const allMeetings = await prisma.meeting.findMany({
        where: {
          meetingTime: {
            gte: new Date() // Only future meetings
          },
          status: 'approved', // Only approved meetings
          // Filter out meetings with no engagement (test meetings)
          AND: [
            {
              OR: [
                { likes: { some: {} } }, // Has at least one like
                { participants: { some: {} } } // Has at least one participant
              ]
            }
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
              }
            }
          },
          participants: {
            select: {
              userId: true
            }
          },
          likes: {
            select: {
              id: true
            }
          }
        }
      })

      // Sort by engagement (likes + participants) and get top meeting
      const sortedMeetings = allMeetings
        .map(meeting => ({
          ...meeting,
          engagementScore: meeting.likes.length + meeting.participants.length
        }))
        .sort((a, b) => {
          // Primary sort: Highest engagement score (likes + participants)
          const scoreDiff = b.engagementScore - a.engagementScore
          if (scoreDiff !== 0) {
            return scoreDiff
          }
          // Secondary sort: If same engagement, more likes first
          const likesDiff = b.likes.length - a.likes.length
          if (likesDiff !== 0) {
            return likesDiff
          }
          // Tertiary sort: If same engagement and likes, prefer newer meetings
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })

      // Separate meetings with engagement vs without engagement
      const meetingsWithEngagement = sortedMeetings.filter(meeting => meeting.engagementScore > 0)
      const meetingsWithoutEngagement = sortedMeetings.filter(meeting => meeting.engagementScore === 0)

      // Use meetings with engagement first, fallback to meetings without engagement
      const finalSortedMeetings = meetingsWithEngagement.length > 0 ? meetingsWithEngagement : meetingsWithoutEngagement

      // Filter out meetings that have already ended (considering duration)
      const now = new Date()
      const activeMeetings = finalSortedMeetings.filter(meeting => {
        const meetingEndTime = new Date(meeting.meetingTime.getTime() + meeting.duration * 60 * 1000)
        return now < meetingEndTime
      })

      // Get only the top meeting from active meetings
      const topMeeting = activeMeetings[0]

      // Transform to feed format (only 1 meeting)
      const feedData = topMeeting ? [{
        id: topMeeting.id,
        meetingName: topMeeting.meetingName,
        meetingBackground: topMeeting.meetingBackground,
        meetingTime: topMeeting.meetingTime.toISOString(),
        duration: topMeeting.duration,
        description: topMeeting.description,
        roadNameAddress: topMeeting.roadNameAddress,
        detailedAddress: topMeeting.detailedAddress,
        categories: topMeeting.categories,
        activities: topMeeting.activities,
        participantCount: topMeeting.participants.length,
        maxParticipants: topMeeting.maxNum,
        minParticipants: topMeeting.minNum,
        fee: topMeeting.fee,
        hasFee: topMeeting.hasFee,
        user: topMeeting.user
      }] : []

      return NextResponse.json(feedData)
    }

    // Get meetings that match user's interested categories
    // Show meetings from ANYONE in the database (not just following)
    const interestedMeetings = await prisma.meeting.findMany({
      where: {
        categories: {
          hasSome: userCategories // Match any of user's interested categories
        },
        // Only show meetings that haven't ended yet
        // A meeting has ended when: current time > meetingTime + duration
        meetingTime: {
          gte: new Date() // Only future meetings (meeting hasn't started yet)
        },
        status: 'approved' // Only show approved meetings (no drafts)
        // Note: Removed engagement filter to allow meetings with 0 likes/participants as fallback
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
            }
          }
        },
        participants: {
          select: {
            userId: true
          }
        },
        likes: {
          select: {
            id: true
          }
        }
      }
    })


    // Sort by engagement score (likes + participants) and get top meeting
    let sortedMeetings = interestedMeetings
      .map(meeting => ({
        ...meeting,
        engagementScore: meeting.likes.length + meeting.participants.length
      }))
      .sort((a, b) => {
        // Primary sort: Highest engagement score (likes + participants)
        const scoreDiff = b.engagementScore - a.engagementScore
        if (scoreDiff !== 0) {
          return scoreDiff
        }
        // Secondary sort: If same engagement, more likes first
        const likesDiff = b.likes.length - a.likes.length
        if (likesDiff !== 0) {
          return likesDiff
        }
        // Tertiary sort: If same engagement and likes, prefer newer meetings
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

    // Separate meetings with engagement vs without engagement
    const meetingsWithEngagement = sortedMeetings.filter(meeting => meeting.engagementScore > 0)
    const meetingsWithoutEngagement = sortedMeetings.filter(meeting => meeting.engagementScore === 0)

    // Use meetings with engagement first, fallback to meetings without engagement
    sortedMeetings = meetingsWithEngagement.length > 0 ? meetingsWithEngagement : meetingsWithoutEngagement

    // If no meetings in user's categories, get popular meetings from other categories
    if (sortedMeetings.length === 0) {
      const popularMeetings = await prisma.meeting.findMany({
        where: {
          meetingTime: {
            gte: new Date() // Only future meetings
          },
          status: 'approved' // Only show approved meetings (no drafts)
          // Note: Removed engagement filter to allow meetings with 0 likes/participants as fallback
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
              }
            }
          },
          participants: {
            select: {
              userId: true
            }
          },
          likes: {
            select: {
              id: true
            }
          }
        }
      })

      const sortedPopularMeetings = popularMeetings
        .map(meeting => ({
          ...meeting,
          engagementScore: meeting.likes.length + meeting.participants.length
        }))
        .sort((a, b) => {
          // Same sorting logic as above
          const scoreDiff = b.engagementScore - a.engagementScore
          if (scoreDiff !== 0) {
            return scoreDiff
          }
          const likesDiff = b.likes.length - a.likes.length
          if (likesDiff !== 0) {
            return likesDiff
          }
          // Tertiary sort: If same engagement and likes, prefer newer meetings
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })

      // Separate meetings with engagement vs without engagement
      const popularMeetingsWithEngagement = sortedPopularMeetings.filter(meeting => meeting.engagementScore > 0)
      const popularMeetingsWithoutEngagement = sortedPopularMeetings.filter(meeting => meeting.engagementScore === 0)

      // Use meetings with engagement first, fallback to meetings without engagement
      sortedMeetings = popularMeetingsWithEngagement.length > 0 ? popularMeetingsWithEngagement : popularMeetingsWithoutEngagement
    }

    // Filter out meetings that have already ended (considering duration)
    const now = new Date()
    const activeMeetings = sortedMeetings.filter(meeting => {
      const meetingEndTime = new Date(meeting.meetingTime.getTime() + meeting.duration * 60 * 1000)
      return now < meetingEndTime
    })

    // Get only the top meeting from active meetings
    const topMeeting = activeMeetings[0]

    // Transform to feed format (only 1 meeting)
    const feedData = topMeeting ? [{
      id: topMeeting.id,
      meetingName: topMeeting.meetingName,
      meetingBackground: topMeeting.meetingBackground,
      meetingTime: topMeeting.meetingTime.toISOString(),
      duration: topMeeting.duration,
      description: topMeeting.description,
      roadNameAddress: topMeeting.roadNameAddress,
      detailedAddress: topMeeting.detailedAddress,
      categories: topMeeting.categories,
      activities: topMeeting.activities,
      participantCount: topMeeting.participants.length,
      maxParticipants: topMeeting.maxNum,
      minParticipants: topMeeting.minNum,
      fee: topMeeting.fee,
      hasFee: topMeeting.hasFee,
      user: topMeeting.user
    }] : []

    return NextResponse.json(feedData)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch interest meetings' },
      { status: 500 }
    )
  }
}

