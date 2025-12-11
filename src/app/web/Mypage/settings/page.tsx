'use client'

import React from 'react'
import { Box, Typography, IconButton, Divider, TextField, Button } from '@mui/material'
import { useRouter, useSearchParams } from 'next/navigation'
import type { UserSettings, ButtonVariant, ModalState } from '@/services/types/frontend'
import { useMyPageActions } from '@/hooks/useMyPageActions'
import { useAppSelector } from '@/store/hooks'
type RawLicenseInfo = {
  licenses?: string
  repository?: string
  url?: string
  publisher?: string
  email?: string
}

type OpenSourceLicenseEntry = {
  packageName: string
  version: string
  licenses: string
  repository: string | null
  publisher: string | null
  email: string | null
}

const SettingsPage = () => {
  const router = useRouter()
  const { profileData, clearData, loadAllDataStable } = useMyPageActions()
  const { isAuthenticated, user } = useAppSelector((state) => (state as any).authReducer || {})
  const [isUserDetailsOpen, setIsUserDetailsOpen] = React.useState(false)
  const [isUnsubscribeOpen, setIsUnsubscribeOpen] = React.useState(false)
  const [isLegalOpen, setIsLegalOpen] = React.useState(false)
  const [isOpenSourceOpen, setIsOpenSourceOpen] = React.useState(false)
  const rightInputSx = { minWidth: 160, '& .MuiInputBase-input': { textAlign: 'right', color: '#9ca3af', fontSize: '0.875rem', padding: 0 } }

  const [openSourceLicenses, setOpenSourceLicenses] = React.useState<OpenSourceLicenseEntry[]>([])
  const [licenseError, setLicenseError] = React.useState<string | null>(null)
  const licenseFetchAttemptedRef = React.useRef(false)
  const currentUserIdRef = React.useRef<number | null>(null)
  const profileLoadedRef = React.useRef<boolean>(false)

  const authUserId = React.useMemo(() => {
    if (user) {
      let userId = user.id || user.userId || user.uid || user.userUuid
      if (userId != null) {
        const parsedUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId
        return parsedUserId
      }
    }
    return null
  }, [user])

  React.useEffect(() => {
    try { window.dispatchEvent(new CustomEvent('footer-visibility', { detail: { hidden: true } })) } catch { }
    return () => { try { window.dispatchEvent(new CustomEvent('footer-visibility', { detail: { hidden: false } })) } catch { } }
  }, [])

  React.useEffect(() => {
    if (!isOpenSourceOpen) return
    if (licenseFetchAttemptedRef.current) return

    licenseFetchAttemptedRef.current = true
    fetch('/open-source-licenses.json')
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<Record<string, RawLicenseInfo>>
      })
      .then((data) => {
        const processed = Object.entries(data).map(([pkgWithVersion, info]) => {
          const lastAtIndex = pkgWithVersion.lastIndexOf('@')
          return {
            packageName: lastAtIndex > 0 ? pkgWithVersion.slice(0, lastAtIndex) : pkgWithVersion,
            version: lastAtIndex > 0 ? pkgWithVersion.slice(lastAtIndex + 1) : 'N/A',
            licenses: info.licenses ?? 'Unknown',
            repository: info.repository ?? info.url ?? null,
            publisher: info.publisher ?? null,
            email: info.email ?? null,
          } satisfies OpenSourceLicenseEntry
        }).sort((a, b) => a.packageName.localeCompare(b.packageName))

        setOpenSourceLicenses(processed)
      })
      .catch(() => {
        setLicenseError('오픈소스 라이선스 정보를 불러오지 못했습니다.')
      })
  }, [isOpenSourceOpen])

  const searchParams = useSearchParams()

  React.useEffect(() => {
    const uid = searchParams?.get('userId')
    const targetUserId = uid ? parseInt(uid, 10) : authUserId

    // Only proceed if we have a valid target user ID
    if (!targetUserId || targetUserId <= 0) {
      return
    }

    // Check if we need to load data
    const isDifferentUser = currentUserIdRef.current !== targetUserId
    const cachedProfileUserId = (profileData as any)?.data?.user?.id
    const hasWrongCachedData = cachedProfileUserId && parseInt(cachedProfileUserId) !== targetUserId

    if (isDifferentUser || hasWrongCachedData || !profileLoadedRef.current) {
      // Clear data if switching users
      if (isDifferentUser || hasWrongCachedData) {
        clearData()
        profileLoadedRef.current = false // Reset loaded flag when switching users
      }

      currentUserIdRef.current = targetUserId
      profileLoadedRef.current = true

      // Load all data for the target user
      loadAllDataStable(targetUserId)
    }
  }, [searchParams, authUserId, loadAllDataStable, clearData, profileData, isAuthenticated, user])

  // Check for showDetails parameter to automatically open user details view after editing
  React.useEffect(() => {
    const showDetails = searchParams?.get('showDetails')
    if (showDetails === 'true') {
      setIsUserDetailsOpen(true)
      // Reload profile data to ensure we have the latest information
      const uid = searchParams?.get('userId')
      const targetUserId = uid ? parseInt(uid, 10) : authUserId
      if (targetUserId && targetUserId > 0) {
        loadAllDataStable(targetUserId)
      }
      // Remove the query parameter from URL without reloading
      const url = new URL(window.location.href)
      url.searchParams.delete('showDetails')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }, [searchParams, authUserId, loadAllDataStable])

  return (
    <Box className='min-h-screen bg-[#F4F5F7]'>
      {/* Header */}
      <Box className='sticky top-0 z-10 bg-[#F4F5F7]'>
        <Box className='flex items-center px-3 py-3'>
          <IconButton onClick={() => { if (isUnsubscribeOpen) setIsUnsubscribeOpen(false); else if (isOpenSourceOpen) setIsOpenSourceOpen(false); else if (isLegalOpen) setIsLegalOpen(false); else if (isUserDetailsOpen) setIsUserDetailsOpen(false); else router.back() }} className='p-0'>
            <i className='ri-arrow-left-s-line' style={{ fontSize: '26px' }} />
          </IconButton>
          {/* <Typography variant='subtitle1' className='ml-1 font-semibold text-black'>설정</Typography> */}
        </Box>
      </Box>


      {/* Content area: list or user details */}
      {isOpenSourceOpen ? (
        <>
          <Box className='px-3 pt-3'>
            <Box className='bg-white rounded-xl p-4 flex flex-col items-center mb-3'>
              <Box className='w-12 h-12 rounded-lg bg-gray-400 flex items-center justify-center'>
                <i className='ri-open-source-fill text-white text-2xl' />
              </Box>
              <Typography variant='body1' className='mt-2 font-semibold text-black'>오픈소스 라이선스</Typography>
            </Box>
            <Box className='bg-white rounded-xl overflow-hidden'>
              <Box className='px-4 py-3 border-b border-gray-100'>
                <Typography variant='body2' className='text-gray-600'>theNoldam 서비스에서 사용 중인 외부 패키지의 라이선스 목록입니다. 각 항목은 제공된 라이선스 조건을 따르며, 필요 시 레포지터리에서 상세 내용을 확인할 수 있습니다.</Typography>
              </Box>

              <Box className='max-h-[65vh] overflow-y-auto'>
                {licenseError ? (
                  <Box className='px-4 py-6 text-center text-red-500 text-sm'>
                    {licenseError}
                  </Box>
                ) : openSourceLicenses.length === 0 ? (
                  <Box className='px-4 py-6 text-center text-gray-500 text-sm'>
                    표시할 라이선스 정보가 없습니다.
                  </Box>
                ) : (
                  openSourceLicenses.map((entry, index) => (
                    <React.Fragment key={`${entry.packageName}@${entry.version}`}>
                      <Box className='px-4 py-3'>
                        <Typography variant='body1' className='text-black font-semibold'>{entry.packageName}</Typography>
                        <Typography variant='caption' className='text-gray-500 mt-1 block'>버전 {entry.version} · 라이선스 {entry.licenses}</Typography>
                        {entry.publisher && (
                          <Typography variant='caption' className='text-gray-500 mt-1 block'>배포자: {entry.publisher}{entry.email ? ` · ${entry.email}` : ''}</Typography>
                        )}
                        <Box className='flex flex-wrap gap-2 mt-2'>
                          {entry.repository && (
                            <Button size='small' variant='outlined' onClick={() => window.open(entry.repository ?? '#', '_blank', 'noopener,noreferrer')}>
                              레포지터리 이동
                            </Button>
                          )}
                        </Box>
                      </Box>
                      {index < openSourceLicenses.length - 1 && <Divider className='mx-4' />}
                    </React.Fragment>
                  ))
                )}
              </Box>
            </Box>
          </Box>
        </>
      ) : isLegalOpen ? (
        // Legal information view
        <>
          <Box className='px-3 pt-3'>
            <Box className='bg-white rounded-xl p-4 flex flex-col items-center mb-3'>
              <Box className='w-12 h-12 rounded-lg bg-gray-400 flex items-center justify-center'>
                <i className='ri-contract-fill text-white text-2xl' />
              </Box>
              <Typography variant='body1' className='mt-2 font-semibold text-black'>법적 정보</Typography>
            </Box>

            {/* Legal items */}
            <Box className='bg-white rounded-xl overflow-hidden'>
              <Box className='flex items-center justify-between px-3 py-3'>
                <Typography variant='body2' className='text-gray-800'>개인정보 처리방침</Typography>
                <i className='ri-arrow-right-s-line text-gray-400' />
              </Box>
              <Divider className='mx-3' />
              <Box className='flex items-center justify-between px-3 py-3'>
                <Typography variant='body2' className='text-gray-800'>theNoldam 이용약관</Typography>
                <i className='ri-arrow-right-s-line text-gray-400' />
              </Box>
              <Divider className='mx-3' />
              <Box className='flex items-center justify-between px-3 py-3'>
                <Typography variant='body2' className='text-gray-800'>이용자 규정</Typography>
                <i className='ri-arrow-right-s-line text-gray-400' onClick={() => window.open('https://support.thenoldam.com/298a4390-4c50-8044-aff4-e54bae452078')} />
              </Box>
              <Divider className='mx-3' />
              <Box className='flex items-center justify-between px-3 py-3'>
                <Typography variant='body2' className='text-gray-800'>사업자정보확인</Typography>
                <i className='ri-arrow-right-s-line text-gray-400' />
              </Box>
            </Box>
          </Box>
        </>
      ) : !isUserDetailsOpen ? (
        <Box className='px-3 pb-10'>
          <Box className='px-3 py-3'>
            <Typography variant='h4' className='ml-1 font-semibold text-black'>설정</Typography>
          </Box>
          {/* Item 1: 내 정보 및 보안 */}
          <Box className='bg-white rounded-xl overflow-hidden mb-3'>
            <Box className='flex items-center justify-between px-3 py-3 cursor-pointer' onClick={() => setIsUserDetailsOpen(true)}>
              <Box className='flex items-center gap-3'>
                <Box className='w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center'>
                  <i className='ri-user-fill text-white text-lg' />
                </Box>
                <Typography variant='body1' className='text-black'>내 정보 및 보안</Typography>
              </Box>
              <i className='ri-arrow-right-s-line text-gray-400' />
            </Box>
          </Box>

          {/* Item 2: 법적 정보 */}
          <Box className='bg-white rounded-xl overflow-hidden mb-3'>
            <Box className='flex items-center justify-between px-3 py-3 cursor-pointer' onClick={() => setIsLegalOpen(true)}>
              <Box className='flex items-center gap-3'>
                <Box className='w-7 h-7 rounded-lg bg-gray-400 flex items-center justify-center'>
                  <i className='ri-contract-fill text-white text-lg' />
                </Box>
                <Typography variant='body1' className='text-black'>법적 정보</Typography>
              </Box>
              <Box className='flex items-center gap-1'>
                <Typography className='text-gray-400' variant='body1'>약관 및 개인정보 처리</Typography>
                <i className='ri-arrow-right-s-line text-gray-400' />
              </Box>
            </Box>
            <Divider className='mx-5' />
            {/* Item 3: 오픈소스 라이선스 */}

            <Box className='flex items-center justify-between px-3 py-3 cursor-pointer' onClick={() => setIsOpenSourceOpen(true)}>
              <Box className='flex items-center gap-3'>
                <Box className='w-7 h-7 rounded-lg bg-gray-400 flex items-center justify-center'>
                  <i className='ri-open-source-fill text-white text-lg' />
                </Box>
                <Typography variant='body1' className='text-black'>오픈소스 라이선스</Typography>
              </Box>
              <i className='ri-arrow-right-s-line text-gray-400' />
            </Box>
            <Divider className='mx-5' />
            {/* Item 4: 문의하기 */}

            <Box className='flex items-center justify-between px-3 py-3' onClick={() => window.open('https://support.thenoldam.com/')}>
              <Box className='flex items-center gap-3'>
                <Box className='w-7 h-7 rounded-lg bg-gray-400 flex items-center justify-center'>
                  <i className='ri-question-line text-white text-lg' />
                </Box>
                <Typography variant='body1' className='text-black'>문의하기</Typography>
              </Box>
              <i className='ri-arrow-right-s-line text-gray-400' />
            </Box>
          </Box>
        </Box>
      ) : (isUnsubscribeOpen ? (
        <>
          {/* Unsubscribe content */}
          <Box className='px-3 pt-3'>
            <Typography variant='h4' className='font-semibold text-black'>탈퇴하기</Typography>
            <Typography className='text-black font-semibold text-[14px] mt-1'>탈퇴 전 꼭 확인해주세요!</Typography>

            <Box className='bg-white rounded-xl p-4 mt-3'>
              <Box className='text-[12px] text-gray-800 leading-relaxed'>
                <p className='mb-1 font-semibold'>1. 동일한 번호로 재가입이 제한되요</p>
                <p className='mb-3 text-gray-600 text-[10px]'>탈퇴 처리 후 영업일로부터 30일 동안 탈퇴하신 번호로 가입하실 수 없어요. </p>
                <p className='mb-1 font-semibold'>2. @Username 님의 활동 내역이 사라져요</p>
                <p className='mb-3 text-gray-600 text-[10px]'>과거 작성한 피드, 댓글와 개설했던 모임 내역 모두 사라져요.</p>
                <p className='mb-1 font-semibold'>3. 정산금을 수령해주세요</p>
                <p className='mb-3 text-gray-600 text-[10px]'>미수령 혹은 정산되지 않은 정산금을 수령하신 후에 탈퇴해주세요.
                  탈퇴 후 수령이 어려우실 수 있어요.</p>
                <p className='mb-1 font-semibold'>4. 이용 정보는 일정기간 보관해요</p>
                <p className='mb-3 text-gray-600 text-[10px]'>’전자상거래 등에서 소비자보호에 관한 법률’에 따라 유료 결제에 관한 계약 기록은 5년간 보관되요.</p>
              </Box>
            </Box>
          </Box>

          {/* Fixed bottom button */}
          <Box className='fixed left-0 right-0 bottom-8 px-4'>
            <Button fullWidth variant='contained' sx={{ backgroundColor: '#111827', color: '#fff', borderRadius: '12px', textTransform: 'none', py: 1.25 }}>탈퇴하기</Button>
          </Box>
        </>
      ) : (
        <>
          {/* Profile card */}
          <Box className='px-3'>
            <Box className='bg-white rounded-xl p-4 flex flex-col items-center mb-3'>
              <Box className='w-12 h-12 rounded-lg flex items-center justify-center'>
                {profileData?.data?.user?.profileImage ?
                  (
                    <img src={profileData.data.user.profileImage} alt='profile' className='w-12 h-12 rounded-lg object-cover' />
                  ) : (
                    <Box className='w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center'>
                      <i className='ri-user-fill text-white text-2xl' />
                    </Box>
                  )
                }
              </Box>
              <Typography variant='body1' className='mt-2 font-semibold text-black'>내 정보 및 보안</Typography>
              <Typography className='text-gray-400 text-[12px] mt-1'>내 개인정보 및 보안 상태를 확인하세요</Typography>
            </Box>
          </Box>

          {/* Form card */}
          <Box className='px-3'>
            <Box className='bg-white rounded-xl overflow-hidden'>
              {/* Row: 이름 */}
              <Box className='flex items-center justify-between px-3 py-3'>
                <Typography variant='body2' className='text-gray-700'>이름</Typography>
                <Typography variant='body2' className='text-gray-700'> {profileData?.data?.user?.nickname || ''}</Typography>
              </Box>
              <Divider className='mx-3' />
              {/* Row: 생년월일 */}
              <Box className='flex items-center justify-between px-3 py-3'>
                <Typography variant='body2' className='text-gray-700'>생년월일</Typography>
                <Typography variant='body2' className='text-gray-700'>{profileData?.data?.profile?.dob ? new Date(profileData.data.profile.dob).toISOString().split('T')[0] : ''}</Typography>
              </Box>
              <Divider className='mx-3' />
              {/* Row: 휴대폰 번호 */}
              <Box className='flex items-center justify-between px-3 py-3'>
                <Typography variant='body2' className='text-gray-700'>휴대폰 번호</Typography>
                <Typography variant='body2' className='text-gray-700'>{profileData?.data?.user?.phoneNumber || ''}</Typography>
              </Box>
              <Divider className='mx-3' />
              {/* Row: 이메일 주소 */}
              <Box className='flex items-center justify-between px-3 py-3 cursor-pointer' onClick={() => router.push('/login?edit=true&returnTo=/web/Mypage/settings')}>
                <Typography variant='body2' className='text-gray-700'>초기정보 다시 입력</Typography>
                <Typography variant='body2' className='text-gray-700'>변경하기</Typography>
                {/* <TextField size='small' placeholder='변경하기' variant='standard' InputProps={{ disableUnderline: true }} sx={rightInputSx} /> */}
              </Box>
            </Box>
          </Box>

          {/* 탈퇴하기 */}
          <Box className='px-3 mt-3 pb-10'>
            <Box className='bg-white rounded-xl overflow-hidden'>
              <Box className='flex items-center justify-between px-3 py-3 cursor-pointer' onClick={() => setIsUnsubscribeOpen(true)}>
                <Typography variant='body2' className='text-gray-700'>탈퇴하기</Typography>
                <i className='ri-arrow-right-s-line text-gray-400' />
              </Box>
            </Box>
          </Box>
        </>
      ))}
    </Box>
  )
}

export default SettingsPage


