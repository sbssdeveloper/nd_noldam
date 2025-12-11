import { apiService } from './apiService';
import { API_CONFIG } from '@/apiConfigs/api';

export interface Meeting {
  id: number;
  meetingName: string;
  meetingTime: string;
  meetingBackground?: string;
  currentParticipants: number;
  type: 'joined' | 'created';
  category: string;
  location: string;
  description?: string;
  userId: number; // Meeting owner's user ID
  user: {
    id: number;
    name: string;
    level: number;
    profileImage?: string;
    city?: string;
    province?: string;
  };
}

export interface MeetingsResponse {
  meetings: Meeting[];
  total: number;
}

export interface MeetingReview {
  id: number;
  userId: number;
  meetingId: number;
  rating: number;
  title?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    nickname: string;
    profileImage?: string;
  };
}

export interface MeetingSnapshot {
  postId: number;
  imageUrl: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  isLiked?: boolean;
  author: {
    id: number | null;
    nickname: string | null;
    profileImage?: string | null;
  } | null;
}

export interface ReviewsResponse {
  reviews: MeetingReview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  averageRating: number;
}

export class MeetingsApiService {
  // Get meetings
  async getMeetings(userId?: number, meetingType: 'all' | 'created' | 'participated' | 'upcoming' = 'all'): Promise<Meeting[] | null> {
    // For 'upcoming', use /users/meetings endpoint (apiService adds /api prefix)
    if (meetingType === 'upcoming') {
      const endpoint = `/users/meetings?type=upcoming`;
      const response = await apiService.get(endpoint);
      
      // /api/users/meetings returns: { success: true, data: { type, meetings, total } }
      // apiService.get() wraps it: { success: true, data: <API response> }
      // So response.data = { success: true, data: { type, meetings, total } }
      if (response.success && response.data) {
        const apiResponse = response.data as any;
        
        // Check if apiResponse has the nested structure
        if (apiResponse && apiResponse.success && apiResponse.data && Array.isArray(apiResponse.data.meetings)) {
          return apiResponse.data.meetings;
        }
        
        // Fallback: maybe apiResponse is already the data object
        if (apiResponse && apiResponse.data && Array.isArray(apiResponse.data.meetings)) {
          return apiResponse.data.meetings;
        }
        
        // Debug: log the actual structure to see what we're getting
        console.log('[getMeetings] Upcoming response debug:', {
          hasResponse: !!response,
          responseSuccess: response.success,
          hasResponseData: !!response.data,
          responseDataType: typeof response.data,
          responseDataIsArray: Array.isArray(response.data),
          responseDataKeys: response.data && typeof response.data === 'object' ? Object.keys(response.data) : null,
          apiResponseType: typeof apiResponse,
          apiResponseKeys: apiResponse && typeof apiResponse === 'object' ? Object.keys(apiResponse) : null,
          fullResponse: JSON.stringify(response, null, 2).substring(0, 500)
        });
      }
      return null;
    }
    
    let endpoint = API_CONFIG.ENDPOINTS.MEETINGS;
    if (userId) {
      endpoint += `?userId=${userId}&meetingType=${meetingType}`;
    }
    const response = await apiService.get<Meeting[]>(endpoint);
    return response.success ? response.data! : null;
  }

  // Get meeting details (now includes category and activity names from backend)
  async getMeetingDetails(meetingId: number): Promise<Meeting | null> {
    const response = await apiService.get<Meeting>(API_CONFIG.ENDPOINTS.MEETING_DETAIL(meetingId.toString()));
    return response.success ? response.data! : null;
  }

  async getMeetingSnapshots(meetingId: number, limit: number = 10): Promise<MeetingSnapshot[]> {
    const endpoint = `${API_CONFIG.ENDPOINTS.MEETING_SNAPSHOTS(meetingId.toString())}?limit=${limit}`;
    const response = await apiService.get(endpoint);
    if (!response.success) {
      return [];
    }

    const payload = response.data;
    if (!payload) return [];

    const snapshotsCandidates = [
      (payload as any).snapshots,
      (payload as any).data?.snapshots,
      (payload as any).data,
      payload,
    ];

    for (const candidate of snapshotsCandidates) {
      if (Array.isArray(candidate)) {
        return candidate as MeetingSnapshot[];
      }
    }

    return [];
  }

