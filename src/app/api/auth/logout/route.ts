import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // With Redux authentication, logout is handled client-side
    // This endpoint just confirms the logout request
    return NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, reason: 'Logout failed' },
      { status: 500 }
    )
  }
}
