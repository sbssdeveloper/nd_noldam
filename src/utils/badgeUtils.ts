// Utility functions for badge management
import type { Badge, BadgeStats } from '@/services/badgesApi';

type CommunityBadgeKey = 'seeds' | 'Mokkoji' | 'name' | 'fencer';

interface CommunityBadgeInfo {
  label: string;
  image: string;
  badgeLabel: string;
  headLine: string;
  description: string;
}

const COMMUNITY_BADGE_INFO: Record<CommunityBadgeKey, CommunityBadgeInfo> = {
  seeds: {
    label: '씨앗',
    image: '/images/rank-seed.png',
    badgeLabel: '나는 시드 등급으로 승격되었습니다',
    headLine: '종자 등급으로 업그레이드됨',
    description: '종자등급입니다'
  },
  Mokkoji: {
    label: '모꼬지',
    image: '/images/rank-mokkoji.png',
    badgeLabel: '모코지 직급으로 승진했어요',
    headLine: '목코지 등급으로 업그레이드',
    description: '목코지등급입니다'
  },
  name: {
    label: '이름이',
    image: '/images/rank-name.png',
    badgeLabel: '나는 이름 순위로 승진했다',
    headLine: '이름 등급으로 업그레이드됨',
    description: '이름등급입니다'
  },
  fencer: {
    label: '담장인',
    image: '/images/rank-damjangi.png',
    badgeLabel: '나는 펜싱 선수로 승진했다',
    headLine: '펜서 등급으로 업그레이드',
    description: '검투사 등급입니다'
  }
};

const COMMUNITY_BADGE_KEY_BY_ID: Record<number, CommunityBadgeKey> = {
  1: 'seeds',
  2: 'Mokkoji',
  3: 'name',
  4: 'fencer'
};

export interface BadgeData {
  earnedBadges: Badge[];
  unearnedRegularBadges: Badge[];
  unearnedCommunityBadges: Badge[];
  recentBadge: Badge | null;
  stats: BadgeStats;
}

/**
 * Get the active community rating badge for a user
 */
export const getActiveCommunityBadge = (badgeData: BadgeData | null): Badge | null => {
  if (!badgeData?.earnedBadges) return null;

  const communityBadges = badgeData.earnedBadges.filter(
    (badge) => badge.badgeType === 'community_rating'
  );

  return (
    communityBadges.sort(
      (a, b) => (b.condition_followers || 0) - (a.condition_followers || 0)
    )[0] || null
  );
};

/**
 * Resolve the community badge key from badge data
 */
export const resolveCommunityBadgeKey = (
  badge: { id?: number; name?: string } | null | undefined,
  fallbackKey?: CommunityBadgeKey | null
): CommunityBadgeKey | null => {
  if (!badge) return fallbackKey ?? null;

  if (badge.id != null && COMMUNITY_BADGE_KEY_BY_ID[badge.id]) {
    return COMMUNITY_BADGE_KEY_BY_ID[badge.id];
  }

  const name = badge.name || '';
  if (name.includes('씨앗')) return 'seeds';
  if (name.includes('모꼬지')) return 'Mokkoji';
  if (name.includes('이름이') || name.includes('이음이')) return 'name';
  if (name.includes('담장')) return 'fencer';

  return fallbackKey ?? null;
};

/**
 * Get the display label for a community badge
 */
export const getCommunityBadgeLabel = (
  badge: { id?: number; name?: string } | null | undefined,
  fallbackKey?: CommunityBadgeKey | null
): string | null => {
  const key = resolveCommunityBadgeKey(badge, fallbackKey);
  return key ? COMMUNITY_BADGE_INFO[key].label : null;
};

/**
 * Get community badge image path
 */
export const getCommunityBadgeImage = (
  badge: { id?: number; name?: string } | null | undefined,
  fallbackKey?: CommunityBadgeKey | null
): string | null => {
  const key = resolveCommunityBadgeKey(badge, fallbackKey);
  return key ? COMMUNITY_BADGE_INFO[key].image : null;
};

/**
 * Get all info for display
 */
// export const getCommunityBadgeDisplay = (
//   badge: { id?: number; name?: string; imageUrl?: string } | null | undefined,
//   fallbackKey?: CommunityBadgeKey | null
// ) => {
//   const key = resolveCommunityBadgeKey(badge, fallbackKey);
//   if (!key) return null;

//   return {
//     key,
//     label: COMMUNITY_BADGE_INFO[key].label,
//     image: badge?.imageUrl || COMMUNITY_BADGE_INFO[key].image
//   };
// };
export const getCommunityBadgeDisplay = (
  badge: { id?: number; name?: string; imageUrl?: string } | null | undefined,
  fallbackKey?: CommunityBadgeKey | null
): {
  key: CommunityBadgeKey;
  label: string;
  image: string;
  badgeLabel: string;
  headLine: string;
  description: string;
} | null => {
  const key = resolveCommunityBadgeKey(badge, fallbackKey);
  if (!key) return null;

  const info = COMMUNITY_BADGE_INFO[key];

  return {
    key,
    label: info.label,
    image: badge?.imageUrl || info.image,
    badgeLabel: info.badgeLabel,
    headLine: info.headLine,
    description: info.description
  };
};


/**
 * Check if a user is the current user
 */
export const isCurrentUser = (
  userId: number,
  currentUserId: string | number | null
): boolean => {
  if (!currentUserId) return false;
  return userId === parseInt(currentUserId.toString());
};
