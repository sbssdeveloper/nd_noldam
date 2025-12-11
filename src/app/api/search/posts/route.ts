import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { successResponse, errorResponse } from '@/utils/general'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const sort = searchParams.get('sort') || 'latest' // latest, popular, comments

    // If no query provided, return empty results
    if (!query || !query.trim()) {
      return NextResponse.json(
        successResponse({
          posts: [],
          total: 0
        }, 'Posts retrieved successfully'),
        { status: 200 }
      )
    }

    // Build where clause
    const now = new Date();
    const whereClause: any = {
      isPublic: true, // Only show public posts
      // Filter out restricted posts (only show if restrictionUntil is null or has passed)
      OR: [
        { restrictionUntil: null },
        { restrictionUntil: { lte: now } }
      ]
    }

    // Search filter
    if (query && query.trim()) {
      whereClause.AND = [
        {
          OR: [
            { content: { contains: query, mode: 'insensitive' } },
            { title: { contains: query, mode: 'insensitive' } }
          ]
        },
        {
          OR: [
            { restrictionUntil: null },
            { restrictionUntil: { lte: now } }
          ]
        }
      ]
      // Remove the top-level OR since we're using AND now
      delete whereClause.OR;
    }

    // Build orderBy clause
    let orderBy: any = { createdAt: 'desc' } // default: latest

    if (sort === 'popular') {
      // Sort by likes count after fetching
      orderBy = { createdAt: 'desc' }
    } else if (sort === 'comments') {
      // Sort by comments count after fetching
      orderBy = { createdAt: 'desc' }
    }

    // Fetch posts
    const posts = await prisma.post.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            profileImage: true,
            city: true,
            province: true,
            activeCommunityBadge: {
              select: {
                id: true,
                name: true,
                imageUrl: true
              }
            }
          }
        },
        likes: {
          select: {
            userId: true
          }
        },
        comments: {
          select: {
            id: true
          }
        },
        sections: {
          orderBy: {
            sectionNo: 'asc'
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      orderBy,
      take: 50 // Limit results
    })

    // Transform results
    let results = posts.map(post => {
      const likeCount = post._count.likes
      const commentCount = post._count.comments

      // Get content from sections or fallback to content field
      let displayContent = post.content || ''
      let displayTitle = post.title || ''
      let displayImage = post.imageUrl || null

      // First try to parse JSON content from the content field
      if (post.content) {
        try {
          const parsedContent = JSON.parse(post.content)
          if (Array.isArray(parsedContent)) {
            // Find title, text content, and image from the JSON array
            const titleItem = parsedContent.find((item: any) => item.type === 'text' && item.id?.includes('title'))
            const textItem = parsedContent.find((item: any) => item.type === 'text' && !item.id?.includes('title'))
            const imageItem = parsedContent.find((item: any) => item.type === 'image')

            if (titleItem) displayTitle = titleItem.content
            if (textItem) displayContent = textItem.content
            else displayContent = '' // No text content found, don't show JSON
            if (imageItem) displayImage = imageItem.url

          }
        } catch (e) {
          // If JSON parsing fails, use content as-is (but only if it looks like regular text)
          if (!post.content.startsWith('[') && !post.content.startsWith('{')) {
            displayContent = post.content
          } else {
            displayContent = '' // Don't show raw JSON
          }
        }
      }

      // If sections exist, use them as fallback
      if (post.sections && post.sections.length > 0) {
        const titleSection = post.sections.find(s => s.sectionType === 'title')
        const contentSection = post.sections.find(s => s.sectionType === 'content')
        const imageSection = post.sections.find(s => s.sectionType === 'image')

        if (titleSection && !displayTitle) displayTitle = titleSection.content
        if (contentSection && !displayContent) displayContent = contentSection.content
        if (imageSection && !displayImage) displayImage = imageSection.content
      }

      return {
        id: post.id,
        title: displayTitle,
        content: displayContent,
        imageUrl: displayImage,
        isPublic: post.isPublic,
        likeCount,
        commentCount,
        sections: post.sections,
        user: {
          id: post.user.id,
          nickname: post.user.nickname,
          profileImage: post.user.profileImage,
          city: post.user.city,
          province: post.user.province,
          activeCommunityBadge: post.user.activeCommunityBadge
        },
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      }
    })

    // Sort if requested
    if (sort === 'popular') {
      results = results.sort((a, b) => b.likeCount - a.likeCount)
    } else if (sort === 'comments') {
      results = results.sort((a, b) => b.commentCount - a.commentCount)
    }

    return NextResponse.json(
      successResponse({
        posts: results,
        total: results.length
      }, 'Posts retrieved successfully'),
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      errorResponse('Failed to search posts', 500),
      { status: 500 }
    )
  }
}

