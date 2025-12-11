import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { successResponse, errorResponse } from '@/utils/general'

export async function GET(request: NextRequest) {
  try {
    // Fetch countries and provinces in parallel
    const [countries, provinces] = await Promise.all([
      prisma.country.findMany({
        orderBy: { country: 'asc' }
      }),
      prisma.province.findMany({
        orderBy: { province: 'asc' }
      })
    ])

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

    // Format countries with their provinces
    const countriesWithProvinces = countries.map(country => ({
      id: country.id,
      name: country.country,
      provinces: provincesByCountry[country.id] || []
    }))

    return NextResponse.json(
      successResponse({
        countries: countriesWithProvinces,
        provinces: provinces.map(province => ({
          id: province.id,
          name: province.province,
          countryId: province.countryId
        }))
      }, 'Location data retrieved successfully'),
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(errorResponse('Internal server error', 500), { status: 500 })
  }
}
