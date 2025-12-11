import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { isAdminTokenValid } from '@/apiConfigs/admin'

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const adminToken = request.cookies.get('admin_auth_token')?.value
    if (!adminToken || !isAdminTokenValid(adminToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get('search') || ''
    const statusFilter = searchParams.get('status') || ''
    const gradeFilter = searchParams.get('grade') || ''

    // Build where clause
    const whereClause: any = {
      meetings: {
        some: {}
      }
    }

    // Add search filter
    if (searchTerm) {
      whereClause.OR = [
        { nickname: { contains: searchTerm, mode: 'insensitive' } },
        { phoneNumber: { contains: searchTerm, mode: 'insensitive' } },
        { profile: { email: { contains: searchTerm, mode: 'insensitive' } } }
      ]
    }

    // Get all users who have created meetings (hosts)
    const hosts = await prisma.user.findMany({
      where: whereClause,
      include: {
        profile: {
          select: {
            email: true,
            fullName: true
          }
        },
        meetings: {
          select: {
            id: true,
            status: true,
            meetingTime: true,
            fee: true,
            maxNum: true
          }
        },
        participants: {
          select: {
            meetingId: true
          }
        },
        reviews: {
          select: {
            rating: true
          }
        },
        communityRating: {
          select: {
            level: true,
            meetingsCount: true
          }
        }
      }
    })

    // Transform data to match the expected format
    const transformedHosts = hosts.map(host => {
      const meetings = host.meetings || []
      const approvedMeetings = meetings.filter(m => m.status === 'approved')
      const pendingMeetings = meetings.filter(m => m.status === 'pending')
      const totalRevenue = approvedMeetings.reduce((sum, m) => {
        const participants = host.participants.filter(p => p.meetingId === m.id).length
        return sum + Number(m.fee) * participants
      }, 0)

      const totalParticipants = host.participants.length
      const ratings = host.reviews || []
      const avgRating = ratings.length > 0
        ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
        : '0.0'

      // Map community rating level to Korean grade
      const gradeMap: { [key: string]: string } = {
        '씨앗': '씨앗',
        '모꼬지': '모꼬지',
        '이음이': '이음이',
        '담장이': '담장이'
      }
      const grade = host.communityRating?.level ? gradeMap[host.communityRating.level] || '씨앗' : '씨앗'

      // Determine status based on meetings
      let status: '활성' | '승인 대기' | '검토중' | '정지' = '활성'
      if (host.status === 'blacklisted') {
        status = '정지'
      } else if (pendingMeetings.length > 0) {
        status = '승인 대기'
      } else if (approvedMeetings.length === 0 && meetings.length > 0) {
        status = '검토중'
      }

      // Format dates
      const joinedAt = host.createdAt ? new Date(host.createdAt).toISOString().split('T')[0] : ''
      const lastActivity = host.lastLogin
        ? new Date(host.lastLogin).toLocaleString('ko-KR', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        : '—'

      return {
        id: host.id,
        name: host.nickname || 'Unknown',
        phone: host.phoneNumber || '',
        email: host.profile?.email || '',
        category: host.categories && host.categories.length > 0 ? String(host.categories[0]) : '',
        joinedAt,
        lastActivity,
        status,
        grade,
        meetingsCount: `${meetings.length}개 모임`,
        revenue: `₩${totalRevenue.toLocaleString()}`,
        rating: avgRating,
        ratingCount: `${ratings.length}개`,
        manager: '—', // Placeholder
        lastIp: '—', // Placeholder
        lastLogin: host.lastLogin ? '—' : '—',
        bankName: '—', // Placeholder
        accountNumber: '—', // Placeholder
        accountHolder: '—', // Placeholder
        totalRevenue: `₩${totalRevenue.toLocaleString()}`,
        totalParticipants: String(totalParticipants)
      }
    })

    // Apply filters
    let filtered = transformedHosts
    if (statusFilter && statusFilter !== '모든 상태') {
      filtered = filtered.filter(h => h.status === statusFilter)
    }
    if (gradeFilter && gradeFilter !== '모든 등급') {
      filtered = filtered.filter(h => h.grade === gradeFilter)
    }

    return NextResponse.json(filtered, {
      headers: {
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error('Error fetching hosts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hosts' },
      { status: 500 }
    )
  }
}

