// Frontend Meeting Types

// Meeting Display (for home page, lists)
export interface MeetingData {
  id: number
  image: string
  title: string
  category: string
  location: string
  members: number
  date: string
  description?: string
  meetingAddress?: string
  fee?: number
  amenities?: string[]
  user: {
    id?: number | null
    name: string
    level: number
    profileImage?: string
    city?: string
    province?: string
    activeCommunityBadge?: {
      id?: number
      name?: string
      imageUrl?: string
    } | null
  }
  memberType: string
  likesCount?: number
  isLiked?: boolean
}

// Meeting Detail (for detail page, from API)
export interface MeetingDetail {
  id: number
  meetingName: string
  description: string | null
  meetingBackground: string | null
  meetingTime: string
  duration: number
  roadNameAddress: string
  detailedAddress: string
  minNum: number
  maxNum: number
  fee: number
  hasFee: boolean
  activities: string[]
  categories: string[]
  categoryNames: string[]  // Resolved category names from API
  activityNames: string[]  // Resolved activity names from API
  meetingFrequency: string
  recurrenceEndOn: string | null
  user: {
    id: number
    nickname: string | null
    profileImage: string | null
    city: string | null
    province: string | null
    activeCommunityBadge: {
      id: number
      name: string
      imageUrl: string
    } | null
  }
  participants: {
    id: number
    userId: number
    joinedOn: string
    paymentStatus: string
    user: {
      id: number
      nickname: string | null
      profileImage: string | null
      activeCommunityBadge: {
        id: number
        name: string
        imageUrl: string
      } | null
    }
  }[]
}

