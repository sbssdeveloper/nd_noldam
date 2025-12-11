import { API_CONFIG, getRequestOptions } from '@/apiConfigs/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiService {
  private baseURL: string;
  private timeout: number;
  private inFlightRequests: Map<string, Promise<ApiResponse<any>>>;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
    this.inFlightRequests = new Map();
  }

  // Get token from redux-persist only (single source of truth)
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    try {
      // Primary key used by redux-persist
      const persistKey = 'persist:noldam-root';
      const raw = localStorage.getItem(persistKey);
      
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          
          // Redux persist format: { authReducer: "{...}" }
          if (parsed.authReducer && typeof parsed.authReducer === 'string') {
            const authState = JSON.parse(parsed.authReducer);
            if (authState.token) {
              return authState.token;
            }
          }
        } catch (e) {
          // Error parsing persisted auth state
        }
      }
      
      return null;
    } catch (error) {
      // Error getting token
    }
    
    return null;
  }

  // Main request method - always fresh, no caching
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const authToken = this.getToken();
    // API request
    return this.makeRequest<T>(endpoint, options, authToken);
  }

  // Make actual HTTP request
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit,
    token: string | null
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const method = (options.method || 'GET').toUpperCase();
    const dedupeKey = `${method} ${url}`;

    // Return the same promise if an identical request is already in-flight
    const existing = this.inFlightRequests.get(dedupeKey);
    if (existing) {
      return existing as Promise<ApiResponse<T>>;
    }
    const requestOptions = {
      ...getRequestOptions(token || undefined, options.method as any),
      ...options,
      // Handle body stringification
      body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
    };

    const run = (async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...requestOptions,
        headers: {
          ...requestOptions.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    })().catch((error: any) => {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
        };
      }

      return {
        success: false,
        error: error.message || 'Network error',
      };
    }).finally(() => {
      // Ensure we remove the in-flight entry after resolution
      this.inFlightRequests.delete(dedupeKey);
    });

    // Store in-flight promise for deduplication
    this.inFlightRequests.set(dedupeKey, run as Promise<ApiResponse<any>>);
    return run as Promise<ApiResponse<T>>;
  }

  // Convenience methods
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { 
      method: 'POST', 
      body: data 
    });
  }

  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { 
      method: 'PUT', 
      body: data 
    });
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // No cache to clear - all requests are fresh
  clearCache(type?: string): void {
    // No cache to clear - all requests are fresh
  }

}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
