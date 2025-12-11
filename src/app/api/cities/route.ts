import { NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'

export async function GET() {
  try {
    // Get all provinces
    const provinces = await prisma.province.findMany({
      orderBy: { name: 'asc' }
    })

    // Get all cities
    const cities = await prisma.city.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: { provinces, cities }
    })

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      reason: 'Failed to fetch data' 
    }, { status: 500 })
  }
}
