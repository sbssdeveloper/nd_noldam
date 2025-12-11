import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'type_A' or 'type_B'

    const whereClause = type ? { type } : {}

    const typeSettings = await prisma.typeSettings.findMany({
      where: whereClause,
      orderBy: {
        createDate: 'desc'
      }
    })

    return NextResponse.json(typeSettings)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch type settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // First, test if we can read from the table
    try {
      const testQuery = await prisma.typeSettings.findMany({ take: 1 })
    } catch (dbError) {
      console.error('Database connection failed:', dbError)
      return NextResponse.json(
        { 
          error: 'Database connection failed',
          details: dbError instanceof Error ? dbError.message : 'Unknown database error'
        },
        { status: 500 }
      )
    }

    const body = await request.json()
    
    const {
      type,
      title,
      description,
      image,
      deactivationDate,
      publicScope,
      meetings,
      categories,
      status
    } = body

    // Validate required fields
    if (!type || !title) {
      return NextResponse.json(
        { error: 'Type and title are required' },
        { status: 400 }
      )
    }

    // Convert publicScope to scope format expected by database
    const scope = publicScope === 'categories' ? 'categories' : 'public'

    // Use category IDs directly (they're already sent as numbers)
    let categoryIds: number[] = []
    if (categories && categories.length > 0) {
      // Ensure categories are numbers
      categoryIds = categories.map((cat: any) => Number(cat)).filter((id: number) => !isNaN(id))
    }

    // Create the type setting
    const typeSetting = await (prisma as any).typeSettings.create({
      data: {
        type: type === 'A' ? 'type_A' : 'type_B',
        title,
        description: description || null,
        image: image || null,
        deactivationDate: deactivationDate ? new Date(deactivationDate) : null,
        scope,
        meetings: meetings || [],
        categories: categoryIds,
        status: status || 'active'
      }
    })

    return NextResponse.json({ 
      success: true, 
      data: typeSetting 
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating type setting:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return NextResponse.json(
      { 
        error: 'Failed to create type setting',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
