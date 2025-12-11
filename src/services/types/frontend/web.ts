// Frontend Web Component Types

// Comment Threading Types
export interface ThreadedReplies {
  [commentId: number]: string
}

// UI Animation Types
export interface UnderlineState {
  left: number
  width: number
}

// Form Input Types
export interface FormInput {
  value: string
  error?: string
}

// Search Types - Use search.ts for detailed search filters
// This is kept for backward compatibility but deprecated
export interface SearchFilters {
  category?: string
  round?: 'all' | 'this_week' | 'this_month'
  sort?: 'latest' | 'popular' | 'comments' | 'distance'
  location?: string
  dateRange?: {
    start: string
    end: string
  }
  priceRange?: {
    min: number
    max: number
  }
}

// Feed Types
export interface FeedItem {
  id: string
  title: string
  content: string
  author: {
    id: string
    name: string
    avatar?: string
  }
  createdAt: string
  likes: number
  comments: number
  shares: number
}

// Settings Types
export interface UserSettings {
  profile: {
    name: string
    email: string
    avatar?: string
  }
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends'
    showEmail: boolean
    showPhone: boolean
  }
}

// Notification Types
export interface NotificationItem {
  id: string
  type: 'like' | 'comment' | 'follow' | 'meeting' | 'system'
  title: string
  message: string
  read: boolean
  createdAt: string
  actionUrl?: string
}

// Badge Types
export interface BadgeConfig {
  id: string
  name: string
  description: string
  icon: string
  color: string
  condition: {
    type: 'followers' | 'posts' | 'meetings' | 'likes'
    value: number
  }
}

// Common UI Types
export interface ButtonVariant {
  variant: 'contained' | 'outlined' | 'text'
  color: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'
  size: 'small' | 'medium' | 'large'
}

export interface ModalState {
  open: boolean
  title?: string
  content?: string
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: ButtonVariant
  }>
}
