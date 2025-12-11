import { apiService } from './apiService'
import { API_CONFIG } from '@/apiConfigs/api'

export interface UserProfile {
  id: number
  nickname: string
  email: string
  profileImage?: string
  statusMessage?: string
  activeCommunityBadge?: {
    id: number
    name: string
    imageUrl: string
    condition_followers: number
  }
  followers?: User[]
  following?: User[]
  stats?: {
    followersCount: number
    followingCount: number
    meetingsCreatedCount: number
    meetingsJoinedCount: number
  }
}

export interface User {
  id: number | string
  phoneNumber?: string
  nickname: string
  profileImage?: string
  statusMessage?: string
  province?: string
  city?: string
  categories?: number[]
  level?: number
  createdAt?: string
  updatedAt?: string
  location?: string
  activeCommunityBadge?: {
    id: number
    name: string
    imageUrl: string
    condition_followers: number
  }
}

export interface UserSummary {
  activities: any[]
  notifications: any[]
  mainBadge: any
}

export class UserApiService {
  // Get user profile
  async getProfile(): Promise<UserProfile | null> {
    const response = await apiService.get<UserProfile>(API_CONFIG.ENDPOINTS.PROFILE)
    return response.success ? response.data! : null
  }

  // Update user profile
  async updateProfile(data: Partial<UserProfile>): Promise<boolean> {
    const response = await apiService.put(API_CONFIG.ENDPOINTS.PROFILE_UPDATE, data)
    return response.success
  }

  // Get user summary
  async getSummary(): Promise<UserSummary | null> {
    const response = await apiService.get<UserSummary>(API_CONFIG.ENDPOINTS.SUMMARY)
    return response.success ? response.data! : null
  }

  // Update profile privacy (legacy - global privacy)
  async updateProfilePrivacy(publicVisibility: boolean): Promise<boolean> {
    const response = await apiService.put(API_CONFIG.ENDPOINTS.PROFILE_UPDATE, { publicVisibility })
    return response.success
  }

  // Update individual tab privacy
  async updateTabPrivacy(tabType: 'feed' | 'meetings' | 'badges', privacy: boolean): Promise<boolean> {
    const payload: any = { tabType }

    if (tabType === 'feed') {
      payload.feedPrivacy = privacy
    } else if (tabType === 'meetings') {
      payload.meetingsPrivacy = privacy
    } else if (tabType === 'badges') {
      payload.badgesPrivacy = privacy
    }

    const response = await apiService.put(API_CONFIG.ENDPOINTS.PROFILE_UPDATE, payload)
    return response.success
  }

  // Follow a user
  async followUser(userId: number): Promise<{ followingCount: number; followersCount: number } | null> {
    const response = await apiService.post(API_CONFIG.ENDPOINTS.FOLLOW, { userId })
    return response.success ? response.data! : null
  }

  // Unfollow a user
  async unfollowUser(userId: number): Promise<{ followingCount: number; followersCount: number } | null> {
    const response = await apiService.delete(`${API_CONFIG.ENDPOINTS.UNFOLLOW}?userId=${userId}`)
    return response.success ? response.data! : null
  }

  // Check follow status
  async getFollowStatus(userId: number): Promise<boolean | null> {
    const endpoint = API_CONFIG.ENDPOINTS.FOLLOW_STATUS(userId.toString())
    const response = await apiService.get(endpoint)
    return response.success ? response.data.data.isFollowing : null
  }
  async getFollowers(userId: number): Promise<{ followers: any[]; totalCount: number } | null> {
    const endpoint = API_CONFIG.ENDPOINTS.FOLLOWERS(userId.toString())
    const response = await apiService.get(endpoint)
    return response.success ? response.data.data : null
  }
  async getFollowing(userId: number): Promise<{ following: any[]; totalCount: number } | null> {
    const endpoint = API_CONFIG.ENDPOINTS.FOLLOWING(userId.toString())
    const response = await apiService.get(endpoint)
    return response.success ? response.data.data : null
  }
  // Clear user-related cache
  clearCache(): void {
    apiService.clearCache('users')
  }

  // Admin: Get all users for management
  async getUsersForManagement(params?: {
    search?: string
    grade?: string
    status?: string
  }): Promise<{ users: any[]; totalCount: number } | null> {
    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.append('search', params.search)
    if (params?.grade) queryParams.append('grade', params.grade)
    if (params?.status) queryParams.append('status', params.status)

    const endpoint = `/users/list${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const response = await apiService.get(endpoint)

    if (!response.success) {
      console.error('Failed to fetch users:', response.error)
      return null
    }

    // The API returns: { success: true, message: "...", data: { users: [...], totalCount: ... } }
    // apiService.get returns: { success: true, data: <API response> }
    // So we need to access response.data.data
    const apiData = response.data
    if (apiData && apiData.data) {
      return apiData.data
    }

    // Fallback: try direct access if structure is different
    if (apiData && (apiData.users || apiData.totalCount !== undefined)) {
      return apiData
    }

    console.error('Unexpected response structure:', apiData)
    return null
  }

  // Admin: Update user (role, status, grade, etc.)
  async updateUserAdmin(data: {
    userId: number
    role?: string
    status?: string
    grade?: string
    adminEmail?: string
    adminPassword?: string
    nickname?: string
    profileImage?: string
    statusMessage?: string
    province?: string
    city?: string
    categories?: number[]
  }): Promise<boolean> {
    try {
      const response = await apiService.put('/users', data)
      console.log('Update user response:', response)
      if (response.success && response.data) {
        // Check if the response data has success field
        const responseData = response.data as any
        if (responseData.success === false) {
          console.error('API returned error:', responseData.reason || responseData.message)
          return false
        }
        return true
      }
      return response.success
    } catch (error) {
      console.error('Error updating user:', error)
      return false
    }
  }

  // Admin: Delete user account permanently
  async deleteUser(userId: number): Promise<boolean> {
    try {
      const response = await apiService.request('/users', {
        method: 'DELETE',
        body: JSON.stringify({ userId })
      })
      if (response.success && response.data) {
        const responseData = response.data as any
        if (responseData.success === false) {
          console.error('API returned error:', responseData.reason || responseData.message)
          return false
        }
        return true
      }
      return response.success
    } catch (error) {
      console.error('Error deleting user:', error)
      return false
    }
  }
}

export const userApi = new UserApiService()
