import { NextRequest, NextResponse } from 'next/server';
import { Decimal } from '@prisma/client/runtime/library';
import jwt from 'jsonwebtoken';
import { NotificationService } from '@/app/web/config/NotificationService';
import { NOTIFICATION_TYPES, getNotificationConfig } from '@/app/web/config/notifications';
import { prisma } from '@/utils/prisma';
const notificationService = new NotificationService();

// Type definitions
interface MeetingParticipant {
  id: number;
  joinedOn: Date;
  paymentStatus: string;
  meetingId: number;
  userId: number;
  paymentId?: number | null;
  meeting: {
    id: number;
    meetingName: string;
    meetingTime: Date;
    meetingAddress: string;
    city: string;
    description?: string | null;
    meetingBackground?: string | null;
    categories: string[];
    activities: string[];
    fee: Decimal;
    maxNum: number;
    user: {
      id: number;
      nickname: string | null;
      profileImage?: string | null;
      city?: string | null;
      province?: string | null;
    };
    participants: Array<{
      id: number;
      user: {
        id: number;
        nickname: string | null;
        profileImage?: string | null;
      };
    }>;
  };
}

interface Meeting {
  id: number;
  meetingName: string;
  meetingTime: Date;
  meetingAddress: string;
  city: string;
  description?: string | null;
  meetingBackground?: string | null;
  categories: string[];
  activities: string[];
  fee: Decimal;
  maxNum: number;
  userId: number;
  user: {
    id: number;
    nickname: string | null;
    profileImage?: string | null;
    city?: string | null;
    province?: string | null;
  };
  participants: Array<{
    id: number;
    user: {
      id: number;
      nickname: string | null;
      profileImage?: string | null;
    };
  }>;
}

interface Friend {
  id: number;
  nickname: string | null;
  profileImage?: string | null;
  city?: string | null;
  province?: string | null;
  categories: number[];
}

interface MeetingDetail {
  id: number;
  name: string;
  time: Date;
  location: string;
  participants: number;
  maxParticipants: number;
  creator: {
    id: number;
    nickname: string | null;
    profileImage?: string | null;
    city?: string | null;
    province?: string | null;
  };
  description?: string | null;
  background?: string | null;
  categories: string[];
  activities: string[];
  fee: Decimal;
  score?: number;
  isFriendSuggestion?: boolean;
}

