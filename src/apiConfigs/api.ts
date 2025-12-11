// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  ENDPOINTS: {
    // Auth
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    
    // User & Profile
    PROFILE: '/users/profile',
    PROFILE_UPDATE: '/users/profile',
    FOLLOW: '/users/follow',
    UNFOLLOW: '/users/unfollow',
    FOLLOW_STATUS: (userId: string) => `/users/follow-status/${userId}`,
    FOLLOWERS: (userId: string) => `/users/followers/${userId}`,
    FOLLOWING: (userId: string) => `/users/following/${userId}`,
    
    // Posts
    POSTS: '/posts',
    POST_DETAIL: (id: string) => `/posts/${id}`,
    POST_LIKE: (id: string) => `/posts/${id}/like`,
    POST_COMMENT: '/comments',
    POST_COMMENT_LIKE: (id: string) => `/comments/${id}/like`,
    
    // Feed
    FEED: '/users/feed',
    MY_POSTS: '/users/feed?tab=posts',
    REPLIES: '/users/feed?tab=replies',
    TAGGED: '/users/feed?tab=tagged',
    
    // Meetings
    MEETINGS: '/meetings',
    MEETING_DETAIL: (id: string) => `/meetings/${id}`,
    MEETING_JOIN: (id: string) => `/meetings/${id}/join`,
    MEETING_LEAVE: (id: string) => `/meetings/${id}/leave`,
    MEETING_REVIEWS: (id: string) => `/meetings/${id}/reviews`,
    MEETING_LIKE: (id: string) => `/meetings/${id}/like`,
    MEETING_SNAPSHOTS: (id: string) => `/meetings/${id}/snapshots`,
    
    // Badges
    BADGES: '/users/badges',
    
    // Summary & Stats
    SUMMARY: '/users/summary',
    
    // Home Page
    HOME_DATA: '/home-page-data',
  },
  TIMEOUT: 30000, // 30 seconds to accommodate heavier DB queries
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// Request headers
export const getAuthHeaders = (token?: string) => ({
  'Content-Type': 'application/json',
  ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
});

// Common request options
export const getRequestOptions = (token?: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any) => ({
  method,
  headers: getAuthHeaders(token),
  ...(body && { body }),
});

