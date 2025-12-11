import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const genres = await prisma.genre.findMany({
      orderBy: {
        id: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: genres
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch genres'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, image, meetings } = body

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: 'Name is required'
        },
        { status: 400 }
      )
    }

    const genre = await prisma.genre.create({
      data: {
        name,
        description,
        image,
        meetings: meetings || []
      }
    })

    return NextResponse.json({
      success: true,
      data: genre
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create genre'
      },
      { status: 500 }
    )
  }
}
