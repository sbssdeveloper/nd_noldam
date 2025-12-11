import { API_CONFIG } from '@/apiConfigs/api'
import { apiService } from './apiService'

// Feed API service following MedQwik pattern
export class FeedApiService {
  // Get user feed
  static async getFeed(tab: 'posts' | 'replies' | 'tagged' = 'posts', userId?: number | string) {
    // Use /api/users/feed endpoint directly
    const params = new URLSearchParams()
    params.append('tab', tab)
    if (userId != null && userId !== undefined && userId !== '') {
      // Ensure userId is converted to a valid number string
      const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId
      if (!isNaN(userIdNum) && userIdNum > 0) {
        params.append('userId', userIdNum.toString())
      }
    }
    const fullUrl = `/users/feed?${params.toString()}`
    return apiService.get(fullUrl)
  }

  // Get posts
  static async getPosts() {
    return apiService.get(`${API_CONFIG.ENDPOINTS.POSTS}`)
  }

  // Get post detail
  static async getPostDetail(id: string) {
    return apiService.get(API_CONFIG.ENDPOINTS.POST_DETAIL(id))
  }

  // Like post
  static async likePost(id: string) {
    return apiService.post(API_CONFIG.ENDPOINTS.POST_LIKE(id))
  }

  // Add comment
  static async addComment(data: any) {
    return apiService.post(`${API_CONFIG.ENDPOINTS.POST_COMMENT}`, data)
  }

  // Like comment
  static async likeComment(id: string) {
    return apiService.post(API_CONFIG.ENDPOINTS.POST_COMMENT_LIKE(id))
  }

  // Delete comment
  static async deleteComment(id: string) {
    return apiService.delete(`/api/comments/${id}`)
  }

  // Create post
  static async createPost(data: {
    content: string
    title?: string
    imageUrl?: string
    isPublic?: boolean
    tags?: string[]
    meetingId?: string | number
  }) {
    return apiService.post(API_CONFIG.ENDPOINTS.POSTS, data)
  }

  static async getFollowingActivity() {
    return apiService.get('/feed/following-activity')
  }

  // Get interest-based meetings (Type 2: Meetings based on user's interests)
  static async getInterestMeetings() {
    return apiService.get('/feed/interest-meeting')
  }

  // Get trending posts (Type 3: Trending posts based on user interests)
  static async getTrendingPosts() {
    const response = await apiService.get('/feed/trending-posts')
    
    // Handle double-wrapped response from apiService
    const actualData = response.data?.data || response.data
    
    // Return only trendingPosts for backward compatibility
    if (response.success && actualData && actualData.trendingPosts) {
      return {
        success: true,
        data: actualData.trendingPosts
      }
    }
    
    return response
  }

  // Get remaining trending posts (from 11th position onwards)
  static async getRemainingTrendingPosts() {
    const response = await apiService.get('/feed/trending-posts')
    
    // Handle double-wrapped response from apiService
    const actualData = response.data?.data || response.data
    
    // Return only remainingPosts
    if (response.success && actualData && actualData.remainingPosts) {
      return {
        success: true,
        data: actualData.remainingPosts
      }
    }
    return {
      success: true,
      data: []
    }
  }


  // Get token from redux-persist (same method as apiService)
  private static getToken(): string | null {
    if (typeof window === 'undefined') return null
    
    try {
      // Try multiple localStorage keys
      const keys = ['noldam-root', 'persist:noldam-root', 'persist:root', 'token']
      
      for (const key of keys) {
        const raw = localStorage.getItem(key)
        
        if (raw) {
          // Direct token (not JSON)
          if (key === 'token' || raw.startsWith('eyJ')) {
            return raw
          }
          
          try {
            const parsed = JSON.parse(raw)
            
            // Redux persist format: { authReducer: "{...}" }
            if (parsed.authReducer) {
              if (typeof parsed.authReducer === 'string') {
                const authState = JSON.parse(parsed.authReducer)
                if (authState.token && authState.token !== false && authState.token !== null) {
                  return authState.token
                }
              } else if (typeof parsed.authReducer === 'object') {
                // Already parsed object
                if (parsed.authReducer.token && parsed.authReducer.token !== false) {
                  return parsed.authReducer.token
                }
              }
            }
            
            // Old format: { auth: "{token: ...}" }
            if (parsed.auth) {
              const authData = typeof parsed.auth === 'string' ? JSON.parse(parsed.auth) : parsed.auth
              if (authData.token) {
                return authData.token
              }
            }
            
            // Direct token in parsed object
            if (parsed.token && typeof parsed.token === 'string') {
              return parsed.token
            }
          } catch (e) {
            // Might be a direct token string
            if (raw.startsWith('eyJ')) {
              return raw
            }
          }
        }
      }
      
      return null
    } catch (error) {
      return null
    }
  }

  // Upload image
  static async uploadImage(file: File, providedToken?: string) {
    const formData = new FormData()
    formData.append('image', file)
    
    // PRIORITY: Use provided token from Redux, then try localStorage
    let token: string | null | undefined = providedToken
    
    if (!token) {
      token = this.getToken()
    }
    
    if (!token) {
      return {
        success: false,
        reason: 'No authentication token available. Please login.',
        statusCode: 401
      }
    }
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`
    }
    
    return fetch('/api/upload/image', {
      method: 'POST',
      headers,
      body: formData
    }).then(async res => {
      const data = await res.json()
      return data
    })
  }
}

export default FeedApiService
