import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const id = parseInt(resolvedParams.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
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

    // If the request is only updating status, allow it without other required fields
    const isStatusOnlyUpdate =
      status !== undefined &&
      type === undefined &&
      title === undefined &&
      description === undefined &&
      image === undefined &&
      deactivationDate === undefined &&
      publicScope === undefined &&
      meetings === undefined &&
      categories === undefined

    if (!isStatusOnlyUpdate) {
      // Validate required fields for full update
      if (!type || !title) {
        return NextResponse.json(
          { error: 'Type and title are required' },
          { status: 400 }
        )
      }
    }

    // Convert publicScope to scope format expected by database
    const scope = publicScope === 'categories' ? 'categories' : 'public'

    // Use category IDs directly (they're already sent as numbers)
    let categoryIds: number[] = []
    if (categories && categories.length > 0) {
      // Ensure categories are numbers
      categoryIds = categories.map((cat: any) => Number(cat)).filter((id: number) => !isNaN(id))
    }

    // Update the type setting
    // Build dynamic update payload
    const updateData: any = {}
    if (isStatusOnlyUpdate) {
      updateData.status = status
    } else {
      updateData.type = type === 'A' ? 'type_A' : 'type_B'
      updateData.title = title
      updateData.description = description || null
      updateData.image = image || null
      updateData.deactivationDate = deactivationDate ? new Date(deactivationDate) : null
      updateData.scope = scope
      updateData.meetings = meetings || []
      updateData.categories = categoryIds
      if (status) updateData.status = status
    }

    const typeSetting = await prisma.typeSettings.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ 
      success: true, 
      data: typeSetting 
    }, { status: 200 })

  } catch (error) {
    console.error('Error updating type setting:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return NextResponse.json(
      { 
        error: 'Failed to update type setting',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const id = parseInt(resolvedParams.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      )
    }

    // Attempt delete
    await prisma.typeSettings.delete({ where: { id } })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error deleting type setting:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete type setting',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

