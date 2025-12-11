export interface TrendingPost {
    id: number
    title: string | null
    content: string | null
    imageUrl: string | null
    createdAt: string
    likesCount: number
    commentsCount: number
    trendingScore: number
    user: any
  }
  
  