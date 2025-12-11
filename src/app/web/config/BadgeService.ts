import { prisma } from '@/utils/prisma';

type CommunityBadgeKey = 'seeds' | 'Mokkoji' | 'name' | 'fencer'

type CommunityBadgeConfig = {
  key: CommunityBadgeKey
  label: string
  badgeName: string
  minMeetings: number
  minAverageRating?: number
  minReviews?: number
  minReParticipationRate?: number
}

type CommunityBadgeMetrics = {
  meetingsHosted: number
  totalReviews: number
  totalRating: number
  averageSatisfaction: number
  distinctParticipants: number
  returningParticipants: number
  reParticipationRate: number
}

const COMMUNITY_BADGE_ASSETS: Record<
  CommunityBadgeKey,
  { imageUrl: string; description: string; condition_followers: number | null }
> = {
  seeds: {
    imageUrl: '/images/rank-seed.png',
    description: '씨앗 등급입니다.',
    condition_followers: 0
  },
  Mokkoji: {
    imageUrl: '/images/rank-mokkoji.png',
    description: '모꼬지 등급으로 성장했어요!',
    condition_followers: 100
  },
  name: {
    imageUrl: '/images/rank-name.png',
    description: '이름이 등급으로 도달했습니다!',
    condition_followers: 500
  },
  fencer: {
    imageUrl: '/images/rank-damjangi.png',
    description: '담장인 최고 등급을 달성했어요!',
    condition_followers: 1000
  }
}

const COMMUNITY_BADGES: CommunityBadgeConfig[] = [
  {
    key: 'fencer',
    label: '담장인',
    badgeName: '담장이 등급으로 승급했어요',
    minMeetings: 15,
    minAverageRating: 4.5,
    minReParticipationRate: 0.5
  },
  {
    key: 'name',
    label: '이름이',
    badgeName: '이음이 등급으로 승급했어요',
    minMeetings: 7,
    minAverageRating: 4.3,
    minReviews: 10
  },
  {
    key: 'Mokkoji',
    label: '모꼬지',
    badgeName: '모꼬지 등급으로 승급했어요',
    minMeetings: 3,
    minAverageRating: 4
  },
  {
    key: 'seeds',
    label: '씨앗',
    badgeName: '씨앗 등급으로 승급했어요',
    minMeetings: 1
  }
]

export class BadgeService {
  private static communityBadgeIdCache: Partial<Record<CommunityBadgeKey, number | null>> = {}

  private static async resolveCommunityBadgeId(badge: CommunityBadgeConfig): Promise<number | null> {
    if (this.communityBadgeIdCache[badge.key] !== undefined) {
      return this.communityBadgeIdCache[badge.key] ?? null
    }

    const badgeRecord = await prisma.badge.findFirst({
      where: {
        badgeType: 'community_rating',
        name: badge.badgeName
      },
      select: { id: true }
    })

    let badgeId = badgeRecord?.id ?? null

    if (badgeId === null) {
      console.warn(`[BadgeService] Missing community badge definition for "${badge.badgeName}". Creating default entry.`)

      const assets = COMMUNITY_BADGE_ASSETS[badge.key]
      const created = await prisma.badge.create({
        data: {
          name: badge.badgeName,
          description: assets.description,
          imageUrl: assets.imageUrl,
          badgeType: 'community_rating',
          condition_meetings: null,
          condition_likes: null,
          condition_posts: null,
          condition_followers: assets.condition_followers,
          isActive: true
        }
      })

      badgeId = created.id
    }

    this.communityBadgeIdCache[badge.key] = badgeId

    return badgeId
  }

