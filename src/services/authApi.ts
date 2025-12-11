import { API_CONFIG } from '@/apiConfigs/api'
import { apiService } from './apiService'

// Auth API service following MedQwik pattern
export class AuthApiService {
  // Login user
  static async login(credentials: { phoneNumber: string; nickname: string }) {
    return apiService.post(`${API_CONFIG.ENDPOINTS.LOGIN}`, credentials)
  }

  // Register user
  static async register(userData: any) {
    return apiService.post(`${API_CONFIG.ENDPOINTS.REGISTER}`, userData)
  }

  // Logout user
  static async logout() {
    return apiService.post(`${API_CONFIG.ENDPOINTS.LOGOUT}`)
  }

  // Check auth status
  static async checkAuthStatus() {
    const result = await apiService.get('/users/profile')
    return result
  }
}

export default AuthApiService
