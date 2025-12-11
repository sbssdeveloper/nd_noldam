import { NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: categories
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '카테고리 목록을 가져오는데 실패했습니다' },
      { status: 500 }
    )
  }
}
