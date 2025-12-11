import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { successResponse, errorResponse } from '@/utils/general'

export async function GET(request: NextRequest) {
  try {
    const countries = await prisma.country.findMany({
      orderBy: {
        country: 'asc'
      }
    })

    // Get all provinces for all countries
    const provinces = await prisma.province.findMany({
      orderBy: {
        province: 'asc'
      }
    })

    // Group provinces by countryId
    const provincesByCountry = provinces.reduce((acc, province) => {
      if (!acc[province.countryId]) {
        acc[province.countryId] = []
      }
      acc[province.countryId].push({
        id: province.id,
        name: province.province,
        countryId: province.countryId
      })
      return acc
    }, {} as Record<number, any[]>)

    return NextResponse.json(
      successResponse({
        countries: countries.map(country => ({
          id: country.id,
          name: country.country,
          provinces: provincesByCountry[country.id] || []
        }))
      }, 'Countries retrieved successfully'),
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(errorResponse('Internal server error', 500), { status: 500 })
  }
}