  // Check join status (GET)
  async checkJoinStatus(meetingId: number): Promise<{ success: boolean; canJoin?: boolean; isOwner?: boolean; isFull?: boolean; alreadyJoined?: boolean; currentParticipants?: number; maxParticipants?: number; isApproved?: boolean; error?: string } | null> {
    const response = await apiService.get(API_CONFIG.ENDPOINTS.MEETING_JOIN(meetingId.toString()));
    if (!response.success) return null;
    return {
      success: response.success,
      ...response.data,
      error: response.error
    };
  }

  // Join meeting
   async joinMeeting(meetingId: number): Promise<{ success: boolean; error?: string; participant?: any; message?: string; paymentPending?: boolean; alreadyJoined?: boolean }> {
    const response = await apiService.post(API_CONFIG.ENDPOINTS.MEETING_JOIN(meetingId.toString()));
    return {
      success: response.success,
      error: response.error,
      participant: response.data?.participant,
      message: response.data?.message || response.message,
      paymentPending: response.data?.paymentPending,
      alreadyJoined: response.data?.alreadyJoined
    };
  }

  // Leave meeting
  async leaveMeeting(meetingId: number): Promise<boolean> {
    const response = await apiService.post(API_CONFIG.ENDPOINTS.MEETING_LEAVE(meetingId.toString()));
    return response.success;
  }

  // Get meeting reviews
  async getMeetingReviews(meetingId: number, page: number = 1, limit: number = 10): Promise<ReviewsResponse | null> {
    const endpoint = `${API_CONFIG.ENDPOINTS.MEETING_REVIEWS(meetingId.toString())}?page=${page}&limit=${limit}`;
    const response = await apiService.get(endpoint);
    if (!response.success || !response.data) {
      return null;
    }
    
    // Handle nested response structure: API returns { success: true, data: { reviews, pagination, averageRating } }
    // apiService.get() wraps it as { success: true, data: { success: true, data: { reviews, ... } } }
    const apiResponse = response.data as any;
    
    // Check if it's the nested structure
    if (apiResponse && apiResponse.success && apiResponse.data) {
      return apiResponse.data as ReviewsResponse;
    }
    
    // Otherwise, assume response.data is already the ReviewsResponse structure
    return apiResponse as ReviewsResponse;
  }

  // Update meeting frequency
  async updateMeetingFrequency(meetingId: number, meetingFrequency: string, recurrenceEndOn?: string): Promise<boolean> {
    const endpoint = `/meetings/${meetingId}/frequency`;
    const response = await apiService.put(endpoint, { meetingFrequency, recurrenceEndOn });
    return response.success;
  }

  // Get meeting instances
  async getMeetingInstances(meetingId: number): Promise<any[] | null> {
    const endpoint = `/meetings/${meetingId}/instances`;
    const response = await apiService.get(endpoint);
    return response.success ? response.data.instances : null;
  }

  // Update meeting
  async updateMeeting(meetingId: number, data: {
    meetingName?: string;
    description?: string;
    roadNameAddress?: string;
    detailedAddress?: string;
    fee?: number;
    feeAmount?: number;
    feeOption?: string;
    status?: string;
    dateValue?: string;
    timeValue?: string;
    meetingFrequency?: string;
    [key: string]: any;
  }): Promise<{ success: boolean; error?: string }> {
    const response = await apiService.put(API_CONFIG.ENDPOINTS.MEETING_DETAIL(meetingId.toString()), data);
    return {
      success: response.success,
      error: response.error || (response as any).message
    };
  }

  // Delete meeting
  async deleteMeeting(meetingId: number): Promise<{ success: boolean; error?: string }> {
    const response = await apiService.delete(API_CONFIG.ENDPOINTS.MEETING_DETAIL(meetingId.toString()));
    return {
      success: response.success,
      error: response.error || (response as any).message
    };
  }

  // Like/unlike meeting
  async toggleLike(meetingId: number): Promise<{ liked: boolean; likeCount: number } | null> {
    const response = await apiService.post<{ liked: boolean; likeCount: number }>(
      API_CONFIG.ENDPOINTS.MEETING_LIKE(meetingId.toString())
    );
    return response.success ? response.data! : null;
  }

  // Get meeting like status
  async getLikeStatus(meetingId: number): Promise<{ likeCount: number; liked: boolean } | null> {
    const response = await apiService.get<{ likeCount: number; liked: boolean }>(
      API_CONFIG.ENDPOINTS.MEETING_LIKE(meetingId.toString())
    );
    return response.success ? response.data! : null;
  }

  // Clear meetings cache
  clearCache(): void {
    apiService.clearCache('meetings');
  }
}

export const meetingsApi = new MeetingsApiService();
