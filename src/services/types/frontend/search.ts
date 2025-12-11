// Search Types

export interface SearchMeetingResult {
  id: number
  meetingName: string
  meetingBackground: string | null
  categories: string[]
  activities: string[]
  location: string
  roadNameAddress: string
  detailedAddress: string
  meetingTime: Date
  description: string | null
  minNum: number
  maxNum: number
  fee: number
  hasFee: boolean
  participantCount: number
  likeCount: number
  popularityScore: number
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
  createdAt: Date
}

export interface SearchPostResult {
  id: number
  title: string | null
  content: string | null
  imageUrl: string | null
  isPublic: boolean
  likeCount: number
  commentCount: number
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
  createdAt: Date
  updatedAt: Date
}

export interface SearchUserResult {
  id: number
  nickname: string | null
  statusMessage: string | null
  profileImage: string | null
  city: string | null
  province: string | null
  description: string
  activeCommunityBadge: {
    id: number
    name: string
    imageUrl: string
    description: string
  } | null
  stats: {
    followersCount: number
    followingCount: number
    postsCount: number
    meetingsCount: number
  }
  createdAt: Date
}

export interface SearchFilters {
  category?: string
  round?: 'all' | 'this_week' | 'this_month'
  sort?: 'latest' | 'popular' | 'comments' | 'distance'
}

export interface SearchState {
  query: string
  activeTab: 0 | 1 | 2 // 0: meetings, 1: posts, 2: users
  filters: SearchFilters
  meetingResults: SearchMeetingResult[]
  postResults: SearchPostResult[]
  userResults: SearchUserResult[]
  genres: Genre[]
  genresLoading: boolean
  genresError: string | null
  loading: {
    meetings: boolean
    posts: boolean
    users: boolean
  }
  error: {
    meetings: string | null
    posts: string | null
    users: string | null
  }
}

export interface Category {
  id: number
  name: string
  description: string | null
  image: string | null
}

export interface Genre {
  id: number
  name: string
  description: string | null
  image: string | null
  meetings: number[]
}