  /**
   * Get user's badge data
   */
  static async getUserBadgeData(userId: number) {
    try {
      const [
        earnedBadges,
        allBadges,
        meetingsJoined,
        postsCreated,
        likesReceived,
        metrics
      ] = await Promise.all([
        prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true },
        orderBy: { earnedAt: 'desc' }
        }),
        prisma.badge.findMany({
        where: { isActive: true }
        }),
        prisma.meetingParticipant.count({
        where: { userId }
        }),
        prisma.post.count({
        where: { userId }
        }),
        prisma.postLikes.count({
        where: { post: { userId } }
        }),
        this.calculateCommunityBadgeMetrics(userId)
      ])

      const earnedBadgeIds = new Set(earnedBadges.map(ub => ub.badgeId))
      const unearnedRegularBadges = allBadges.filter(
        badge => !earnedBadgeIds.has(badge.id) && badge.badgeType === 'regular'
      )
      const unearnedCommunityBadges = allBadges.filter(
        badge => !earnedBadgeIds.has(badge.id) && badge.badgeType === 'community_rating'
      )

      const communityBadgeConfig = this.determineCommunityBadge(metrics)
      const communityLevelKey = communityBadgeConfig?.key ?? null
      const communityLevelLabel = communityBadgeConfig?.label ?? null

      return {
        earnedBadges: earnedBadges.map(ub => ({
          id: ub.badge.id,
          name: ub.badge.name,
          description: ub.badge.description,
          imageUrl: ub.badge.imageUrl,
          badgeType: ub.badge.badgeType,
          earnedAt: ub.earnedAt,
          condition_meetings: ub.badge.condition_meetings,
          condition_likes: ub.badge.condition_likes,
          condition_posts: ub.badge.condition_posts,
          condition_followers: ub.badge.condition_followers
        })),
        unearnedRegularBadges: unearnedRegularBadges.map(badge => ({
          id: badge.id,
          name: badge.name,
          description: badge.description,
          imageUrl: badge.imageUrl,
          badgeType: badge.badgeType,
          condition_meetings: badge.condition_meetings,
          condition_likes: badge.condition_likes,
          condition_posts: badge.condition_posts,
          condition_followers: badge.condition_followers
        })),
        unearnedCommunityBadges: unearnedCommunityBadges.map(badge => ({
          id: badge.id,
          name: badge.name,
          description: badge.description,
          imageUrl: badge.imageUrl,
          badgeType: badge.badgeType,
          condition_meetings: badge.condition_meetings,
          condition_likes: badge.condition_likes,
          condition_posts: badge.condition_posts,
          condition_followers: badge.condition_followers
        })),
        stats: {
          earnedBadgesCount: earnedBadges.length,
          totalBadges: allBadges.length,
          meetingsJoined,
          meetingsHosted: metrics.meetingsHosted,
          postsCreated,
          likesReceived,
          averageSatisfaction: Number(metrics.averageSatisfaction.toFixed(2)),
          totalReviews: metrics.totalReviews,
          reParticipationRate: Number((metrics.reParticipationRate * 100).toFixed(2)),
          communityLevelKey,
          communityLevelLabel,
          communityLevelDisplay: communityLevelLabel ?? '등급 없음',
          availableRanks: COMMUNITY_BADGES.map(badge => badge.label)
        }
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Ensure community badges for multiple users (used by feed/search APIs)
   */
  static async ensureCommunityBadgesForUsers(userIds: number[]): Promise<Record<number, { id: number; name: string; imageUrl: string | null } | null>> {
    const uniqueIds = Array.from(new Set(userIds.filter((id): id is number => typeof id === 'number' && !Number.isNaN(id))))
    if (uniqueIds.length === 0) {
      return {}
    }

    const users = await prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: {
        id: true,
        activeCommunityBadgeId: true
      }
    })

    const usersNeedingSync = users.filter(user => !user.activeCommunityBadgeId)

    if (usersNeedingSync.length > 0) {
      await Promise.all(
        usersNeedingSync.map(async user => {
          const metrics = await this.calculateCommunityBadgeMetrics(user.id)
          await this.syncCommunityBadge(user.id, metrics)
        })
      )
    }

    const refreshedUsers = await prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: {
        id: true,
        activeCommunityBadge: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        }
      }
    })

    return refreshedUsers.reduce<Record<number, { id: number; name: string; imageUrl: string | null } | null>>((acc, user) => {
      acc[user.id] = user.activeCommunityBadge ? {
        id: user.activeCommunityBadge.id,
        name: user.activeCommunityBadge.name,
        imageUrl: user.activeCommunityBadge.imageUrl
      } : null
      return acc
    }, {})
  }

  /**
   * Check and award badges
   */
  static async checkAndAwardBadges(userId: number, triggerType: string) {
    try {
      const [
        meetingsJoined,
        postsCreated,
        likesReceived,
        followersCount,
        allBadges,
        metrics
      ] = await Promise.all([
        prisma.meetingParticipant.count({ where: { userId } }),
        prisma.post.count({ where: { userId } }),
        prisma.postLikes.count({ where: { post: { userId } } }),
        prisma.follower.count({ where: { following: userId } }),
        prisma.badge.findMany({ where: { isActive: true } }),
        this.calculateCommunityBadgeMetrics(userId)
      ])

      const currentBadges = await prisma.userBadge.findMany({
        where: { userId },
        select: { badgeId: true }
      })
      const earnedBadgeIds = new Set(currentBadges.map(ub => ub.badgeId))

      for (const badge of allBadges) {
        if (earnedBadgeIds.has(badge.id)) continue

        let shouldAward = true

        if (badge.condition_meetings !== null) {
          if (meetingsJoined < badge.condition_meetings) shouldAward = false
        }

        if (badge.condition_likes !== null) {
          if (likesReceived < badge.condition_likes) shouldAward = false
        }

        if (badge.condition_posts !== null) {
          if (postsCreated < badge.condition_posts) shouldAward = false
        }

        if (badge.condition_followers !== null) {
          if (followersCount < badge.condition_followers) shouldAward = false
        }

        if (shouldAward) {
          await prisma.userBadge.create({
            data: {
              userId,
              badgeId: badge.id,
              earnedAt: new Date()
            }
          })
        }
      }

      await this.syncCommunityBadge(userId, metrics)
    } catch (error) {
      throw error
    }
  }

  private static determineCommunityBadge(metrics: CommunityBadgeMetrics): CommunityBadgeConfig | null {
    for (const badge of COMMUNITY_BADGES) {
      if (metrics.meetingsHosted < badge.minMeetings) continue

      if (badge.minReviews !== undefined && metrics.totalReviews < badge.minReviews) continue

      if (badge.minAverageRating !== undefined) {
        if (metrics.totalReviews === 0) continue
        if (metrics.averageSatisfaction < badge.minAverageRating) continue
      }

      if (badge.minReParticipationRate !== undefined) {
        if (metrics.reParticipationRate < badge.minReParticipationRate) continue
      }

      return badge
    }

    return null
  }

  private static async calculateCommunityBadgeMetrics(userId: number): Promise<CommunityBadgeMetrics> {
    const meetings = await prisma.meeting.findMany({
      where: {
        userId
      },
      select: {
        id: true,
        reviews: {
          select: {
            rating: true
          }
        },
        participants: {
          select: {
            userId: true
          }
        }
      }
    })

    const meetingsHosted = meetings.length
    let totalReviews = 0
    let totalRating = 0
    const participantOccurrences = new Map<number, number>()

    for (const meeting of meetings) {
      for (const review of meeting.reviews) {
        totalReviews += 1
        totalRating += review.rating
      }

      const seen = new Set<number>()
      for (const participant of meeting.participants) {
        if (participant.userId === userId) continue
        if (seen.has(participant.userId)) continue
        seen.add(participant.userId)
        participantOccurrences.set(
          participant.userId,
          (participantOccurrences.get(participant.userId) || 0) + 1
        )
      }
    }

    const distinctParticipants = participantOccurrences.size
    const returningParticipants = Array.from(participantOccurrences.values()).filter(count => count >= 2).length
    const averageSatisfaction = totalReviews > 0 ? totalRating / totalReviews : 0
    const reParticipationRate =
      distinctParticipants > 0 ? returningParticipants / distinctParticipants : 0

    return {
      meetingsHosted,
      totalReviews,
      totalRating,
      averageSatisfaction,
      distinctParticipants,
      returningParticipants,
      reParticipationRate
    }
  }

  private static async syncCommunityBadge(userId: number, metrics: CommunityBadgeMetrics) {
    const badgeConfig = this.determineCommunityBadge(metrics)

    if (badgeConfig) {
      const badgeId = await this.resolveCommunityBadgeId(badgeConfig)

      if (!badgeId) {
        await prisma.user.update({
          where: { id: userId },
          data: { activeCommunityBadgeId: null }
        })
        return
      }

      const points = metrics.meetingsHosted

      await prisma.user.update({
        where: { id: userId },
        data: { activeCommunityBadgeId: badgeId }
      })

      await prisma.communityRating.upsert({
        where: { userId },
        update: {
          level: badgeConfig.key,
          meetingsCount: metrics.meetingsHosted,
          points
        },
        create: {
          userId,
          level: badgeConfig.key,
          points,
          followersCount: 0,
          postsCount: 0,
          meetingsCount: metrics.meetingsHosted
        }
      })
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { activeCommunityBadgeId: null }
      })

      await prisma.communityRating.upsert({
        where: { userId },
        update: {
          level: 'none',
          meetingsCount: metrics.meetingsHosted,
          points: 0
        },
        create: {
          userId,
          level: 'none',
          points: 0,
          followersCount: 0,
          postsCount: 0,
          meetingsCount: metrics.meetingsHosted
        }
      })
    }
  }
}

