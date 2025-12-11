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
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const body = await request.json()
    const { title, content, image, scope, meetings, categories, status, userId } = body

    const updated = await (prisma as any).homePageSettings.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(image !== undefined ? { image } : {}),
        ...(scope !== undefined ? { scope } : {}),
        ...(meetings !== undefined ? { meetings: Array.isArray(meetings) ? meetings : [] } : {}),
        ...(categories !== undefined ? { categories: Array.isArray(categories) ? categories : [] } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(userId !== undefined ? { userId } : {}),
      }
    })

    return NextResponse.json({ success: true, data: updated }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update home page setting', details: error instanceof Error ? error.message : 'Unknown error' },
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
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    await prisma.homePageSettings.delete({ where: { id } })
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete home page setting', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


