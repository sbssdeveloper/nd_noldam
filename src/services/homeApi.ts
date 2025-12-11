import { API_CONFIG } from '@/apiConfigs/api'
import { apiService } from './apiService'

// Home API service following MedQwik pattern
export class HomeApiService {
  // Get home page data
  static async getHomeData() {
    return apiService.get(`${API_CONFIG.ENDPOINTS.HOME_DATA}`)
  }

  // Get user profile; optionally pass userId to view others
  static async getProfile(userId?: number | string) {
    const suffix = (userId != null && userId !== 0 && userId !== '0') ? `?userId=${userId}` : ''
    return apiService.get(`${API_CONFIG.ENDPOINTS.PROFILE}${suffix}`)
  }

  // Get user summary
  static async getSummary() {
    return apiService.get(`${API_CONFIG.ENDPOINTS.SUMMARY}`)
  }

  // Get user badges
  static async getBadges() {
    return apiService.get(`${API_CONFIG.ENDPOINTS.BADGES}`)
  }
}

export default HomeApiService
