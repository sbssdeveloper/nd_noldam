import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/utils/prisma'
import { verifyToken } from '@/utils/auth'

export async function POST(request: NextRequest) {
  try {
    const payload = await verifyToken(request)
    if (!payload || (!payload.uid && !payload.userId)) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다' }, { status: 401 })
    }

    const userId = parseInt((payload.uid || payload.userId) as string)
    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ success: false, error: '유효하지 않은 사용자입니다' }, { status: 401 })
    }

    const body = await request.json()
    const { fullName, phoneNumber, dob, nationality, gender, agreePersonal, agreeThirdParty } = body || {}


    // Validate required fields
    if (!fullName) {
      return NextResponse.json({ success: false, error: '이름을 입력해주세요' }, { status: 201 })
    }
    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: '전화번호를 입력해주세요' }, { status: 201 })
    }
    if (!dob) {
      return NextResponse.json({ success: false, error: '생년월일을 선택해주세요' }, { status: 201 })
    }
    if (!agreePersonal) {
      return NextResponse.json({ success: false, error: '개인정보 처리에 대한 동의가 필요합니다' }, { status: 201 })
    }
    if (!agreeThirdParty) {
      return NextResponse.json({ success: false, error: '제3자 이용 약관에 대한 동의가 필요합니다' }, { status: 201 })
    }
    const dobDate = new Date(dob)
    if (Number.isNaN(dobDate.getTime())) {
      return NextResponse.json({ success: false, error: '올바른 생년월일을 입력해주세요' }, { status: 201 })
    }

    const computeAge = (d: Date) => {
      const now = new Date()
      let age = now.getFullYear() - d.getFullYear()
      const m = now.getMonth() - d.getMonth()
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
      return age
    }
    const age = computeAge(dobDate)
    if (age < 18) {
      return NextResponse.json({ success: false, error: '만 18세 이상만 이용 가능합니다' }, { status: 201 })
    }

    // Update user's phone number and nickname if provided
    try {
      // First check what needs to be updated
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { phoneNumber: true, nickname: true }
      })
      
      const updateData: any = {}
      
      if (currentUser?.phoneNumber !== phoneNumber) {
        updateData.phoneNumber = phoneNumber
      }
      
      if (currentUser?.nickname !== fullName) {
        updateData.nickname = fullName
      }
      
      if (Object.keys(updateData).length > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: updateData
        })
      } else {
      }
    } catch (error) {
      // Continue with profile update even if user update fails
    }

    // Update/create profile with all fields
    const updated = await prisma.profile.upsert({
      where: { userId },
      update: {
        fullName,
        dob: dobDate,
        nationality: nationality ?? undefined,
        gender: gender ?? undefined,
        ageVerified: true,
        agreePersonal: !!agreePersonal,
        agreeThirdParty: !!agreeThirdParty,
        verifiedAt: new Date()
      },
      create: {
        userId,
        fullName,
        dob: dobDate,
        nationality: nationality ?? null,
        gender: gender ?? null,
        terms: false,
        ageVerified: true,
        agreePersonal: !!agreePersonal,
        agreeThirdParty: !!agreeThirdParty,
        verifiedAt: new Date(),
        publicVisibility: true,
        feedPrivacy: true,
        meetingsPrivacy: true,
        badgesPrivacy: true
      }
    })

    return NextResponse.json({ success: true, data: { ageVerified: updated.ageVerified, verifiedAt: updated.verifiedAt } }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ success: false, error: '연령 확인에 실패했습니다' }, { status: 500 })
  }
}


