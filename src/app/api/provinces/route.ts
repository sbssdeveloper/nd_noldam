import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { successResponse, errorResponse } from '@/utils/general'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const countryId = searchParams.get('countryId')

    let whereClause: any = {}

    if (countryId) {
      whereClause.countryId = parseInt(countryId)
    }

    const provinces = await prisma.province.findMany({
      where: whereClause,
      orderBy: {
        province: 'asc'
      }
    })

    // If we need country data, fetch it separately
    let countriesData: any = {}
    if (provinces.length > 0) {
      const countryIds = [...new Set(provinces.map(p => p.countryId))]
      const countries = await prisma.country.findMany({
        where: {
          id: { in: countryIds }
        }
      })
      countriesData = countries.reduce((acc, country) => {
        acc[country.id] = {
          id: country.id,
          name: country.country
        }
        return acc
      }, {} as Record<number, any>)
    }

    return NextResponse.json(
      successResponse({
        provinces: provinces.map(province => ({
          id: province.id,
          name: province.province,
          countryId: province.countryId,
          country: countriesData[province.countryId] || null
        }))
      }, 'Provinces retrieved successfully'),
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(errorResponse('Internal server error', 500), { status: 500 })
  }
}
