// Frontend Post Types

export interface Comment {
  id: number
  content: string
  author: {
    id: number
    name: string
    profileImage?: string
    level: number
  }
  createdAt: string
  updatedAt: string
  likesCount: number
  isLiked: boolean
  replies?: Comment[]
}

export interface Post {
  id: number
  title: string
  content: string
  author: {
    id: number
    name: string
    profileImage?: string
    level: number
    city?: string
    province?: string
  }
  createdAt: string
  updatedAt: string
  likesCount: number
  isLiked: boolean
  commentsCount: number
  tags: string[]
  images?: string[]
  isBookmarked: boolean
}

export interface PostDetail extends Post {
  comments: Comment[]
  relatedPosts: Post[]
}

export interface PostFormData {
  title: string
  content: string
  tags: string[]
  images: string[]
}

export interface CommentFormData {
  content: string
  parentId?: number
}

// Post variant types
export type PostVariant = 'normal' | 'locked'

// Post filter types
export interface PostFilters {
  category?: string
  tags?: string[]
  author?: number
  dateRange?: {
    start: string
    end: string
  }
}
