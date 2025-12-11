import { NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'

export async function GET() {
  try {
    const activities = await prisma.activity.findMany({
      orderBy: { id: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: activities
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '활동 목록을 가져오는데 실패했습니다' },
      { status: 500 }
    )
  }
}
