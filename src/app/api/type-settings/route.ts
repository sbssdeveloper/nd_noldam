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
