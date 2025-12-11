import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/utils/prisma'

interface OrderedContentItem {
  type?: string
  url?: string
  meeting?: { id?: number | string; meetingId?: number | string }
  meetingId?: number | string
}

const MAX_LIMIT = 50
const DEFAULT_LIMIT = 10

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const meetingId = parseInt(id, 10)

    if (Number.isNaN(meetingId) || meetingId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid meeting ID' },
        { status: 400 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const limitParam = searchParams.get('limit')
    let limit = DEFAULT_LIMIT

    if (limitParam) {
      const parsed = parseInt(limitParam, 10)
      if (!Number.isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, MAX_LIMIT)
      }
    }

    const debugMode = searchParams.get('debug') === '1'

    const snapshots: Array<{
      postId: number
      imageUrl: string
      likeCount: number
      commentCount: number
      createdAt: Date
      isLiked?: boolean
      author: {
        id: number | null
        nickname: string | null
        profileImage?: string | null
      } | null
    }> = []

    const origin = request.nextUrl?.origin

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null
    let currentUserId: number | null = null

    if (token) {
      try {
        const encoder = new TextEncoder()
        const jwtSecretKey = encoder.encode(
          process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments'
        )
        const { payload } = await jwtVerify(token, jwtSecretKey)
        const rawUserId = (payload as any).uid ?? (payload as any).userId ?? (payload as any).id
        if (rawUserId != null) {
          const parsed = typeof rawUserId === 'string' ? parseInt(rawUserId, 10) : Number(rawUserId)
          if (!Number.isNaN(parsed) && parsed > 0) {
            currentUserId = parsed
          }
        }
      } catch (error) {
        // Ignore token verification errors - treat as unauthenticated
        currentUserId = null
      }
    }

    const normalizeProfileImage = (src?: string | null) => {
      if (!src) return src ?? null
      if (src.startsWith('http://') || src.startsWith('https://')) return src
      if (!origin) return src
      return `${origin}${src.startsWith('/') ? src : `/${src}`}`
    }

    const debugEntries: any[] = []

    const batchSize = Math.max(limit * 5, 100)
    const maxIterations = 20
    let skip = 0
    let iteration = 0

    while (snapshots.length < limit && iteration < maxIterations) {
      const candidatePosts = await prisma.post.findMany({
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              profileImage: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: batchSize,
        skip
      })

      if (candidatePosts.length === 0) {
        break
      }

      skip += candidatePosts.length
      iteration += 1

      for (const post of candidatePosts) {
        if (snapshots.length >= limit) break

        let orderedContent: OrderedContentItem[] = []
        if (post.content) {
          try {
            const parsed = JSON.parse(post.content)
            if (Array.isArray(parsed)) {
              orderedContent = parsed as OrderedContentItem[]
            }
          } catch (error) {
            // Ignore JSON parse errors for malformed content
          }
        }

        if (!Array.isArray(orderedContent) || orderedContent.length === 0) {
          if (debugMode) {
            debugEntries.push({
              postId: post.id,
              reason: 'no_ordered_content',
              rawContent: post.content
            })
          }
          continue
        }

        const hasMeetingTag = orderedContent.some((item) => {
          if (!item || item.type !== 'meeting') return false
          const itemMeetingId = item.meeting?.id ?? item.meeting?.meetingId ?? item.meetingId
          if (itemMeetingId == null) return false
          const numericMeetingId = typeof itemMeetingId === 'string' ? parseInt(itemMeetingId, 10) : Number(itemMeetingId)
          return !Number.isNaN(numericMeetingId) && numericMeetingId === meetingId
        })

        if (!hasMeetingTag) {
          if (debugMode) {
            debugEntries.push({
              postId: post.id,
              reason: 'meeting_not_found',
              orderedContent
            })
          }
          continue
        }

        const imageItems = orderedContent.filter((item) => item?.type === 'image' && item?.url)
        const imageUrls = imageItems.map((item) => item?.url).filter((url): url is string => Boolean(url))

        const canonicalImageUrls = imageUrls.length > 0 ? imageUrls : (post.imageUrl ? [post.imageUrl] : [])

        for (const imageUrl of canonicalImageUrls) {
          if (!imageUrl) continue
          snapshots.push({
            postId: post.id,
            imageUrl,
            likeCount: post._count?.likes ?? 0,
            commentCount: post._count?.comments ?? 0,
            createdAt: post.createdAt,
            author: post.user
              ? {
                  id: post.user.id,
                  nickname: post.user.nickname,
                  profileImage: normalizeProfileImage(post.user.profileImage)
                }
              : null
          })

          if (snapshots.length >= limit) break
        }

        if (debugMode) {
          debugEntries.push({
            postId: post.id,
            imagesFound: canonicalImageUrls,
            orderedContent
          })
        }
      }
    }

    if (currentUserId && snapshots.length > 0) {
      const uniquePostIds = Array.from(new Set(snapshots.map((snapshot) => snapshot.postId)))
      if (uniquePostIds.length > 0) {
        const likedPosts = await prisma.postLikes.findMany({
          where: {
            userId: currentUserId,
            postId: {
              in: uniquePostIds
            }
          },
          select: {
            postId: true
          }
        })
        const likedSet = new Set(likedPosts.map((like) => like.postId))
        snapshots.forEach((snapshot) => {
          snapshot.isLiked = likedSet.has(snapshot.postId)
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        snapshots,
        ...(debugMode ? { debug: debugEntries } : {})
      }
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to load meeting snapshots' },
      { status: 500 }
    )
  }
}
