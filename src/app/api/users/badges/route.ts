import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { BadgeService } from '@/app/web/config/BadgeService';
import { prisma } from '@/utils/prisma';

function errorResponse(message: string, statusCode: number) {
  return {
    success: false,
    reason: message,
    statusCode
  };
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        errorResponse('No token provided', 401),
        { status: 401 }
      );
    }

    const encoder = new TextEncoder();
    const jwtSecretKey = encoder.encode(process.env.JWT_SECRET || 'development-jwt-secret-key-consistent-across-environments');
    const { payload } = await jwtVerify(token, jwtSecretKey);
    const userId = parseInt(payload.uid as string || payload.userId as string);

    if (!userId) {
      return NextResponse.json(
        errorResponse('Invalid token payload', 401),
        { status: 401 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nickname: true }
    });

    if (!user) {
      return NextResponse.json(
        errorResponse('User not found', 404),
        { status: 404 }
      );
    }

    // Check and award new badges
    await BadgeService.checkAndAwardBadges(userId, 'api_call');

    // Get user's badge data
    const badgeData = await BadgeService.getUserBadgeData(userId);

    if (!badgeData) {
      return NextResponse.json(
        errorResponse('Failed to fetch badge data', 500),
        { status: 500 }
      );
    }

    // Return the professional badge data directly
    const responseData = badgeData;

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    if (error instanceof Error) {
    } else {
    }
    return NextResponse.json(
      errorResponse('Internal server error', 500),
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
