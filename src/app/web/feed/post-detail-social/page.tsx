'use client'

import React from 'react'
import { Box, Typography, IconButton, Avatar, Button, Tabs, Tab, Divider, TextField } from '@mui/material'
import { useRouter } from 'next/navigation'
import type { FeedItem, MeetingData } from '@/services/types/frontend'
import { useChat } from '@/components/layout/ChatContext'

const PostDetailSocialPage = () => {
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState(2) // 0: 요약, 1: 피드, 2: 모임, 3: 배지
  const [groupTab, setGroupTab] = React.useState(1) // 0: 전체, 1: 예정, 2: 참여, 3: 개설
  const { showChat, setChatView } = useChat()
  const [showManage, setShowManage] = React.useState(false)
  const [showReceipt, setShowReceipt] = React.useState(false)
  const [showRefund, setShowRefund] = React.useState(false)
  const [showNoCancel, setShowNoCancel] = React.useState(false)
  const [showCancelReasons, setShowCancelReasons] = React.useState(false)
  const [showUnderReview, setShowUnderReview] = React.useState(false)
  const [showSnaps, setShowSnaps] = React.useState(false)
  const [showPostDetail, setShowPostDetail] = React.useState(false)
  const [selectedReasons, setSelectedReasons] = React.useState<Set<number>>(new Set([0, 4]))
  const [otherReason, setOtherReason] = React.useState('')

  // Lock background scroll when any full-screen overlay is open
  React.useEffect(() => {
    const anyOverlayOpen = showReceipt || showRefund || showManage || showNoCancel || showCancelReasons || showUnderReview || showSnaps || showPostDetail
    const originalOverflow = document.body.style.overflow
    if (anyOverlayOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [showReceipt, showRefund, showManage, showNoCancel, showCancelReasons, showUnderReview, showSnaps, showPostDetail])

  React.useEffect(() => {
    if (showManage) {
      setChatView('search')
      return () => setChatView(null)
    }
  }, [showManage, setChatView])

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
      <Box className=" pt-20">
        {/* Profile Row */}
        <Box className="px-4">
          <Box className="flex items-center justify-between">
            <Box className="flex items-center">
              <Avatar className="w-12 h-12 bg-gray-300 mr-3" />
              <Box>
                <Box className="flex items-center">
                  <Typography variant="h6" className="text-black mr-2">User_player</Typography>
                  <Box className="w-3 h-3 bg-green-200 rounded-full flex items-center justify-center">
                    <i className="ri-check-line text-green-500 text-xs" />
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>

          <Typography variant="body2" className="text-gray-800 mt-3">Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore</Typography>

          {/* Stats */}
          <Box className="flex items-center flex-wrap gap-2.5 mt-3">
            <Typography variant="caption" className="text-gray-700"><span className="font-semibold text-black">12,345</span> 팔로워</Typography>
            <Typography variant="caption" className="text-gray-700"><span className="font-semibold text-black">2</span> 팔로잉</Typography>
            <Typography variant="caption" className="text-gray-700"><span className="font-semibold text-black">2</span> 모임 개설</Typography>
            <Typography variant="caption" className="text-gray-700"><span className="font-semibold text-black">4</span> 모임 참여</Typography>
          </Box>

          {/* Main Tabs */}
          <Box className="mt-4 border-b border-gray-200">
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              TabIndicatorProps={{ style: { backgroundColor: '#111827', height: 2 } }}
              sx={{ minHeight: 36 }}
            >
              <Tab className="p-0" sx={{ minHeight: 36 }} label="요약" />
              <Tab className="p-0" sx={{ minHeight: 36 }} label="피드" />
              <Tab className="p-0" sx={{ minHeight: 36 }} label="모임" />
              <Tab className="p-0" sx={{ minHeight: 36 }} label="배지" />
            </Tabs>
          </Box>
        </Box>

        {/* 모임 Tab Content */}
        {activeTab === 2 && (
          <>
            {/* Privacy banner under main tabs */}
            <Box className="flex items-center justify-between  rounded bg-gray-100 px-3 py-2">
              <Typography variant="caption" className="text-gray-600">다른 사람이 내 활동을 볼 수 없어요</Typography>
              <Button size="small" variant="contained" className="normal-case bg-gray-500 text-white" sx={{ boxShadow: 'none', '&:hover': { backgroundColor: '#E5E7EB' } }}>공개</Button>
            </Box>

            {/* Group sub tabs */}
            <Box className="mt-3 px-4">
              <Box className="flex items-center gap-5">
                {['전체', '예정', '참여', '개설'].map((label, idx) => (
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

            {/* Scheduled groups (예정) */}
            {groupTab === 1 && (
              <Box className="mt-4 space-y-4 px-4">
                <Typography variant="body1" className="font-semibold text-black">참여 예정 모임</Typography>
                {[1, 2, 3].map((cardIdx) => (
                  <Box key={cardIdx} className=" overflow-hidden bg-white">
                    <Box className="relative w-full h-44 bg-black rounded-lg" />
                    <Box className="  py-2">
                      <Typography variant="caption" className="text-gray-500 block">2025년 05월 14일에 진행함</Typography>
                      <Typography variant="h5" className="text-black">Prehistoric Planetaaaaa</Typography>
                      <Typography variant="caption" className="text-gray-500">The groundbreaking series</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {/* Other tabs placeholders */}
            {groupTab !== 1 && (
              <Box className="py-8 text-center text-gray-500 px-4">해당 탭의 콘텐츠가 없습니다.</Box>
            )}
          </>
        )}

        {/* Other main tabs placeholders */}
        {activeTab !== 2 && (
          <Box className="py-8 text-center text-gray-500 px-4">해당 탭의 콘텐츠가 없습니다.</Box>
        )}
      </Box>

      {/* Floating action button above footer navbar (like trending page) */}
      {!showChat && (
        <Box
          className="fixed right-4 transform z-30"
          sx={{ bottom: { xs: 88, md: 40 } }}
        >
          <Button
            variant="contained"
            startIcon={<i className='ri-add-line' />}
            sx={{
              backgroundColor: 'gray',
              color: '#fff',
              borderRadius: '10px',
              px: 2.5,
              py: 2,
              boxShadow: '0 8px 18px rgba(0,0,0,0.15)',
              textTransform: 'none',
              '&:hover': { backgroundColor: '#gray' }
            }}
            onClick={() => setShowManage(true)}
          >
            모임 관리하기
          </Button>
        </Box>
      )}

      {/* In-page Manage Meetings overlay (hides footer) */}
      {showManage && (
        <Box className='fixed inset-0 bg-white flex flex-col' style={{ zIndex: 60 }}>
          {/* Header */}
          <Box className='flex items-center justify-between px-2 py-3 border-b border-gray-200'>
            <Box className='flex items-center'>
              <IconButton onClick={() => { setShowManage(false); }} className='p-0 mr-1'>
                <i className='ri-arrow-left-s-line text-2xl' />
              </IconButton>
              <Typography variant='subtitle1' className='font-semibold text-gray-800'>모임 관리하기</Typography>
            </Box>
          </Box>

          {/* List (black images with text) */}
          <Box className='flex-1 overflow-y-auto px-3 py-4'>
            <Box className='space-y-5'>
              {Array.from({ length: 6 }).map((_, idx) => (
                <Box
                  key={idx}
                  className={`overflow-hidden bg-white ${idx >= 3 ? 'opacity-70' : ''}`}
                  onClick={idx === 0 ? () => setShowReceipt(true) : idx === 1 ? () => setShowRefund(true) : idx === 2 ? () => setShowNoCancel(true) : idx === 3 ? () => setShowCancelReasons(true) : idx === 4 ? () => setShowUnderReview(true) : idx === 5 ? () => setShowSnaps(true) : undefined}
                >
                  <Box className='relative w-full h-40 bg-black rounded-lg'>
                    <Box className='absolute top-2 left-2 bg-gray-900 text-white text-[10px] rounded-full px-4 border border-gray-100/50 py-1'>
                      {idx % 2 === 0 ? '모집 예정' : '확정 대기'}
                    </Box>
                  </Box>
                  <Box className='py-2'>
                    <Typography variant='caption' className='text-gray-500 block'>2025년 05월 14일에 예정함</Typography>
                    <Typography variant='h6' className='text-black'>Prehistoric Planetaaaaa</Typography>
                    <Typography variant='caption' className='text-gray-500'>The groundbreaking series</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Snaps Gallery overlay (opens on 6th card) */}
      {showSnaps && (
        <Box className='fixed inset-0 bg-white flex flex-col' style={{ zIndex: 80 }}>
          {/* Header */}
          <Box className='flex items-center justify-between px-2 py-3 border-b border-gray-200'>
            <Box className='flex items-center'>
              <IconButton onClick={() => { setShowSnaps(false) }} className='p-0 mr-1'>
                <i className='ri-arrow-left-s-line text-2xl' />
              </IconButton>
              <Typography variant='subtitle1' className='font-semibold text-gray-800'>모임 스냅 모아보기</Typography>
            </Box>
          </Box>

          {/* Content */}
          <Box className='flex-1 overflow-y-auto py-4'>
            {/* Top info row */}
            <Box className='flex items-center gap-3 pb-8 mb-3 px-3'>
              <Box className='w-24 h-16 rounded-md bg-gray-300' />
              <Box className='flex-1'>
                <Typography variant='body2' className='text-gray-800 leading-tight'>같이어어 | 에 이벤트—으릉</Typography>
                <Typography variant='caption' className='text-gray-400'>김진희</Typography>
              </Box>
            </Box>

            {/* Masonry-like simple grid 2 columns */}
            <Box className='grid grid-cols-2'>
              {Array.from({ length: 10 }).map((_, i) => (
                <Box
                  key={i}
                  className={`relative cursor-pointer ${((Math.floor(i / 2) + (i % 2)) % 2 === 0) ? 'bg-gray-300' : 'bg-gray-400'}`}
                  style={{ height: i % 3 === 0 ? 110 : 110 }}
                  onClick={() => setShowPostDetail(true)}
                >
                  <Box className='absolute bottom-0 right-1 text-white'>
                    <i className='ri-heart-line text-[18px]' />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Purchase/Receipt Detail overlay */}
      {showReceipt && (
        <Box className='fixed inset-0 bg-gray-100 flex flex-col' style={{ zIndex: 70 }}>
          {/* Header */}
          <Box className='flex items-center justify-between px-2 py-3 border-b border-gray-200'>
            <Box className='flex items-center'>
              <IconButton onClick={() => { setShowReceipt(false) }} className='p-0 mr-1'>
                <i className='ri-arrow-left-s-line text-2xl' />
              </IconButton>
              <Typography variant='subtitle1' className='font-semibold text-gray-800'>모임 ssssssssssssssssssssssssssssssssss내역</Typography>
            </Box>
          </Box>

          {/* Content */}
          <Box className='bg-gray-100 flex-1 overflow-y-auto px-4 py-4'>
            {/* Ticket card */}
            <Box className='bg-white rounded-xl p-3 m-6 flex items-center justify-between'>
              <Box className='flex flex-col gap-5 justify-between'>
                <Box>
                  <img src="/images/custom/nd-logo.png" alt="ticket" className='w-12 ' />
                  <Typography variant='subtitle2' className='text-gray-900 font-semibold'>불안한 일상, 노선으로 정돈하기</Typography>
                </Box>
                <Box>
                  <Typography fontSize={10} className='text-gray-500 block mt-2'>2025 / 06 / 14 (목) 1회</Typography>
                  <Typography fontSize={10} className='text-gray-500 block'>09:00 (오전) - 11:42 (오후)</Typography>
                  <Typography fontSize={10} className='text-gray-500 block'>결제 금액 : 0원</Typography>
                </Box>
              </Box>
              {/* Fake barcode */}
              <Box className='w-20 h-32 rounded-md flex items-center justify-center'>
                <Box className='w-12 space-y-1'>
                  {Array.from({ length: 16 }).map((_, i) => (
                    <Box key={i} className='h-1 bg-gray-300 rounded' />
                  ))}
                </Box>
              </Box>
            </Box>

            <Box className="p-4 my-2 bg-white rounded-lg">
              {/* Title under card */}
              <Typography variant='subtitle1' className='text-black font-semibold mt-6'>불안한 일상, 노선으로 정돈하기</Typography>
              <Divider className='my-3' />

              {/* Payment meta */}
              <Box className='space-y-1'>
                <Typography variant='body2' className='text-gray-700'>2025년 6월 12일 결제 완료</Typography>
                <Typography variant='body2' className='text-gray-700'>결제 수단 : 신용 카드</Typography>
              </Box>
              <Divider className='mt-3' />

              {/* Amount rows */}
              <Box className='mt-4'>
                <Box className='flex items-center justify-between py-2'>
                  <Typography variant='body2' className='text-gray-700'>상품 금액</Typography>
                  <Typography variant='body2' className='text-gray-700'>24,000 원</Typography>
                </Box>
                <Box className='flex items-start justify-between py-2'>
                  <Box>
                    <Typography variant='body2' className='text-gray-700'>할인 금액</Typography>
                    {/* <Typography variant='caption' className='text-gray-500'>(2025년 12월 31일까지 무료)</Typography> */}
                  </Box>
                  <Typography variant='body2' className='text-gray-700'>(2025년 12월 31일까지 무료) -24,000원</Typography>
                </Box>
                <Box className='flex items-center justify-between py-2'>
                  <Typography variant='subtitle2' className='text-black font-semibold'>총 결제 금액</Typography>
                  <Typography variant='subtitle2' className='text-black font-semibold'>0 원</Typography>
                </Box>
              </Box>
            </Box>

            {/* Members Section */}
            <Box className='bg-white rounded-lg p-4 mb-4'>
              <Typography variant='subtitle2' className='text-gray-900 font-medium mb-2'>멤버 13</Typography>
              <Divider className='my-2' />
              <Box className='space-y-3'>
                {[1, 2, 3].map((_, index) => (
                  <Box key={index} className='flex items-center gap-3'>
                    <Box className='w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center'>
                      <i className='ri-user-line text-gray-500' />
                    </Box>
                    <Box className='flex-1'>
                      <Box className='flex items-center gap-1'>
                        <Typography variant='body2' className='font-semibold text-black'>User Name</Typography>
                        <img src='/images/custom/yellow-verified-badge.png' alt='yellow verified badge' width={20} height={20} />
                      </Box>
                      <Typography variant='caption' className='text-gray-500'>Introducing anything</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
              <Button
                variant='text'
                size='small'
                className='mt-3 w-full'
                sx={{
                  borderColor: '#E5E7EB',
                  color: '#000',
                  '&:hover': { borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' }
                }}
              >
                멤버 더보기
              </Button>
            </Box>

            {/* Schedule Section */}
            <Box className='bg-white rounded-lg p-4 mb-4'>
              <Typography variant='subtitle2' className='text-gray-900 font-medium mb-2'>일정 4</Typography>
              <Divider className='my-2' />
              <Box className='space-y-4'>
                <Box className='flex items-center gap-4'>
                  <Box className='flex flex-col items-center'>
                    <Typography variant='h6' className='text-red-500 font-medium'>SEP</Typography>
                    <Typography variant='h3' className='text-gray-900 font-bold'>13</Typography>
                  </Box>
                  <Box className='flex-1'>
                    <Typography variant='body2' className='text-gray-900 font-medium'>모임 1</Typography>
                    <Typography variant='caption' className='text-orange-500'>모집중</Typography>
                  </Box>
                </Box>
                <Box className='flex items-center gap-4'>
                  <Box className='flex flex-col items-center'>
                    <Typography variant='h6' className='text-red-500 font-medium'>SEP</Typography>
                    <Typography variant='h3' className='text-gray-900 font-bold'>1</Typography>
                  </Box>
                  <Box className='flex-1'>
                    <Typography variant='body2' className='text-gray-900 font-medium'>모임 1</Typography>
                    <Typography variant='caption' className='text-gray-400'>종료</Typography>
                  </Box>
                </Box>
              </Box>
              <Button
                variant='text'
                size='small'
                className='mt-3 w-full'
                onClick={() => setShowSnaps(true)}
                sx={{
                  borderColor: '#E5E7EB',
                  color: '#000',
                  '&:hover': { borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' }
                }}
              >
                모임 더보기sssssttttt
              </Button>
            </Box>

            {/* Bottom actions */}
            <Box className='flex gap-3 mt-6'>
              <Button
                fullWidth
                variant='contained'
                sx={{
                  backgroundColor: '#E5E7EB',
                  color: '#111827',
                  boxShadow: 'none',
                  '&:hover': { backgroundColor: '#D1D5DB' }
                }}
              >
                문의하기ssssssssssssssssssssssssssssssssssssssss
              </Button>
              <Button
                fullWidth
                variant='contained'
                sx={{
                  backgroundColor: '#111827',
                  color: '#fff',
                  boxShadow: 'none',
                  '&:hover': { backgroundColor: '#0A0F1A' }
                }}
              >
                취소하기fsw
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {/* Refund Detail overlay (opens on 2nd card) */}
      {showRefund && (
        <Box className='fixed inset-0 bg-white flex flex-col' style={{ zIndex: 70 }}>
          {/* Header */}
          <Box className='flex items-center justify-between px-2 py-3 border-b border-gray-200'>
            <Box className='flex items-center'>
              <IconButton onClick={() => { setShowRefund(false) }} className='p-0 mr-1'>
                <i className='ri-arrow-left-s-line text-2xl' />
              </IconButton>
              <Typography variant='subtitle1' className='font-semibold text-gray-800'>모임 내역</Typography>
            </Box>
          </Box>

          {/* Content */}
          <Box className='flex-1 overflow-y-auto px-4 py-4'>
            {/* Ticket card */}
            <Box className='bg-gray-100 rounded-xl p-3 m-6 flex items-center justify-between'>
              <Box className='flex flex-col gap-5 justify-between'>
                <Box>
                  <img src="/images/custom/nd-logo.png" alt="ticket" className='w-12 ' />
                  <Typography variant='subtitle2' className='text-gray-900 font-semibold'>불안한 일상, 노선으로 정돈하기</Typography>
                </Box>
                <Box>
                  <Typography fontSize={10} className='text-gray-500 block mt-2'>2025 / 06 / 14 (목) 1회</Typography>
                  <Typography fontSize={10} className='text-gray-500 block'>09:00 (오전) - 11:42 (오후)</Typography>
                  <Typography fontSize={10} className='text-gray-500 block'>결제 금액 : 0원</Typography>
                </Box>
              </Box>
              {/* Fake barcode */}
              <Box className='w-20 h-32 rounded-md flex items-center justify-center'>
                <Box className='w-12 space-y-1'>
                  {Array.from({ length: 16 }).map((_, i) => (
                    <Box key={i} className='h-1 bg-gray-300 rounded' />
                  ))}
                </Box>
              </Box>
            </Box>

            {/* Title under card */}
            <Typography variant='subtitle1' className='text-black font-semibold mt-6'>불안한 일상, 노선으로 정돈하기</Typography>
            <Divider className='my-3' />

            {/* Refund meta */}
            <Box className='space-y-1'>
              <Typography variant='body2' className='text-gray-700'>2025년 6월 15일 취소 완료</Typography>
              <Typography variant='body2' className='text-gray-700'>결제 수단 : 신용 카드</Typography>
            </Box>

            {/* Refund rows */}
            <Box className='mt-4'>
              <Divider />
              <Box className='flex items-start justify-between py-2'>
                <Typography variant='body2' className='text-gray-700'>72시간 이내 취소</Typography>
                <Typography variant='body2' className='text-gray-700'>-12,000원 (50%)</Typography>
              </Box>
              <Box className='flex items-center justify-between py-2'>
                <Typography variant='subtitle2' className='text-black font-semibold'>총 환불 금액</Typography>
                <Typography variant='subtitle2' className='text-black font-semibold'>0 원</Typography>
              </Box>
              <Divider />
            </Box>

            {/* Bottom action */}
            <Box className='flex justify-center gap-3 mt-8'>
              <Button variant='contained' className='w-1/2' sx={{ backgroundColor: '#E5E7EB', color: '#111827', boxShadow: 'none', '&:hover': { backgroundColor: '#D1D5DB' } }}>문의하기</Button>
            </Box>
          </Box>
        </Box>
      )}

      {/* No-cancel notice overlay (opens on 3rd card) */}
      {showNoCancel && (
        <Box className='fixed inset-0 bg-white flex flex-col' style={{ zIndex: 70 }}>
          {/* Header */}
          <Box className='flex items-center justify-between px-2 py-3 border-b border-gray-200'>
            <Box className='flex items-center'>
              <IconButton onClick={() => { setShowNoCancel(false) }} className='p-0 mr-1'>
                <i className='ri-arrow-left-s-line text-2xl' />
              </IconButton>
              <Typography variant='subtitle1' className='font-semibold text-gray-800'>모임 내역</Typography>
            </Box>
          </Box>

          {/* Content */}
          <Box className='flex-1 overflow-y-auto px-4 py-4'>
            {/* Ticket card */}
            <Box className='bg-gray-100 rounded-xl p-3 m-6 flex items-center justify-between'>
              <Box className='flex flex-col gap-5 justify-between'>
                <Box>
                  <img src="/images/custom/nd-logo.png" alt="ticket" className='w-12 ' />
                  <Typography variant='subtitle2' className='text-gray-900 font-semibold'>불안한 일상, 노선으로 정돈하기</Typography>
                </Box>
                <Box>
                  <Typography fontSize={10} className='text-gray-500 block mt-2'>2025 / 06 / 14 (목) 1회</Typography>
                  <Typography fontSize={10} className='text-gray-500 block'>09:00 (오전) - 11:42 (오후)</Typography>
                  <Typography fontSize={10} className='text-gray-500 block'>결제 금액 : 0원</Typography>
                </Box>
              </Box>
              {/* Fake barcode */}
              <Box className='w-20 h-32 rounded-md flex items-center justify-center'>
                <Box className='w-12 space-y-1'>
                  {Array.from({ length: 16 }).map((_, i) => (
                    <Box key={i} className='h-1 bg-gray-300 rounded' />
                  ))}
                </Box>
              </Box>
            </Box>

            {/* Title under card */}
            <Typography variant='subtitle1' className='text-black font-semibold mt-6'>불안한 일상, 노선으로 정돈하기</Typography>
            <Divider className='my-3' />

            {/* Payment meta */}
            <Box className='space-y-1'>
              <Typography variant='body2' className='text-gray-700'>2025년 6월 12일 결제 완료</Typography>
              <Typography variant='body2' className='text-gray-700'>결제 수단 : 신용 카드</Typography>
            </Box>

            {/* Amount rows */}
            <Box className='mt-4'>
              <Box className='flex items-center justify-between py-2'>
                <Typography variant='body2' className='text-gray-700'>상품 금액</Typography>
                <Typography variant='body2' className='text-gray-700'>24,000 원</Typography>
              </Box>
              <Box className='flex items-start justify-between py-2'>
                <Box>
                  <Typography variant='body2' className='text-gray-700'>할인 금액</Typography>
                </Box>
                <Typography variant='body2' className='text-gray-700'>(2025년 12월 31일까지 무료) -24,000원</Typography>
              </Box>
              <Divider />
              <Box className='flex items-center justify-between py-2'>
                <Typography variant='subtitle2' className='text-black font-semibold'>총 결제 금액 bb</Typography>
                <Typography variant='subtitle2' className='text-black font-semibold'>0 원</Typography>
              </Box>
            </Box>

            {/* Notice */}
            <Box className='mt-4 text-center'>
              <Typography variant='body2' className='text-gray-700'>모임일로부터 1일 전에는 취소가 불가능해요</Typography>
            </Box>

            {/* Bottom action */}
            <Box className='flex justify-center gap-3 mt-8'>
              <Button variant='contained' className='w-1/2' sx={{ backgroundColor: '#E5E7EB', color: '#111827', boxShadow: 'none', '&:hover': { backgroundColor: '#D1D5DB' } }}>문의하기</Button>
            </Box>
          </Box>
        </Box>
      )}

      {/* Cancel Reasons overlay (opens on 4th card) */}
      {showCancelReasons && (
        <Box className='fixed inset-0 bg-white flex flex-col' style={{ zIndex: 70 }}>
          {/* Header */}
          <Box className='flex items-center justify-between px-2 py-3 border-b border-gray-200'>
            <Box className='flex items-center'>
              <IconButton onClick={() => { setShowCancelReasons(false) }} className='p-0 mr-1'>
                <i className='ri-arrow-left-s-line text-2xl' />
              </IconButton>
              <Typography variant='subtitle1' className='font-semibold text-gray-800'>모임 취소하기</Typography>
            </Box>
          </Box>

          {/* Content */}
          <Box className='flex-1 overflow-y-auto px-4 py-4'>
            <Typography variant='h5' className='text-gray-900 ml-4 font-bold'>환불하신다니 아쉬워요</Typography>
            <Typography variant='body2' className='text-gray-600 mt-1 ml-4'>환불 사유에 가능한 모두 체크해주세요</Typography>

            {/* Reasons list */}
            <Box className='mt-4 space-y-2'>
              {[
                '일정에 참여할 수 없게 되었어요',
                '마음이 바뀌었어요',
                '모임을 착각했어요',
                '결제 수단을 변경하고 싶어요',
                '모임 참여 비용이 너무 비싸요',
              ].map((label, idx) => {
                const checked = selectedReasons.has(idx)
                return (
                  <Box key={idx} onClick={() => {
                    const next = new Set(selectedReasons)
                    if (checked) next.delete(idx); else next.add(idx)
                    setSelectedReasons(next)
                  }} className={`flex items-center justify-start border rounded px-3 py-3 cursor-pointer ${checked ? 'bg-blue-50 border-blue-200' : 'border-gray-200'}`}>
                    <Box className={`w-5 h-5 rounded-full border-2 mr-2 flex items-center justify-center ${checked ? 'border-blue-600' : 'border-gray-300'}`}>
                      <i className={`ri-check-line ${checked ? 'text-blue-600' : 'text-transparent'} text-sm`} />
                    </Box>
                    <Typography variant='body2' className={`${checked ? 'text-blue-700' : 'text-gray-800'}`}>{label}</Typography>
                  </Box>
                )
              })}
            </Box>

            {/* Other reason as a checkbox with conditional input */}
            <Box className='mt-2'>
              <Box onClick={() => {
                const next = new Set(selectedReasons)
                if (next.has(5)) next.delete(5); else next.add(5)
                setSelectedReasons(next)
              }} className={`flex items-center justify-start border rounded px-3 py-3 cursor-pointer ${selectedReasons.has(5) ? 'bg-blue-50 border-blue-200' : 'border-gray-200'}`}>
                <Box className={`w-5 h-5 rounded-full border-2 mr-2 flex items-center justify-center ${selectedReasons.has(5) ? 'border-blue-600' : 'border-gray-300'}`}>
                  <i className={`ri-check-line ${selectedReasons.has(5) ? 'text-blue-600' : 'text-transparent'} text-sm`} />
                </Box>
                <Typography variant='body2' className={`${selectedReasons.has(5) ? 'text-blue-700' : 'text-gray-800'}`}>기타 사유 (작성해주세요)</Typography>
              </Box>
              {selectedReasons.has(5) && (
                <Box className='mt-2'>
                  <TextField value={otherReason} onChange={(e) => setOtherReason(e.target.value)} fullWidth placeholder='' size='small' InputProps={{ className: 'bg-white' }} />
                </Box>
              )}
            </Box>

            {/* Note */}
            <Typography variant='caption' className='text-gray-500 block text-center mt-6'>검토 후 취소 처리가 진행돼요</Typography>

            {/* Bottom actions */}
            <Box className='flex gap-3 mt-6'>
              <Button fullWidth variant='contained' sx={{ backgroundColor: '#E5E7EB', color: '#111827', boxShadow: 'none', '&:hover': { backgroundColor: '#D1D5DB' } }}>돌아가기</Button>
              <Button fullWidth variant='contained' sx={{ backgroundColor: '#111827', color: '#fff', boxShadow: 'none', '&:hover': { backgroundColor: '#0A0F1A' } }}>취소하기</Button>
            </Box>
          </Box>
        </Box>
      )}

      {/* Under Review overlay (opens on 5th card) */}
      {showUnderReview && (
        <Box className='fixed inset-0 bg-white flex flex-col' style={{ zIndex: 70 }}>
          {/* Header */}
          <Box className='flex items-center justify-between px-2 py-3 border-b border-gray-200'>
            <Box className='flex items-center'>
              <IconButton onClick={() => { setShowUnderReview(false) }} className='p-0 mr-1'>
                <i className='ri-arrow-left-s-line text-2xl' />
              </IconButton>
              <Typography variant='subtitle1' className='font-semibold text-gray-800'>모임 내역</Typography>
            </Box>
          </Box>

          {/* Content */}
          <Box className='flex-1 overflow-y-auto px-4 py-4'>
            {/* Ticket card */}
            <Box className='bg-gray-100 rounded-xl p-3 m-6 flex items-center justify-between'>
              <Box className='flex flex-col gap-5 justify-between'>
                <Box>
                  <img src="/images/custom/nd-logo.png" alt="ticket" className='w-12 ' />
                  <Typography variant='subtitle2' className='text-gray-900 font-semibold'>불안한 일상, 노선으로 정돈하기</Typography>
                </Box>
                <Box>
                  <Typography fontSize={10} className='text-gray-500 block mt-2'>2025 / 06 / 14 (목) 1회</Typography>
                  <Typography fontSize={10} className='text-gray-500 block'>09:00 (오전) - 11:42 (오후)</Typography>
                  <Typography fontSize={10} className='text-gray-500 block'>결제 sssssssssssssssssss금액 : 0원</Typography>
                </Box>
              </Box>
              {/* Fake barcode */}
              <Box className='w-20 h-32 rounded-md flex items-center justify-center'>
                <Box className='w-12 space-y-1'>
                  {Array.from({ length: 16 }).map((_, i) => (
                    <Box key={i} className='h-1 bg-gray-300 rounded' />
                  ))}
                </Box>
              </Box>
            </Box>

            {/* Title under card */}
            <Typography variant='subtitle1' className='text-black font-semibold mt-6'>불안한 일상, 노선으로 정돈하기</Typography>
            <Divider className='my-3' />

            {/* Payment meta */}
            <Box className='space-y-1'>
              <Typography variant='body2' className='text-gray-700'>2025년 6월 12일 결제 완료</Typography>
              <Typography variant='body2' className='text-gray-700'>결제 수단 : 신용 카드</Typography>
            </Box>

            {/* Amount rows */}
            <Box className='mt-4'>
              <Divider />
              <Box className='flex items-center justify-between py-2'>
                <Typography variant='body2' className='text-gray-700'>상품 금액</Typography>
                <Typography variant='body2' className='text-gray-700'>24,000 원</Typography>
              </Box>
              <Box className='flex items-start justify-between py-2'>
                <Box>
                  <Typography variant='body2' className='text-gray-700'>할인 금액</Typography>
                </Box>
                <Typography variant='body2' className='text-gray-700'>(2025년 12월 31일까지 무료) -24,000원</Typography>
              </Box>
              <Box className='flex items-center justify-between py-2'>
                <Typography variant='subtitle2' className='text-black font-semibold'>총 결제 금액</Typography>
                <Typography variant='subtitle2' className='text-black font-semibold'>0 원</Typography>
              </Box>
              <Divider />
            </Box>

            {/* Review note */}
            <Box className='mt-4 text-center'>
              <Typography variant='body2' className='text-gray-700'>취소 검토 중이에요</Typography>
            </Box>

            {/* Bottom actions */}
            <Box className='flex gap-3 mt-8'>
              <Button fullWidth variant='contained' sx={{ backgroundColor: '#E5E7EB', color: '#111827', boxShadow: 'none', '&:hover': { backgroundColor: '#D1D5DB' } }}>돌아가기</Button>
              <Button fullWidth variant='contained' sx={{ backgroundColor: '#111827', color: '#fff', boxShadow: 'none', '&:hover': { backgroundColor: '#0A0F1A' } }}>복구하기</Button>
            </Box>
          </Box>
        </Box>
      )}

      {/* Post Detail overlay (opens when clicking gallery items) */}
      {showPostDetail && (
        <Box className='fixed inset-0 bg-white flex flex-col' style={{ zIndex: 90 }}>
          <Box className="overflow-y-auto">
            {/* Header */}
            <Box className="pt-8 pb-6 px-4">
              {/* Back Button */}
              <Box className="flex justify-start fixed top-0 left-0 right-0 bg-white z-10 p-4 items-center mb-4">
                <IconButton
                  onClick={() => setShowPostDetail(false)}
                  className="text-gray-600 mr-2"
                >
                  <i className="ri-arrow-left-s-line text-xl" />
                </IconButton>
                <Typography variant="body2" className="text-gray-600">
                  뒤로
                </Typography>
              </Box>

              {/* User Info */}
              <Box className="flex items-center justify-between mb-4 mt-12">
                <Box className="flex items-center">
                  <Avatar
                    src="/images/avatars/1.png"
                    className="w-10 h-10 mr-3 cursor-pointer"
                  />
                  <Box>
                    <Box className="flex items-center">
                      <Typography variant="body2" className="font-medium text-black mr-2">
                        김이나
                      </Typography>
                      <Box className="w-3 h-3 bg-green-200 rounded-full flex items-center justify-center">
                        <i className="ri-check-line text-green-500 text-xs" />
                      </Box>
                      <Typography variant="body2" className="text-gray-500 ml-2">
                        2시간 전
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  className="bg-black text-sm p-2 py-1 text-white hover:bg-gray-800"
                  sx={{ borderRadius: '8px' }}
                >
                  팔로우
                </Button>
              </Box>

              {/* Post Content */}
              <Typography variant="body1" className="text-black mb-2">
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
              </Typography>

              {/* Post Image */}
              <Box className="w-full h-48 bg-gray-200 rounded-lg mb-4" />

              {/* Club Card */}
              <Box className="mb-4">
                <Box className="p-2 bg-gray-400 rounded-lg">
                  <Box className="flex items-center justify-between">
                    <Box className="flex items-center">
                      <Box className="w-8 h-8 bg-gray-500 rounded mr-3" />
                      <Box className="flex h-8 w-0.5 bg-gray-200 rounded-full mr-2"></Box>
                      <Box>
                        <Box className="flex justify-start gap-2">
                          <Typography variant="body1" className="font-medium text-white">
                            Club Name
                          </Typography>
                          <Box className="flex items-center">
                            <i className="ri-group-line text-white mr-1 text-sm" />
                            <Typography variant="caption" className="text-white mr-3">
                              20
                            </Typography>
                          </Box>
                        </Box>
                        <Box className="flex items-center mt-1">
                          <i className="ri-calendar-line text-white mr-1 text-sm" />
                          <Typography variant="caption" className="text-white mr-3">
                            6월 1일에 진행함
                          </Typography>
                          <i className="ri-map-pin-line text-white mr-1 text-sm" />
                          <Typography variant="caption" className="text-white">
                            도산공원
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <IconButton>
                      <i className="ri-arrow-right-s-line text-white" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>

              {/* Post Interactions */}
              <Box className="flex items-center space-x-4">
                <Box className="flex items-center space-x-1">
                  <i className="ri-heart-fill text-red-500" />
                  <Typography variant="body2" className="text-red-600">23</Typography>
                </Box>
                <Box className="flex items-center space-x-1">
                  <i className="ri-chat-1-line text-gray-500" />
                  <Typography variant="body2" className="text-gray-600">2</Typography>
                </Box>
              </Box>
            </Box>

            {/* Comments Section */}
            <Box className="px-4 pb-12 flex-1 ">
              <Typography variant="h6" className="font-bold text-black mb-4">
                댓글
              </Typography>

              {/* Comment 1 */}
              <Box className="space-y-2 border-b border-gray-200 pb-4 mb-4">
                <Box className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8 bg-gray-300" />
                  <Box className="flex flex-col">
                    <Box className="flex items-center space-x-2">
                      <Typography variant="body2" className="font-medium text-gray-800">
                        김이나
                      </Typography>
                      <Box className="w-3 h-3 bg-green-200 rounded-full flex items-center justify-center">
                        <i className="ri-check-line text-green-500 text-xs" />
                      </Box>
                      <Typography variant="caption" className="text-gray-400">
                        2시간 전
                      </Typography>
                    </Box>
                    <Typography variant="body2" className="text-gray-800 mt-1">
                      Lorem ipsum dolor sit amet,
                    </Typography>
                  </Box>
                </Box>
                <Box className="relative">
                  <Box className="absolute left-4 top-0 w-0.5 h-full bg-gray-300 border-l-2 border-dashed border-gray-300" />
                  <Box className="ml-6">
                    <Box className="flex items-center space-x-4 mt-2">
                      <Box className="flex items-center space-x-1">
                        <i className="ri-heart-fill text-red-500" />
                        <Typography variant="caption" className="text-red-600">23</Typography>
                      </Box>
                      <Box className="flex items-center space-x-1">
                        <i className="ri-chat-1-line text-gray-500" />
                        <Typography variant="caption" className="text-gray-600">2</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
                <Box className="flex items-center space-x-2 mt-2">
                  <Box className="flex items-center">
                    <Box className="w-4 h-4 bg-gray-300 border border-gray-500 rounded-full" />
                    <Box className="w-4 h-4 bg-black -ml-1 border border-white rounded-full" />
                  </Box>
                  <Typography variant="body2" className="text-gray-800">
                    Show Replies
                  </Typography>
                </Box>
              </Box>

              {/* Comment 2 */}
              <Box className="space-y-2 border-b border-gray-200 pb-4 mb-4">
                <Box className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8 bg-gray-300" />
                  <Box className="flex flex-col">
                    <Box className="flex items-center space-x-2">
                      <Typography variant="body2" className="font-medium text-gray-800">
                        김이나
                      </Typography>
                      <Box className="w-3 h-3 bg-green-200 rounded-full flex items-center justify-center">
                        <i className="ri-check-line text-green-500 text-xs" />
                      </Box>
                      <Typography variant="caption" className="text-gray-400">
                        2시간 전
                      </Typography>
                    </Box>
                    <Typography variant="body2" className="text-gray-800 mt-1">
                      May I Know how about Tesla Tonight?
                    </Typography>
                  </Box>
                </Box>
                <Box className="relative">
                  <Box className="absolute left-4 top-0 w-0.5 h-full bg-gray-300 border-l-2 border-dashed border-gray-300" />
                  <Box className="ml-6">
                    <Box className="flex items-center space-x-4 mt-2">
                      <Box className="flex items-center space-x-1">
                        <i className="ri-heart-fill text-red-500" />
                        <Typography variant="caption" className="text-red-600">23</Typography>
                      </Box>
                      <Box className="flex items-center space-x-1">
                        <i className="ri-chat-1-line text-gray-500" />
                        <Typography variant="caption" className="text-gray-600">2</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
                <Box className="flex items-center space-x-2 mt-2">
                  <Box className="flex items-center">
                    <Box className="w-4 h-4 bg-gray-300 border border-gray-500 rounded-full" />
                    <Box className="w-4 h-4 bg-black -ml-1 border border-white rounded-full" />
                  </Box>
                  <Typography variant="body2" className="text-gray-800">
                    Show Replies
                  </Typography>
                </Box>
              </Box>

              {/* Comment 3 */}
              <Box className="space-y-2 mb-4">
                <Box className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8 bg-gray-300" />
                  <Box className="flex flex-col">
                    <Box className="flex items-center space-x-2">
                      <Typography variant="body2" className="font-medium text-gray-800">
                        김이나
                      </Typography>
                      <Box className="w-3 h-3 bg-green-200 rounded-full flex items-center justify-center">
                        <i className="ri-check-line text-green-500 text-xs" />
                      </Box>
                      <Typography variant="caption" className="text-gray-400">
                        2시간 전
                      </Typography>
                    </Box>
                    <Typography variant="body2" className="text-gray-800 mt-1">
                      May I Know how about Tesla Tonight?
                    </Typography>
                  </Box>
                </Box>
                <Box className="relative">
                  <Box className="absolute left-4 top-0 w-0.5 h-full bg-gray-300 border-l-2 border-dashed border-gray-300" />
                  <Box className="ml-6">
                    <Box className="flex items-center space-x-4 mt-2">
                      <Box className="flex items-center space-x-1">
                        <i className="ri-heart-fill text-red-500" />
                        <Typography variant="caption" className="text-red-600">23</Typography>
                      </Box>
                      <Box className="flex items-center space-x-1">
                        <i className="ri-chat-1-line text-gray-500" />
                        <Typography variant="caption" className="text-gray-600">2</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
                <Box className="flex items-center space-x-2 mt-2">
                  <Box className="flex items-center">
                    <Box className="w-4 h-4 bg-gray-300 border border-gray-500 rounded-full" />
                    <Box className="w-4 h-4 bg-black -ml-1 border border-white rounded-full" />
                  </Box>
                  <Typography variant="body2" className="text-gray-800">
                    Show Replies
                  </Typography>
                </Box>
              </Box>
            </Box>

          </Box>

          {/* Comment Input */}
          <Box className="fixed bottom-0 left-0 right-0 p-4">
            <Box className="flex items-center bg-gray-500 text-white justify-between rounded-lg p-2">
              <Box className="flex items-center flex-1">
                <Avatar className="w-6 h-6 bg-gray-300 mr-2" />
                <input placeholder="답장하기: 김이나..." className="bg-gray-500 text-white border-none outline-none placeholder:text-white flex-1" />
              </Box>
              <Box className="flex items-center">
                <IconButton className="text-white">
                  <i className="ri-image-line" />
                </IconButton>
                <IconButton className="text-white">
                  <i className="ri-add-line" />
                </IconButton>
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default PostDetailSocialPage
