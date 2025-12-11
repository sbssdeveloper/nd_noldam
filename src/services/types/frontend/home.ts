// Frontend Home Page Types

import type { MeetingData } from './meetings'

export interface SliderData {
  id: number
  image: string
  title: string
  subtitle: string
  redirectUrl?: string
  target?: string
  scope?: string
  categories?: (number | string)[]
  meetings?: number[] // Meeting IDs array for navigation
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
}

// MeetingData interface moved to meetings.ts to avoid duplication

export interface TypeBData {
  id: string | number
  image: string
  title: string
  description?: string
  meetings: MeetingData[]
}

// Type A data now has the same structure as Type B
export type TypeAData = TypeBData
