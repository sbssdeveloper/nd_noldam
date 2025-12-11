export interface FollowingActivity {
    id: number
    meetingId: number
    meetingName: string
    meetingBackground: string | null
    meetingTime: string
    duration: number
    categories: string[]
    activities: string[]
    participantCount: number
    maxParticipants: number
    activityType: 'participated' | 'created'
    participant: {
      id: number
      nickname: string | null
      profileImage: string | null
      activeCommunityBadge: any
    } | null
    host: {
      id: number
      nickname: string | null
      profileImage: string | null
      city: string | null
      province: string | null
      activeCommunityBadge: any
    }
    activityDate: string
  }
  
  