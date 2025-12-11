import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'

    const whereClause: any = status === 'all' ? {} : { status }

    const homePageSettings = await (prisma as any).homePageSettings.findMany({
      where: whereClause,
      orderBy: { createDate: 'desc' }
    })

    // Transform data
    const transformedData = homePageSettings.map((setting: any) => ({
      id: setting.id,
      image: setting.image,
      title: setting.title,
      subtitle: setting.content,
      scope: (setting as any).scope,
      meetings: (setting as any).meetings || [],
      categories: (setting as any).categories || [],
      status: setting.status,
      userId: setting.userId || null
    }))

    return NextResponse.json(transformedData)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch home page settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, image, scope, meetings, categories, status, userId } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const created = await (prisma as any).homePageSettings.create({
      data: {
        title,
        content,
        image: image || null,
        scope: scope || 'public',
        meetings: Array.isArray(meetings) ? meetings : [],
        categories: Array.isArray(categories) ? categories : [],
        status: status || 'active',
        userId: userId || null
      }
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create home page setting', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
