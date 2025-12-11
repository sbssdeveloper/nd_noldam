// Utility function to get authorization header with JWT token
export const getAuthHeaders = (token?: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
})

// Utility function to get just the authorization header
export const getAuthHeader = (token?: string): string | null => (token ? `Bearer ${token}` : null)

// Utility function to check if user is authenticated
export const isAuthenticated = (token?: string): boolean => !!token

// Utility function to validate required fields in request data
export const validateRequiredFields = (data: any, requiredFields: string[]): { isValid: boolean; missingFields: string[] } => {
  const missingFields: string[] = []
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missingFields.push(field)
    }
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  }
}

export const apiCall = async (url: string, options: RequestInit = {}, token?: string) => {
  const headers = getAuthHeaders(token)
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  })

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`)
  }

  return response.json()
}

// API functions with Redux store integration
export const apiGetWithStore = async (url: string, token?: string) => {
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(token)
  })

  if (!response.ok) {
    throw new Error(`API GET failed: ${response.status}`)
  }

  return response
}

export const apiPutWithStore = async (url: string, data: any, token?: string) => {
  const response = await fetch(url, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    throw new Error(`API PUT failed: ${response.status}`)
  }

  return response
}

export const apiPostWithStore = async (url: string, data: any, token?: string) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    // Try to extract error message from response body
    try {
      const responseText = await response.text()
      
      if (responseText.trim()) {
        const errorData = JSON.parse(responseText)
        const errorMessage = errorData.error || `API POST failed: ${response.status}`
        throw new Error(errorMessage)
      } else {
        throw new Error(`API POST failed: ${response.status}`)
      }
    } catch (parseError) {
      console.error('❌ Failed to parse error response:', parseError)
      // If we can't parse the error response, use the generic error
      throw new Error(`API POST failed: ${response.status}`)
    }
  }

  // Parse the response body as JSON
  try {
    const responseText = await response.text()
    if (!responseText.trim()) {
      // If response is empty, return a success object
      return { success: true }
    }
    return JSON.parse(responseText)
  } catch (jsonError) {
    console.error('❌ Failed to parse response as JSON:', jsonError)
    // If we can't parse as JSON, return the response object
    return response
  }
}

// Note: logout is now handled by Redux actions and redux-persist
// This function is kept for backward compatibility but should not be used
export const logout = () => {
  console.warn('logout() from api.ts is deprecated. Use Redux logout action instead.')
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

// Utility function to get token from Redux store
export const getTokenFromStore = (): string | null => {
  if (typeof window === 'undefined') return null
  try {
    const token = localStorage.getItem('persist:noldam-root')
    if (!token) return null
    const parsed = JSON.parse(token)
    const authData = JSON.parse(parsed.auth || '{}')
    return authData.token || null
  } catch (e) {
    console.error('Error parsing auth token from store:', e)
    return null
  }
}
