import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { verifyToken } from '@/utils/auth'

// Section 1: Get recent activity of people the user is following
export async function GET(request: NextRequest) {
  try {
    // This endpoint requires authentication since it's about following
    const payload = await verifyToken(request)
    if (!payload || (!payload.uid && !payload.userId)) {
      // Return empty array instead of error for unauthenticated users
      return NextResponse.json([])
    }

    const userId = parseInt((payload.uid || payload.userId) as string)
    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json([])
    }

    // Get users that the current user is following
    const following = await prisma.follower.findMany({
      where: { userId: userId },
      select: { following: true }
    })

    const followingIds = following.map(f => f.following)

    if (followingIds.length === 0) {
      return NextResponse.json([])
    }

    // Get recent meetings participated by following users
    const participatedMeetings = await prisma.meetingParticipant.findMany({
      where: {
        userId: { in: followingIds },
        meeting: {
          // Hide draft meetings from other users
          OR: [
            { status: { not: 'draft' } }, // Show non-draft meetings to everyone
            { status: 'draft', userId: userId } // Show user's own drafts
          ]
        }
      },
      include: {
        meeting: {
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
            }
          }
        },
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
      },
      orderBy: {
        joinedOn: 'desc'
      },
      take: 10
    })

    // Get recent meetings created by following users
    const createdMeetings = await prisma.meeting.findMany({
      where: {
        userId: { in: followingIds },
        // Hide draft meetings from other users
        OR: [
          { status: { not: 'draft' } }, // Show non-draft meetings to everyone
          { status: 'draft', userId: userId } // Show user's own drafts
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
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    // Transform participated meetings to feed format
    const participatedFeedData = participatedMeetings.map(activity => ({
      id: activity.meeting.id,
      meetingId: activity.meeting.id,
      meetingName: activity.meeting.meetingName,
      meetingBackground: activity.meeting.meetingBackground,
      meetingTime: activity.meeting.meetingTime.toISOString(),
      duration: activity.meeting.duration,
      categories: activity.meeting.categories,
      activities: activity.meeting.activities,
      participantCount: activity.meeting.participants.length,
      maxParticipants: activity.meeting.maxNum,
      activityType: 'participated' as const,
      participant: {
        id: activity.user.id,
        nickname: activity.user.nickname,
        profileImage: activity.user.profileImage,
        activeCommunityBadge: activity.user.activeCommunityBadge
      },
      host: {
        id: activity.meeting.user.id,
        nickname: activity.meeting.user.nickname,
        profileImage: activity.meeting.user.profileImage,
        city: activity.meeting.user.city,
        province: activity.meeting.user.province,
        activeCommunityBadge: activity.meeting.user.activeCommunityBadge
      },
      activityDate: activity.joinedOn.toISOString()
    }))

    // Transform created meetings to feed format
    const createdFeedData = createdMeetings.map(meeting => ({
      id: meeting.id,
      meetingId: meeting.id,
      meetingName: meeting.meetingName,
      meetingBackground: meeting.meetingBackground,
      meetingTime: meeting.meetingTime.toISOString(),
      duration: meeting.duration,
      categories: meeting.categories,
      activities: meeting.activities,
      participantCount: meeting.participants.length,
      maxParticipants: meeting.maxNum,
      activityType: 'created' as const,
      participant: null, // No participant for created meetings
      host: {
        id: meeting.user.id,
        nickname: meeting.user.nickname,
        profileImage: meeting.user.profileImage,
        city: meeting.user.city,
        province: meeting.user.province,
        activeCommunityBadge: meeting.user.activeCommunityBadge
      },
      activityDate: meeting.createdAt.toISOString()
    }))

    // Combine and sort by activity date
    const allActivity = [...participatedFeedData, ...createdFeedData]
      .sort((a, b) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime())
      .slice(0, 20) // Take top 20 most recent activities

    return NextResponse.json(allActivity)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch following activity' },
      { status: 500 }
    )
  }
}

