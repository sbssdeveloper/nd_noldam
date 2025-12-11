import { apiService } from './apiService';
import { API_CONFIG } from '@/apiConfigs/api';

export interface Badge {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  badgeType: 'regular' | 'community_rating';
  condition_meetings?: number;
  condition_likes?: number;
  condition_posts?: number;
  condition_followers?: number;
  isActive: boolean;
}

export interface BadgeStats {
  totalBadges: number;
  earnedBadges: number;
  communityLevel: number;
}

export interface BadgesResponse {
  earnedBadges: Badge[];
  unearnedRegularBadges: Badge[];
  unearnedCommunityBadges: Badge[];
  stats: BadgeStats;
}

export class BadgesApiService {
  // Get badges
  async getBadges(): Promise<BadgesResponse | null> {
    const response = await apiService.get<BadgesResponse>(API_CONFIG.ENDPOINTS.BADGES);
    return response.success ? response.data! : null;
  }

  // Clear badges cache
  clearCache(): void {
    apiService.clearCache('badges');
  }
}

export const badgesApi = new BadgesApiService();
