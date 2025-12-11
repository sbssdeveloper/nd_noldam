import { apiService } from './apiService'
import type { SearchFilters } from './types/frontend'

// Search API service following project pattern
export class SearchApiService {
  // Search meetings with filters
  static async searchMeetings(query: string, filters: SearchFilters = {}) {
    const params = new URLSearchParams()
    
    if (query) params.append('q', query)
    if (filters.category) params.append('category', filters.category)
    if (filters.round) params.append('round', filters.round)
    if (filters.sort) params.append('sort', filters.sort)

    const endpoint = `/search/meetings?${params.toString()}`
    return apiService.get(endpoint)
  }

  // Search posts with sort filter
  static async searchPosts(query: string, sort: string = 'latest') {
    const params = new URLSearchParams()
    
    if (query) params.append('q', query)
    if (sort) params.append('sort', sort)

    const endpoint = `/search/posts?${params.toString()}`
    return apiService.get(endpoint)
  }

  // Search users
  static async searchUsers(query: string, categoryId?: string) {
    const params = new URLSearchParams()
    
    if (query) params.append('q', query)
    if (categoryId) params.append('category', categoryId)

    const endpoint = `/search/users?${params.toString()}`
    return apiService.get(endpoint)
  }

  // Get categories (reuse existing endpoint)
  static async getCategories() {
    return apiService.get('/categories')
  }
}

export default SearchApiService