function errorResponse(message: string, statusCode: number) {
  return {
    success: false,
    reason: message,
    statusCode
  };
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        errorResponse('No token provided', 401),
        { status: 401 }
      );
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments') as any;
    const userId = parseInt(payload.uid || payload.userId);

    if (!userId) {
      return NextResponse.json(
        errorResponse('Invalid token payload', 401),
        { status: 401 }
      );
    }

    // ⚡ PERFORMANCE OPTIMIZATION: Run ALL queries in parallel using Promise.allSettled
    // This is MUCH faster than sequential await calls
    const [
      userResult,
      joinedMeetingsResult,
      createdMeetingsResult,
      friendsResult,
      userCategoriesResult,
      recentBadgesResult,
      notificationsResult
    ] = await Promise.allSettled([
      // 1. Check if user exists
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, nickname: true, categories: true }
      }),
      
      // 2. Get joined meetings (limited and optimized)
      prisma.meetingParticipant.findMany({
        where: { 
          userId,
          meeting: {
            // Hide draft meetings from other users
            OR: [
              { status: { not: 'draft' } }, // Show non-draft meetings to everyone
              { status: 'draft', userId: userId } // Show user's own drafts
            ]
          }
        },
        select: {
          joinedOn: true,
          meeting: {
            select: {
              id: true,
              meetingName: true,
              meetingTime: true,
              meetingBackground: true,
              roadNameAddress: true,
              detailedAddress: true,
              description: true,
              fee: true,
              maxNum: true,
              categories: true,
              activities: true,
              user: {
                select: {
                  id: true,
                  nickname: true,
                  profileImage: true
                }
              },
              _count: {
                select: {
                  participants: true
                }
              }
            }
          }
        },
        orderBy: { joinedOn: 'desc' },
        take: 20
      }),
      
      // 3. Get created meetings (limited and optimized)
      prisma.meeting.findMany({
        where: { userId },
        select: {
          id: true,
          meetingName: true,
          meetingTime: true,
          meetingBackground: true,
          roadNameAddress: true,
          detailedAddress: true,
          description: true,
          fee: true,
          maxNum: true,
          categories: true,
          activities: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              nickname: true,
              profileImage: true
            }
          },
          _count: {
            select: {
              participants: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      
      // 4. Get friends (following) - limited
      prisma.follower.findMany({
        where: { userId },
        take: 50, // Limit to prevent loading thousands
        select: {
          followingUser: {
            select: {
              id: true,
              nickname: true,
              profileImage: true,
              categories: true
            }
          }
        }
      }),
      
      // 5. User categories already fetched in step 1
      Promise.resolve(null),
      
      // 6. Get recent badges
      prisma.userBadge.findMany({
        where: { userId },
        include: {
          badge: {
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
              badgeType: true
            }
          }
        },
        orderBy: { earnedAt: 'desc' },
        take: 5
      }),
      
      // 7. Get notifications
      notificationService.getRecentNotifications(userId, 10).catch(() => [])
    ])

    // Extract results with fallbacks
    const user = userResult.status === 'fulfilled' ? userResult.value : null
    if (!user) {
      return NextResponse.json(
        errorResponse('User not found', 404),
        { status: 404 }
      );
    }

    const joinedMeetings = joinedMeetingsResult.status === 'fulfilled' ? joinedMeetingsResult.value : []
    const createdMeetings = createdMeetingsResult.status === 'fulfilled' ? createdMeetingsResult.value : []
    const friends = friendsResult.status === 'fulfilled' ? friendsResult.value.map(f => f.followingUser) : []
    const userCategories = user.categories || []
    const recentBadges = recentBadgesResult.status === 'fulfilled' ? recentBadgesResult.value : []
    const notifications = notificationsResult.status === 'fulfilled' ? notificationsResult.value : []
    
    type NotificationValue = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES]

    const ensureMeetingNotification = async (params: {
      userId: number
      type: NotificationValue
      meetingId: number
      data: Record<string, any>
      place?: string
    }) => {
      try {
        const existing = await prisma.userNotification.findFirst({
          where: {
            userId: params.userId,
            notificationType: params.type,
            relatedId: params.meetingId,
            ...(params.place ? { place: params.place } : {})
          }
        })

        if (!existing) {
          await notificationService.createNotification(params.userId, params.type, params.data, {
            relatedId: params.meetingId,
            relatedType: 'meeting',
            ...(params.place ? { place: params.place } : {})
          })
        }
      } catch (err) {
        console.error('Failed to create reminder notification', err)
      }
    }

    const MS_PER_DAY = 24 * 60 * 60 * 1000
    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    const reminderTasks: Promise<void>[] = []

    for (const participantRecord of joinedMeetings) {
      const meeting = participantRecord.meeting
      if (!meeting) continue

      const meetingStart = new Date(meeting.meetingTime)
      const meetingDay = new Date(meetingStart)
      meetingDay.setHours(0, 0, 0, 0)
      const daysUntilStart = Math.round((meetingDay.getTime() - today.getTime()) / MS_PER_DAY)

      if (daysUntilStart >= 1 && daysUntilStart <= 3) {
        reminderTasks.push(
          ensureMeetingNotification({
            userId,
            type: NOTIFICATION_TYPES.MEETING_PARTICIPANT_REMINDER,
            meetingId: meeting.id,
            data: {
              days: daysUntilStart,
              meetingName: meeting.meetingName,
              meetingId: meeting.id
            },
            place: `participant_reminder_day_${daysUntilStart}`
          })
        )
      }

      const hasPassed = meetingStart.getTime() <= now.getTime()
      const withinCompletionWindow = now.getTime() - meetingStart.getTime() <= 3 * MS_PER_DAY

      if (hasPassed && withinCompletionWindow) {
        reminderTasks.push(
          ensureMeetingNotification({
            userId,
            type: NOTIFICATION_TYPES.MEETING_COMPLETED,
            meetingId: meeting.id,
            data: {
              meetingName: meeting.meetingName,
              meetingId: meeting.id
            }
          })
        )
      }
    }

    for (const meeting of createdMeetings) {
      if (!meeting) continue

      const meetingStart = new Date(meeting.meetingTime)
      const meetingDay = new Date(meetingStart)
      meetingDay.setHours(0, 0, 0, 0)
      const daysUntilStart = Math.round((meetingDay.getTime() - today.getTime()) / MS_PER_DAY)

      if (daysUntilStart >= 1 && daysUntilStart <= 3) {
        reminderTasks.push(
          ensureMeetingNotification({
            userId,
            type: NOTIFICATION_TYPES.MEETING_HOST_REMINDER,
            meetingId: meeting.id,
            data: {
              days: daysUntilStart,
              meetingName: meeting.meetingName,
              meetingId: meeting.id
            },
            place: `host_reminder_day_${daysUntilStart}`
          })
        )
      }

      const hasPassed = meetingStart.getTime() <= now.getTime()
      const withinCompletionWindow = now.getTime() - meetingStart.getTime() <= 3 * MS_PER_DAY

      if (hasPassed && withinCompletionWindow) {
        reminderTasks.push(
          ensureMeetingNotification({
            userId,
            type: NOTIFICATION_TYPES.MEETING_COMPLETED,
            meetingId: meeting.id,
            data: {
              meetingName: meeting.meetingName,
              meetingId: meeting.id
            }
          })
        )
      }
    }

    if (reminderTasks.length > 0) {
      await Promise.allSettled(reminderTasks)
    }
    
    const recentNotifications = notifications.map((notification: any) => {
      const config = getNotificationConfig(notification.notificationType);
      return {
        id: notification.id,
        notificationType: notification.notificationType,
        notificationDetails: notification.notificationDetails,
        icon: config.icon,
        category: notification.category,
        priority: notification.priority,
        isRead: notification.isRead,
        actionUrl: notification.actionUrl,
        relatedId: notification.relatedId,
        relatedType: notification.relatedType,
        createdAt: notification.createdAt
      };
    })

    // Calculate consecutive participations
    const calculateConsecutiveParticipations = (meetings: any[]) => {
      if (meetings.length === 0) return 0;
      
      const sortedMeetings = meetings
        .map(m => m.joinedOn)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      let consecutive = 1;
      for (let i = 1; i < sortedMeetings.length; i++) {
        const current = new Date(sortedMeetings[i]);
        const previous = new Date(sortedMeetings[i - 1]);
        const diffDays = Math.floor((previous.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 7) { // Within a week
          consecutive++;
        } else {
          break;
        }
      }
      
      return consecutive;
    };

    const consecutiveParticipations = calculateConsecutiveParticipations(joinedMeetings);

    // Get scheduled meetings (future meetings user has joined)
    const scheduledMeetings = joinedMeetings
      .filter((m: any) => new Date(m.meeting.meetingTime) > new Date())
      .map((m: any) => ({
        id: m.meeting.id,
        name: m.meeting.meetingName,
        time: m.meeting.meetingTime,
        location: `${m.meeting.roadNameAddress} ${m.meeting.detailedAddress}`,
        participants: m.meeting._count.participants,
        maxParticipants: m.meeting.maxNum,
        creator: m.meeting.user,
        description: m.meeting.description,
        background: m.meeting.meetingBackground,
        categories: m.meeting.categories,
        activities: m.meeting.activities,
        fee: m.meeting.fee
      }));

    // Get participated meetings (past meetings user has joined)
    const participatedMeetings = joinedMeetings
      .filter((m: any) => new Date(m.meeting.meetingTime) <= new Date())
      .map((m: any) => ({
        id: m.meeting.id,
        name: m.meeting.meetingName,
        time: m.meeting.meetingTime,
        location: `${m.meeting.roadNameAddress} ${m.meeting.detailedAddress}`,
        participants: m.meeting._count.participants,
        maxParticipants: m.meeting.maxNum,
        creator: m.meeting.user,
        description: m.meeting.description,
        background: m.meeting.meetingBackground,
        categories: m.meeting.categories,
        activities: m.meeting.activities,
        fee: m.meeting.fee
      }));

    // Get created meetings
    const userCreatedMeetings = createdMeetings.map((m: any) => ({
      id: m.id,
      name: m.meetingName,
      time: m.meetingTime,
      location: `${m.roadNameAddress} ${m.detailedAddress}`,
      participants: m._count.participants,
      maxParticipants: m.maxNum,
      creator: m.user,
      description: m.description,
      background: m.meetingBackground,
      categories: m.categories,
      activities: m.activities,
      fee: m.fee
    }));

    // Friend meeting suggestions algorithm
    let friendSuggestions: MeetingDetail[] = [];
    if (friends.length > 0) {
      try {
        // Get meetings created by friends that user hasn't joined
        const friendIds = friends.map(f => f.id);
        const userJoinedMeetingIds = joinedMeetings.map(m => m.meeting.id);
        
        const friendMeetings = await prisma.meeting.findMany({
          where: {
            userId: { in: friendIds },
            id: { notIn: userJoinedMeetingIds },
            meetingTime: { gt: new Date() }, // Only future meetings
            // Hide draft meetings from other users
            OR: [
              { status: { not: 'draft' } }, // Show non-draft meetings to everyone
              { status: 'draft', userId: userId } // Show user's own drafts
            ]
          },
          select: {
            id: true,
            meetingName: true,
            meetingTime: true,
            meetingBackground: true,
            roadNameAddress: true,
            detailedAddress: true,
            description: true,
            categories: true,
            activities: true,
            fee: true,
            maxNum: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                nickname: true,
                profileImage: true,
                city: true,
                province: true
              }
            },
            _count: {
              select: {
                participants: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        });

        // Score meetings based on user interests and friend activity
        friendSuggestions = friendMeetings.map(meeting => {
          let score = 0;
          
          // Base score for friend's meeting
          score += 10;
          
          // Category matching bonus
          const categoryMatch = meeting.categories.some(cat => userCategories.includes(parseInt(cat)));
          if (categoryMatch) score += 20;
          
          // Activity matching bonus
          const activityMatch = meeting.activities.some(activity => 
            userCategories.some(cat => {
              // This is a simplified matching - you might want to implement more sophisticated matching
              return true; // For now, give bonus to all activities
            })
          );
          if (activityMatch) score += 15;
          
          // Recent meeting bonus
          const daysSinceCreated = Math.floor((new Date().getTime() - new Date(meeting.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceCreated <= 7) score += 10;
          
          // Popularity bonus (more participants = more popular)
          const popularityScore = Math.min(meeting._count.participants * 2, 20);
          score += popularityScore;
          
          return {
            id: meeting.id,
            name: meeting.meetingName,
            time: meeting.meetingTime,
            location: `${meeting.roadNameAddress} ${meeting.detailedAddress}`,
            participants: meeting._count.participants,
            maxParticipants: meeting.maxNum,
            creator: meeting.user,
            description: meeting.description,
            background: meeting.meetingBackground,
            categories: meeting.categories,
            activities: meeting.activities,
            fee: meeting.fee,
            score: score,
            isFriendSuggestion: true
          };
        }).sort((a, b) => b.score - a.score).slice(0, 5); // Top 5 suggestions

      } catch (error) {
        friendSuggestions = [];
      }
    }

    // Format activities for the summary
    const activities = [
      {
        id: 'scheduled',
        title: '예약한 모임',
        count: scheduledMeetings.length,
        icon: '📅',
        meetings: scheduledMeetings
      },
      {
        id: 'friend_suggestions',
        title: '친구 모임 추천',
        count: friendSuggestions.length,
        icon: '👥',
        meetings: friendSuggestions
      },
      {
        id: 'participated',
        title: '참여한 모임',
        count: participatedMeetings.length,
        icon: '✅',
        meetings: participatedMeetings
      },
      {
        id: 'created',
        title: '개설한 모임',
        count: userCreatedMeetings.length,
        icon: '🎯',
        meetings: userCreatedMeetings
      }
    ];

    // Get main achievement badge (most recent or highest level)
    const mainBadge = recentBadges.length > 0 ? recentBadges[0].badge : null;

    const summaryData = {
      activities,
      mainBadge: mainBadge ? {
        id: mainBadge.id,
        name: mainBadge.name,
        description: mainBadge.description,
        imageUrl: mainBadge.imageUrl,
        badgeType: mainBadge.badgeType
      } : null,
      recentBadges: recentBadges.map(ub => ({
        id: ub.badge.id,
        name: ub.badge.name,
        description: ub.badge.description,
        imageUrl: ub.badge.imageUrl,
        earnedAt: ub.earnedAt
      })),
      notifications: recentNotifications,
      stats: {
        totalMeetings: joinedMeetings.length,
        totalCreated: createdMeetings.length,
        consecutiveParticipations,
        totalBadges: recentBadges.length
      },
      // Detailed meeting data for each category
      meetingDetails: {
        scheduled: scheduledMeetings,
        friendSuggestions: friendSuggestions,
        participated: participatedMeetings,
        created: userCreatedMeetings
      }
    };


    return NextResponse.json({
      success: true,
      data: summaryData
    });

  } catch (error) {
    return NextResponse.json(
      errorResponse('Internal server error', 500),
      { status: 500 }
    );
  }
  // Don't disconnect shared Prisma instance!
}
