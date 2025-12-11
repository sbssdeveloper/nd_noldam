// Shared type definitions for posts, comments, and related entities

export interface Post {
  id: number
  title: string
  content: string
  imageUrl: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
  userId: number
  user: {
    id: number
    nickname: string
    profileImage: string | null
    activeCommunityBadge?: {
      id: number
      name: string
      imageUrl: string
      condition_followers: number
    } | null
  }
  likes: Array<{
    id: number
    userId: number
    postId: number
    createdAt: string
    user: {
      id: number
      nickname: string
      profileImage: string | null
    }
  }>
  comments?: Comment[]
  tags?: Array<{
    id: number
    name: string
  }>
  isLiked?: boolean
  likeCount?: number
}

export interface Comment {
  id: number
  content: string
  level: number
  createdAt: string
  updatedAt: string
  userId: number
  postId: number
  parentCommentId: number | null
  user: {
    id: number
    nickname: string
    profileImage: string | null
    activeCommunityBadge?: {
      id: number
      name: string
      imageUrl: string
      condition_followers: number
    } | null
  }
  replies?: Comment[]
  likes?: Array<{ userId: number }>
  isLiked?: boolean
  likeCount?: number
}

// FeedItem is essentially the same as Post but with additional feed-specific properties
export interface FeedItem extends Post {
  // FeedItem inherits all Post properties
  // Additional feed-specific properties can be added here if needed
}
