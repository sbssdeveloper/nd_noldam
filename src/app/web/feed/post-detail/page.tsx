'use client'

import React from 'react'
import { Box, Typography, IconButton, Avatar, Button, Tabs, Tab } from '@mui/material'
import { useRouter, useSearchParams } from 'next/navigation'
import type { FeedItem, MeetingData, Comment, Post } from '@/services/types/frontend'

const PostDetailPage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Profile interface variant selector (default: normal). Example: /post-detail?variant=locked
  const variant = searchParams ? searchParams.get('variant') : null
  const isLockedProfile = variant === 'locked'
  const isRestrictedProfile = variant === 'restricted'
  const [activeTab, setActiveTab] = React.useState(0)
  const [subTab, setSubTab] = React.useState(2) // 0: 게시물, 1: Replies, 2: 태그
  const [groupTab, setGroupTab] = React.useState(0) // 0: 전체, 1: 참여, 2: 개설 (2nd main tab)

  // Note: allow users to switch between sub tabs freely even in locked variant

  return (
    <Box className="min-h-screen bg-white pb-28 md:pb-8">
      {/* Fixed Header */}
      <Box className="fixed top-0 left-0 right-0 bg-white z-20 border-b border-gray-200">
        <Box className="flex items-center justify-between px-2 py-3">
          <Box className="flex items-center">
            <IconButton onClick={() => router.back()} className="mr-1 p-0">
              <i className="ri-arrow-left-s-line" style={{ fontSize: '30px' }} />
            </IconButton>
          </Box>
          <Box className="flex items-center space-x-2">
            <Button variant="text" size="small" className="text-gray-800 normal-case">차단</Button>
            <IconButton>
              <i className="ri-share-forward-line text-xl text-gray-500" />
            </IconButton>
            <IconButton>
              <i className="ri-more-2-fill text-xl text-gray-500" />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Content */}
      <Box className="pt-20">
        <Box className="px-4">
          {/* Profile Row */}
          <Box className="flex items-center justify-between">
            <Box className="flex items-center">
              <Avatar className="w-12 h-12 bg-gray-300 mr-3" />
              <Box>
                <Box className="flex items-center">
                  <Typography variant="h6" className="text-black mr-2"></Typography>
                  <img src='/images/custom/profile-light-green.png' alt='yellow verified badge' width={20} height={20} />
                </Box>
              </Box>
            </Box>
          </Box>

          <Typography variant="body2" className="text-gray-800 mt-3"></Typography>

          {/* Stats */}
          <Box className="flex items-center flex-wrap gap-2.5 mt-3">
            <Typography variant="caption" className="text-gray-700"><span className="font-semibold text-black">12,345</span> 팔로워</Typography>
            <Typography variant="caption" className="text-gray-700"><span className="font-semibold text-black">2</span> 팔로잉</Typography>
            <Typography variant="caption" className="text-gray-700"><span className="font-semibold text-black">2</span> 모임 개설</Typography>
            <Typography variant="caption" className="text-gray-700"><span className="font-semibold text-black">4</span> 모임 참여</Typography>
          </Box>

          {/* Actions segmented control */}
          <Box className="flex items-center gap-3 mt-3">
            <Button variant="text" size="small" className="w-1/2 normal-case rounded-lg bg-gray-100" sx={{ color: '#111827' }}>메시지</Button>
          </Box>

          {/* Main Tabs */}
          <Box className="mt-4 border-b border-gray-200">
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              TabIndicatorProps={{ style: { backgroundColor: '#111827', height: 2 } }}
              sx={{
                minHeight: 36,
                '& .MuiTab-root': {
                  minWidth: 'auto',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#9CA3AF',
                  gap: '8px',
                  textTransform: 'none',
                  padding: '8px 16px',
                  '&.Mui-selected': {
                    color: '#111827',
                    fontWeight: 600
                  }
                }
              }}
            >
              <Tab className="mr-8 p-0" label="피드" />
              <Tab className="mr-8 p-0" label="모임" />
              <Tab className="mr-8 p-0" label="배지" />
            </Tabs>
          </Box>
        </Box>

        {/* Category Content */}
        {activeTab === 0 && (
          <>
            {/* Locked profile: show privacy notice and lock illustration instead of posts */}
            {isLockedProfile && (
              <>
                {/* Privacy banner under main tabs */}
                <Box className="flex items-center justify-between rounded bg-gray-100 px-3 py-2">
                  <Typography variant="caption" className="text-gray-600">다른 사람이 내 활동을 볼 수 없어요</Typography>
                  <Button size="small" variant="contained" className="normal-case bg-gray-500 text-white" sx={{ boxShadow: 'none', '&:hover': { backgroundColor: '#E5E7EB' } }}>공개</Button>
                </Box>
              </>
            )}
            {/* Sub Tabs */}
            <Box className="flex items-center gap-5 mt-3 px-4">
              {['게시물', 'Replies', '태그'].map((label, idx) => (
                <Box
                  key={label}
                  onClick={() => setSubTab(idx)}
                  className={`cursor-pointer text-gray-500 text-sm ${subTab === idx ? 'bg-gray-100 rounded px-2 py-1 text-gray-800' : ''}`}
                >
                  {label}
                </Box>
              ))}
            </Box>

            {/* Info notice row */}
            <Box className="mt-2 border-y border-gray-200 px-4">
              <Box className="flex items-center justify-between py-3">
                <Box className="flex items-center gap-2">
                  <i className="ri-information-fill text-md text-white bg-gray-400 rounded-full" />
                  <Typography fontSize={12} className="text-gray-600">유저가 직접 관리하는 공간입니다.</Typography>
                </Box>

              </Box>
            </Box>

            {/* Normal profile posts when not locked/restricted; otherwise locked-message block */}
            {!isLockedProfile && !isRestrictedProfile ? (
              <>
                {subTab === 2 && (
                  <Box className="p-4">
                    {[1, 2, 3].map((idx) => (
                      <Box className="mb-8" key={idx}>
                        <Box className='flex items-start'>
                          <Box className='bg-white flex-1'>
                            <Box className='flex items-start justify-between mb-4'>
                              <Box>
                                <Box className='flex items-center'>
                                  <Avatar className='w-10 h-10 bg-gray-300 mr-3' />
                                  <Typography variant='body1' className='font-medium text-gray-800 mr-2'>김이나</Typography>
                                  <img src='/images/custom/profile-light-green.png' alt='yellow verified badge' width={20} height={20} />

                                  <Typography variant='body2' className='text-gray-500 ml-2'>2시간전</Typography>
                                </Box>
                              </Box>
                              <Button variant="contained" size="small" sx={{ backgroundColor: '#000', color: '#fff', borderRadius: '10px', textTransform: 'none', '&:hover': { backgroundColor: '#333' } }}>팔로우</Button>
                            </Box>
                            <Typography variant='body2' className='text-gray-800 mb-2'>
                              {`"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do `}
                              <span className='text-blue-600'>@User_player</span>
                              {`"`}
                            </Typography>
                            <Box className='w-full h-48 bg-gray-200 mb-4' />
                            <Box className='flex items-center space-x-4 mb-4 px-2'>
                              <Box className='flex items-center space-x-1'>
                                <i className='ri-heart-fill text-red-500' />
                                <Typography variant='body2' className='text-red-600'>23</Typography>
                              </Box>
                              <Box className='flex items-center space-x-1'>
                                <i className='ri-chat-1-line text-gray-500' />
                                <Typography variant='body2' className='text-gray-600'>2</Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
                {subTab !== 2 && (
                  <Box className="py-8 text-center text-gray-500">해당 탭의 콘텐츠가 없습니다.</Box>
                )}
              </>
            ) : (
              <Box className="py-10 flex flex-col items-center">
                <Box className="w-24 h-24 mb-3">
                  <img src="/images/custom/profile-lock.png" alt="잠금" className="w-full h-full object-contain" />
                </Box>
                {isRestrictedProfile ? (
                  <>
                    <Typography variant="body2" className="text-gray-700">John Doe님은</Typography>
                    <Typography variant="body2" className="text-gray-700">
                      피드를 공개하고 싶지 않아요</Typography>
                  </>
                ) : (
                  <>
                    <Typography variant="body2" className="text-gray-700">피드 내역을 보려면</Typography>
                    <Typography variant="body2" className="text-gray-700">내 정보도 공유해주세요</Typography>
                  </>
                )}
              </Box>
            )}
          </>
        )}
        {activeTab === 1 && (
          <>
            {isLockedProfile ? (
              <>
                {/* Privacy banner under main tabs */}
                <Box className="flex items-center justify-between rounded bg-gray-100 px-3 py-2">
                  <Typography variant="caption" className="text-gray-600">다른 사람이 내 활동을 볼 수 없어요</Typography>
                  <Button size="small" variant="contained" className="normal-case bg-gray-500 text-white" sx={{ boxShadow: 'none', '&:hover': { backgroundColor: '#E5E7EB' } }}>공개</Button>
                </Box>
                {/* Sub Tabs for Groups (also visible in locked state) */}
                <Box className="mt-3 px-4">
                  <Box className="flex items-center gap-5">
                    {['전체', '참여', '개설'].map((label, idx) => (
                      <Box
                        key={label}
                        onClick={() => setGroupTab(idx)}
                        className={`cursor-pointer text-gray-600 text-sm ${groupTab === idx ? 'bg-gray-100 rounded px-2 py-1 text-gray-800' : ''}`}
                      >
                        {label}
                      </Box>
                    ))}
                  </Box>
                </Box>
                {/* Centered lock illustration */}
                <Box className="py-10 flex flex-col items-center">
                  <Box className="w-24 h-24 mb-3">
                    <img src="/images/custom/profile-lock.png" alt="잠금" className="w-full h-full object-contain" />
                  </Box>
                  <Typography variant="body2" className="text-gray-700">모임 내역을 보려면</Typography>
                  <Typography variant="body2" className="text-gray-700">내 정보도 공유해주세요</Typography>
                </Box>
              </>
            ) : isRestrictedProfile ? (
              <>
                {/* Sub Tabs for Groups */}
                <Box className="mt-3 px-4">
                  <Box className="flex items-center gap-5">
                    {['전체', '참여', '개설'].map((label, idx) => (
                      <Box
                        key={label}
                        onClick={() => setGroupTab(idx)}
                        className={`cursor-pointer text-gray-600 text-sm ${groupTab === idx ? 'bg-gray-100 rounded px-2 py-1 text-gray-800' : ''}`}
                      >
                        {label}
                      </Box>
                    ))}
                  </Box>
                </Box>
                {/* Centered lock illustration */}
                <Box className="py-10 flex flex-col items-center">
                  <Box className="w-24 h-24 mb-3">
                    <img src="/images/custom/profile-lock.png" alt="잠금" className="w-full h-full object-contain" />
                  </Box>
                  <Typography variant="body2" className="text-gray-700">John Doe님은</Typography>
                  <Typography variant="body2" className="text-gray-700">모임을 공개하고 싶지 않아요</Typography>
                </Box>
              </>
            ) : (
              <Box className="mt-3 px-4">
                {/* Sub Tabs for Groups */}
                <Box className="flex items-center gap-5">
                  {['전체', '참여', '개설'].map((label, idx) => (
                    <Box
                      key={label}
                      onClick={() => setGroupTab(idx)}
                      className={`cursor-pointer text-gray-600 text-sm ${groupTab === idx ? 'bg-gray-100 rounded px-2 py-1 text-gray-800' : ''}`}
                    >
                      {label}
                    </Box>
                  ))}
                </Box>

                {/* Joined Groups Section (전체 only) */}
                {groupTab === 0 && (
                  <>
                    <Typography variant="body1" className="mt-4 mb-2 font-semibold text-black">John Doe가 참여했던 모임</Typography>
                    <Box
                      className='overflow-x-auto'
                      sx={{
                        '&::-webkit-scrollbar': { display: 'none' },
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none'
                      }}
                    >
                      <Box className='flex space-x-4 pb-4' style={{ width: 'max-content' }}>
                        {/* Slide 1 */}
                        <Box className='flex-shrink-0 w-60 bg-white overflow-hidden'>
                          <Box className='relative h-40'>
                            <img src='/images/custom/carousel-image1.jpg' alt='Prehistoric Planet' className='w-full h-full object-cover rounded-lg' />
                          </Box>
                          <Box className='pt-2'>
                            <Typography variant='caption' className='text-gray-500 block'>2025년 05월 14일에 진행함</Typography>
                            <Typography variant='h5' className='text-black'>Prehistoric Planet</Typography>
                            <Typography variant='caption' className='text-gray-500'>The groundbreaking series</Typography>
                          </Box>
                        </Box>
                        {/* Slide 2 */}
                        <Box className='flex-shrink-0 w-60 bg-white overflow-hidden'>
                          <Box className='relative h-40'>
                            <img src='/images/custom/carousel-image2.png' alt='Prehistoric Planet' className='w-full h-full object-cover rounded-lg' />
                          </Box>
                          <Box className='pt-2'>
                            <Typography variant='caption' className='text-gray-500 block'>2025년 05월 14일에 진행함</Typography>
                            <Typography variant='h5' className='text-black'>Prehistoric Planet</Typography>
                            <Typography variant='caption' className='text-gray-500'>The groundbreaking series</Typography>
                          </Box>
                        </Box>
                        {/* Slide 3 */}
                        <Box className='flex-shrink-0 w-60 bg-white overflow-hidden'>
                          <Box className='relative h-40'>
                            <img src='/images/custom/carousel-image3.png' alt='Healthy Life' className='w-full h-full object-cover rounded-lg' />
                          </Box>
                          <Box className='pt-2'>
                            <Typography variant='caption' className='text-gray-500 block'>2025년 05월 14일에 진행함</Typography>
                            <Typography variant='h5' className='text-black'>Healthy Lifestyle</Typography>
                            <Typography variant='caption' className='text-gray-500'>Tips to stay fit and happy</Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </>
                )}

                {/* Joined Groups - 참여: vertical cards (no slider) */}
                {groupTab === 1 && (
                  <>
                    <Typography variant="body1" className="mt-4 mb-2 font-semibold text-black">John Doe가 참여했던 모임</Typography>
                    <Box className="space-y-4">
                      {/* Card 1 */}
                      <Box className='rounded-lg overflow-hidden bg-white'>
                        <Box className='w-full h-44 bg-black'>
                          <img src='/images/custom/carousel-image1.jpg' alt='Prehistoric Planet' className='w-full h-full object-cover' />
                        </Box>
                        <Box className='pt-2'>
                          <Typography variant='caption' className='text-gray-500 block'>2025년 05월 14일에 진행함</Typography>
                          <Typography variant='h5' className='text-black'>Prehistoric Planet</Typography>
                          <Typography variant='caption' className='text-gray-500'>The groundbreaking series</Typography>
                        </Box>
                      </Box>
                      {/* Card 2 */}
                      <Box className='rounded-lg overflow-hidden bg-white'>
                        <Box className='w-full h-44 bg-black'>
                          <img src='/images/custom/carousel-image2.png' alt='Family Dessert Class' className='w-full h-full object-cover' />
                        </Box>
                        <Box className='pt-2'>
                          <Typography variant='caption' className='text-gray-500 block'>2025년 05월 14일에 진행함</Typography>
                          <Typography variant='h5' className='text-black'>Family Dessert Class</Typography>
                          <Typography variant='caption' className='text-gray-500'>아이들과 함께하는 디저트 만들기</Typography>
                        </Box>
                      </Box>
                      {/* Card 3 */}
                      <Box className='rounded-lg overflow-hidden bg-white'>
                        <Box className='w-full h-44 bg-black'>
                          <img src='/images/custom/carousel-image3.png' alt='Healthy Lifestyle' className='w-full h-full object-cover' />
                        </Box>
                        <Box className='pt-2'>
                          <Typography variant='caption' className='text-gray-500 block'>2025년 05월 14일에 진행함</Typography>
                          <Typography variant='h5' className='text-black'>Healthy Lifestyle</Typography>
                          <Typography variant='caption' className='text-gray-500'>건강한 습관 함께 만들기</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </>
                )}

                {/* Hosted Groups Section */}
                {(groupTab === 0 || groupTab === 2) && (
                  <>
                    <Typography variant="body1" className="mt-6 mb-2 font-semibold text-black">John Doe가 개설했던 모임</Typography>
                    <Box
                      className='overflow-x-auto'
                      sx={{
                        '&::-webkit-scrollbar': { display: 'none' },
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none'
                      }}
                    >
                      <Box className='flex space-x-4 pb-4' style={{ width: 'max-content' }}>
                        {/* Reuse slides 4-6 from feed for variety */}
                        <Box className='flex-shrink-0 w-60 bg-white overflow-hidden'>
                          <Box className='relative h-40'>
                            <img src='/images/custom/carousel-image4.jpg' alt='Lifestyle' className='w-full h-full object-cover rounded-lg' />
                          </Box>
                          <Box className='pt-2'>
                            <Typography variant='caption' className='text-gray-500 block'>2025년 05월 14일에 진행함</Typography>
                            <Typography variant='h5' className='text-black'>Prehistoric Planet</Typography>
                            <Typography variant='caption' className='text-gray-500'>The groundbreaking series</Typography>
                          </Box>
                        </Box>
                        <Box className='flex-shrink-0 w-60 bg-white overflow-hidden'>
                          <Box className='relative h-40'>
                            <img src='/images/custom/carousel-image1.jpg' alt='Running crew' className='w-full h-full object-cover rounded-lg' />
                          </Box>
                          <Box className='pt-2'>
                            <Typography variant='caption' className='text-gray-500 block'>2025년 05월 14일에 진행함</Typography>
                            <Typography variant='h5' className='text-black'>Morning Club</Typography>
                            <Typography variant='caption' className='text-gray-500'>러닝 ㆍ 아침 런 커뮤니티</Typography>
                          </Box>
                        </Box>
                        <Box className='flex-shrink-0 w-60 bg-white overflow-hidden'>
                          <Box className='relative h-40'>
                            <img src='/images/custom/carousel-image2.png' alt='Wellness' className='w-full h-full object-cover rounded-lg' />
                          </Box>
                          <Box className='pt-2'>
                            <Typography variant='caption' className='text-gray-500 block'>2025년 05월 14일에 진행함</Typography>
                            <Typography variant='h5' className='text-black'>Wellness Club</Typography>
                            <Typography variant='caption' className='text-gray-500'>건강 ㆍ 성장 ㆍ 웰빙</Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </>
                )}
              </Box>
            )}
          </>
        )}
        {activeTab === 2 && (
          <>
            {isLockedProfile ? (
              <>
                {/* Privacy banner under main tabs */}
                <Box className="flex items-center justify-between rounded bg-gray-100 px-3 py-2">
                  <Typography variant="caption" className="text-gray-600">다른 사람이 내 활동을 볼 수 없어요</Typography>
                  <Button size="small" variant="contained" className="normal-case bg-gray-500 text-white" sx={{ boxShadow: 'none', '&:hover': { backgroundColor: '#E5E7EB' } }}>공개</Button>
                </Box>
                {/* Centered lock illustration */}
                <Box className="py-10 flex flex-col items-center">
                  <Box className="w-24 h-24 mb-3">
                    <img src="/images/custom/profile-lock.png" alt="잠금" className="w-full h-full object-contain" />
                  </Box>
                  <Typography variant="body2" className="text-gray-700">배지 내역을 보려면</Typography>
                  <Typography variant="body2" className="text-gray-700">내 정보도 공유해주세요</Typography>
                </Box>
              </>
            ) : isRestrictedProfile ? (
              <>
                {/* Centered lock illustration */}
                <Box className="py-10 flex flex-col items-center">
                  <Box className="w-24 h-24 mb-3">
                    <img src="/images/custom/profile-lock.png" alt="잠금" className="w-full h-full object-contain" />
                  </Box>
                  <Typography variant="body2" className="text-gray-700">John Doe님은</Typography>
                  <Typography variant="body2" className="text-gray-700">배지를 공개하고 싶지 않아요</Typography>
                </Box>
              </>
            ) : (
              <Box className="mt-4 px-4">
                {/* Section title */}
                <Typography variant="body2" className="font-semibold text-black mb-2">the noldam© 어워즈</Typography>

                {/* Main brand badge */}
                <Box className="flex flex-col w-1/3 items-center mb-6">
                  <Box className="w-full h-36">
                    <img src="/images/custom/main-badge.png" alt="메인 배지" className="w-full h-full object-contain" />
                  </Box>
                  <Typography variant="body2" className="mt-2 text-black font-medium">모임이름뱃</Typography>
                  <Typography variant="caption" className="text-gray-500">골드</Typography>
                </Box>

                {/* Community grade */}
                <Typography variant="body2" className="font-semibold text-black mb-2">커뮤니티 등급</Typography>

                <Box className="flex gap-1 mt-2">
                  {/* Yellow badge */}
                  <Box className="flex w-1/3 flex-col items-center">
                    <Box className="w-24 h-24">
                      <img src="/images/custom/yellow-verified-badge.png" alt="옐로우 등급" className="w-full h-full object-contain" />
                    </Box>
                    <Typography variant="caption" className="mt-2 text-gray-600">씨앗</Typography>
                  </Box>
                  {/* Green badge */}
                  <Box className="flex w-1/3 flex-col items-center">
                    <Box className="w-24 h-24">
                      <img src="/images/custom/green-verified-badge.png" alt="그린 등급" className="w-full h-full object-contain" />
                    </Box>
                    <Typography variant="caption" className="mt-2 text-gray-600">모꼬지</Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  )
}

export default PostDetailPage


