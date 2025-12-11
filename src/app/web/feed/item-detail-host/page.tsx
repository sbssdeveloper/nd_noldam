'use client'

import React from 'react'
import { Box, IconButton, Typography, Button, Avatar, TextField } from '@mui/material'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import { useChat } from '@/components/layout/ChatContext'
import type { FeedItem, MeetingData } from '@/services/types/frontend'

const ItemDetailHostPage = () => {
  const router = useRouter()
  const { navigate } = useNavigation()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { setChatView } = useChat()
  const [showBooking, setShowBooking] = React.useState(false)

  React.useEffect(() => {
    // Hide footer navbar by switching layout view state
    setChatView('search')
    return () => setChatView(null)
  }, [setChatView])

  // Open the modal if URL has ?booking=1
  React.useEffect(() => {
    if (searchParams?.get('booking') === '1') {
      setShowBooking(true)
    }
  }, [searchParams])

  // Lock page scroll while booking overlay is open
  React.useEffect(() => {
    if (showBooking) {
      const prevHtml = document.documentElement.style.overflow
      const prevBody = document.body.style.overflow
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
      return () => {
        document.documentElement.style.overflow = prevHtml
        document.body.style.overflow = prevBody
      }
    }
  }, [showBooking])

  const handleBack = React.useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      navigate('/feed/trending-feeds/lifestyle')
    }
  }, [router])

  const [showMeetingDetails, setShowMeetingDetails] = React.useState(false)
  const [showCreatePost, setShowCreatePost] = React.useState(false)
  const [postText, setPostText] = React.useState('')
  const [showOptions, setShowOptions] = React.useState(false)
  const [showClubSelect, setShowClubSelect] = React.useState(false)
  const [selectedClub, setSelectedClub] = React.useState<any>(null)
  const [tempClub, setTempClub] = React.useState<any>(null)
  const [images, setImages] = React.useState<string[]>([])
  const [files, setFiles] = React.useState<File[]>([])
  const imageInputRef = React.useRef<HTMLInputElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const openMeetingDetails = React.useCallback(() => {
    setShowMeetingDetails(true)
  }, [])

  const openCreatePost = React.useCallback(() => {
    setShowCreatePost(true)
  }, [])

  const triggerImagePicker = () => imageInputRef.current?.click()
  const triggerFilePicker = () => fileInputRef.current?.click()

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setImages(prev => [...prev, url])
      setShowOptions(false)
      e.target.value = ''
    }
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFiles(prev => [...prev, file])
      setShowOptions(false)
      e.target.value = ''
    }
  }

  const closeBooking = React.useCallback(() => {
    setShowBooking(false)
    router.back()
  }, [router])

  return (
    <Box className="relative min-h-screen bg-white">
      {/* HERO: exactly 100vh, image not cropped (contain) */}
      <Box className="relative h-screen overflow-hidden">
        {/* Image */}
        <img
          src="/images/custom/item-detail-img.png"
          alt="item detail"
          className="absolute inset-0 w-full h-full scale-150 object-contain"
        />

        {/* Dark overlay for readability (non-interactive), only on hero */}
        <Box className="absolute inset-0 bg-black/45 pointer-events-none" />

        {/* Back arrow on image */}
        <IconButton
          onClick={handleBack}
          className="absolute top-3 left-3 border border-white/80 border-2 z-30 w-9 h-9 rounded-full bg-white/30 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center"
        >
          <i className="ri-arrow-left-s-line text-lg text-white" />
        </IconButton>

        {/* Foreground hero content (centered) */}
        <Box className="relative z-10 flex flex-col items-center justify-end text-center px-4 h-full pb-20">
          <Box className="w-full max-w-sm mx-auto">
            {/* Instructor pill */}
            <Box className="inline-flex items-center bg-black/50 backdrop-blur-sm border rounded-full border-white/50 px-3 py-2 mb-3">
              <Avatar className="w-5 h-5 bg-gray-600 mr-2" />
              <Typography variant="body2" className="text-white mr-1">
                김경희
              </Typography>
              <Box className="w-4 h-4 rounded-full bg-green-200 flex items-center justify-center">
                <i className="ri-check-line text-green-500 text-[10px]" />
              </Box>
            </Box>

            {/* Title */}
            <Typography
              variant="h3"
              className="text-white font-extrabold leading-tight mb-2"
              sx={{ textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}
              align="center"
            >
              불안한 일상
              <br />
              노션으로 정돈하기
            </Typography>

            {/* Details small lines */}
            <Typography variant="body2" className="text-white/90 mb-1" sx={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
              영등포구 · 취미 · 중 20명 참여중
            </Typography>
            <Typography variant="body2" className="text-white/90 mb-4" sx={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
              180분
            </Typography>

            {/* Date pill */}
            <Box className="bg-gray-500 rounded-xl px-3 py-2 inline-flex items-center">
              <i className="ri-calendar-line text-white text-sm mr-2" />
              <Typography variant="body2" className="text-white">2025년 06월 20일 17시 00분</Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Fixed Bottom CTA pill (visible while scrolling) */}
      <Box className="fixed left-0 right-0 bottom-4 z-20 flex justify-center px-4 pointer-events-none">
        <Button
          fullWidth
          variant="contained"
          className="pointer-events-auto font-bold"
          onClick={openMeetingDetails}
          sx={{
            maxWidth: 420,
            backgroundColor: 'rgba(215,215,215)',
            color: '#111',
            borderRadius: '28px',
            boxShadow: '0 6px 18px rgba(0,0,0,0.15)',
            textTransform: 'none',
            fontSize: '13px',
            '&:hover': { backgroundColor: 'rgba(255,255,255,1)' }
          }}
        >
          <img src="/images/custom/item-detail-btn-img.png" alt="the noldam" height={22} width={22} className="object-cover mr-2 rounded-full" />
          불안한 일상, 노션으로 정돈하기 <span className="text-black font-light ml-2"> 모임 수정하기</span>
        </Button>
      </Box>

      {/* Meeting Details overlay */}
      {showMeetingDetails && (
        <Box className="fixed inset-0 bg-gray-100 flex flex-col" style={{ zIndex: 60 }}>
          {/* Header */}
          <Box className="flex items-center justify-between px-2 py-3 bg-gray-100">
            <Box className="flex items-center">
              <IconButton onClick={() => setShowMeetingDetails(false)} className="p-0 mr-1">
                <i className="ri-arrow-left-s-line text-2xl" />
              </IconButton>
              <Typography variant="subtitle1" className="font-semibold text-gray-800">모임 내역</Typography>
            </Box>
          </Box>

          {/* Content */}
          <Box className="flex-1 overflow-y-auto px-4 py-4 bg-gray-100">
            <Box className="max-w-md mx-auto space-y-6">

              {/* Meeting Overview Card */}
              <Box className="bg-white rounded-xl p-4">
                <Typography variant="h6" className="font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3">
                  불안한 일상, 노션으로 정돈하기
                </Typography>

                <Box className="space-y-2 mb-4 border-b border-gray-200 pb-2">
                  <Typography variant="body2" className="text-gray-600">
                    최근 2025년 6월 12일 모임 진행
                  </Typography>
                  <Typography variant="body2" className="text-gray-600">
                    정산 주기 : 매달 18일
                  </Typography>
                </Box>

                {/* Financial Breakdown */}
                <Box className="space-y-3">
                  <Box className="flex justify-between items-center">
                    <Typography variant="body2" className="text-gray-700">매출액</Typography>
                    <Typography variant="body2" className="font-medium text-gray-900">24,000 원</Typography>
                  </Box>

                  <Box className="flex justify-between items-center">
                    <Typography variant="body2" className="text-gray-700">수수료</Typography>
                    <Box className="text-right">
                      <Typography variant="body2" className="font-medium text-gray-900">(2025년 12월 31일까지 무료) -24,000원</Typography>
                    </Box>
                  </Box>

                  <Box className="">
                    <Box className="flex justify-between items-center">
                      <Typography variant="body2" className="font-medium text-gray-900">총 정산액</Typography>
                      <Typography variant="body2" className="font-bold text-gray-900">0 원</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Members Card */}
              <Box className="bg-white rounded-xl p-4">
                <Typography variant="h6" className="font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                  멤버 13
                </Typography>

                <Box className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Box key={index} className="flex items-center gap-2">
                      <Avatar className="w-10 h-10 bg-gray-300 mr-3" />
                      <Box>
                        <Typography variant="body1" className="font-semibold text-gray-900 flex items-center gap-1">User Name
                          <img src='/images/custom/yellow-verified-badge.png' alt='yellow verified badge' width={20} height={20} />
                        </Typography>
                        <Typography variant="body2" className="text-gray-500">Introducing anything</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>

                <Box className="text-center mt-4">
                  <Typography variant="body2" className="text-black font-semibold   cursor-pointer">
                    멤버 더보기
                  </Typography>
                </Box>
              </Box>

              {/* Schedule Card */}
              <Box className="bg-white rounded-xl p-4">
                <Typography variant="h6" className="font-bold text-gray-900 mb-4">
                  일정 4
                </Typography>

                <Box className="space-y-4">
                  {/* Schedule 1 */}
                  <Box className="flex items-center">
                    <Box className="text-center mr-4">
                      <Typography variant="body1" className="text-red-500 font-medium mr-1">SEP</Typography>
                      <Typography variant="h3" className="text-black font-semibold">13</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body1" className="font-medium text-gray-900">모임 1</Typography>
                      <Typography variant="body2" className="text-orange-500">모집중</Typography>
                    </Box>
                  </Box>

                  {/* Schedule 2 */}
                  <Box className="flex items-center">
                    <Box className="text-center mr-4">
                      <Typography variant="body1" className="text-red-500 font-medium mr-1">SEP</Typography>
                      <Typography variant="h3" className="text-black font-semibold">1</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body1" className="font-medium text-gray-900">모임 1</Typography>
                      <Typography variant="body2" className="text-gray-500">종료</Typography>
                    </Box>
                  </Box>
                </Box>

                <Box className="text-center mt-4">
                  <Typography variant="body2" className="text-black font-semibold cursor-pointer">
                    모임 더보기
                  </Typography>
                </Box>
              </Box>

              {/* Bottom Action Buttons - Now part of scrollable content */}
              <Box className="flex gap-3 pb-6">
                <Button
                  fullWidth
                  className="border-none"
                  variant="outlined"
                  sx={{
                    backgroundColor: '#e0e0e0',
                    color: '#333',
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontSize: '14px',
                    fontWeight: 500,
                    py: 1.5,
                    '&:hover': {
                      backgroundColor: '#e0e0e0'
                    }
                  }}
                >
                  문의하기
                </Button>

                <Button
                  fullWidth
                  variant="contained"
                  onClick={openCreatePost}
                  sx={{
                    backgroundColor: '#333',
                    color: '#fff',
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontSize: '14px',
                    fontWeight: 500,
                    py: 1.5,
                    '&:hover': { backgroundColor: '#555' }
                  }}
                >
                  모임 추가하기
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Booking overlay modal */}
      {showBooking && (
        <Box className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Blurred blue-tinted background within overlay */}
          <Box className="absolute inset-0 overflow-hidden">
            <img src="/images/custom/item-detail-img.png" alt="bg" className="w-full h-full object-cover scale-110" />
            <Box className="absolute inset-0 bg-black/50" />
          </Box>

          {/* Overlay content wrapper */}
          <Box className="relative z-50 w-11/12 bg-white/50 border border-white/50 border-2 backdrop-blur-sm p-4 rounded-xl max-w-sm">
            {/* Header (outside card) */}
            <Box className="flex items-center justify-between mb-3">
              <Box className="flex items-center">
                <img src="/images/custom/nd-logo.png" alt="the noldam" className="h-6" />
              </Box>
              <IconButton onClick={closeBooking} className="bg-white/90 hover:bg-white shadow">
                <i className="ri-close-line" />
              </IconButton>
            </Box>

            {/* Card (white) */}
            <Box className="bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[70vh] flex flex-col">
              {/* Scrollable content area */}
              <Box className="overflow-y-auto px-4">
                {/* Title row */}
                <Box className="py-4 flex items-center">
                  <Box className="w-10 h-10 rounded bg-gray-200 mr-3" />
                  <Box>
                    <Typography variant="body2" className="text-gray-900 font-medium">불안한 일상, 노션으로 정돈하기</Typography>
                    <Box className="flex items-center text-gray-700 text-xs mt-1">
                      <span>김정희</span>
                      <Box className="w-4 h-4 ml-2 bg-green-200 rounded-full flex items-center justify-center">
                        <i className="ri-check-line text-green-500 text-xs" />
                      </Box>
                    </Box>
                  </Box>
                </Box>
                <Box className="border-t border-gray-300" />

                {/* Date section */}
                <Box className="py-3">
                  <Typography variant="subtitle2" className="text-gray-900 font-bold mb-1">2025년 06월 21일 모임 참여</Typography>
                  <Typography fontSize={10} className="text-gray-500">결제가 확인되면 알림으로 상세 내용을 보내드려요</Typography>
                </Box>
                <Box className="" />

                {/* Price section - Only show until December 31, 2025 */}
                {new Date() <= new Date('2025-12-31T23:59:59') && (
                  <Box className="py-3">
                    <Typography variant="subtitle2" className="text-gray-900 font-bold mb-1"><del className="text-gray-500">83,000원</del> 2025년 12월 31일까지 무료</Typography>
                    <Typography fontSize={10} className="text-gray-500">더 많이 배우고, 더 많이 보고 들을 수 있도록 지금 무료입니다.</Typography>
                  </Box>
                )}
                <Box className="border-t border-gray-300" />

                {/* Notes list */}
                <Box className="py-3 text-gray-700">
                  <Typography fontSize={10} className="text-gray-800 leading-snug">
                    모임일 기준 4일 전까지 취소가 가능하고,
                  </Typography>
                  <Typography fontSize={10} className="text-gray-800 mb-2 leading-snug">
                    모임일 기준 3일부터는 금액의 50%만 환불받아요.
                  </Typography>
                  <ol className="list-decimal pl-5 space-y-2 text-gray-700" style={{ fontSize: '10px' }}>
                    <li>모임 시작 전 부득이하게 참여가 어려워진 경우, 반드시 호스트에게 미리 알려주세요.</li>
                    <li>무단으로 불참하거나, 함께하는 멤버들에게 피해를 주는 경우 이용 제재를 받게 돼요.</li>
                  </ol>
                </Box>
                <Box className="border-t border-gray-300" />

                {/* Contact */}
                <Box className="py-3 text-[10px] text-gray-600">이름 · 정영주   전화번호 · 010-1234-1234</Box>
              </Box>
            </Box>

            {/* CTA outside card */}
            <Box className="mt-3 text-center">
              <Button variant="contained" className='rounded-full text-sm px-8' sx={{ backgroundColor: '#2D63FF', textTransform: 'none' }}>
                신청하기
              </Button>
              <Typography variant="caption" className="block text-center text-black mt-2 drop-shadow">버튼을 눌러 예약 확정</Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Create Post overlay */}
      {showCreatePost && (
        <Box className="fixed inset-0 bg-white flex flex-col" style={{ zIndex: 70 }}>
          {/* Fixed header */}
          <Box className="flex items-center justify-between px-3 py-3 border-b border-gray-200">
            <IconButton onClick={() => setShowCreatePost(false)} className="p-0">
              <i className="ri-arrow-left-s-line text-2xl" />
            </IconButton>
            <Typography variant="subtitle1" className="font-semibold">게시하기</Typography>
          </Box>

          {/* Body */}
          <Box className="flex-1 px-4 py-4">
            <TextField
              multiline
              minRows={6}
              fullWidth
              placeholder="무슨 일이 있었나요?"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': { backgroundColor: '#f9fafb' },
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
              }}
            />

            {/* Selected Club preview */}
            {selectedClub && (
              <Box className='mt-4 bg-gray-400 rounded-lg px-3 py-2 flex items-center justify-between'>
                <Box className='flex items-center'>
                  <Avatar className='w-8 h-8 bg-gray-600 mr-2' />
                  <Box className="h-8 bg-white mr-2" sx={{ width: '1px' }} />
                  <Typography variant='body2' className='text-white font-medium'>{selectedClub.name}</Typography>
                </Box>
                <IconButton>
                  <i className='ri-arrow-right-s-line text-white' />
                </IconButton>
              </Box>
            )}

            {/* Image previews */}
            {images.length > 0 && (
              <Box className='mt-4 grid grid-cols-1 gap-2'>
                {images.map((src, idx) => (
                  <Box key={idx} className='relative'>
                    <img src={src} className='w-full h-36 object-cover rounded-lg' />
                    <IconButton onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))} className='absolute top-1 right-1 bg-black/50'>
                      <i className='ri-close-line text-white' />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}

            {/* File chips */}
            {files.length > 0 && (
              <Box className='mt-4 space-y-2'>
                {files.map((f, idx) => (
                  <Box key={idx} className='flex items-center bg-gray-400 text-white rounded-lg px-3 py-2 w-full max-w-md'>
                    <i className='ri-folder-2-line mr-2' />
                    <Box className="h-8 bg-white mr-2" sx={{ width: '1px' }} />
                    <span className='flex-1 truncate'>{f.name}</span>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* Bottom plus and options */}
          <Box className="p-4 border-t border-gray-200">
            <Box className="relative">
              <IconButton
                onClick={() => setShowOptions(!showOptions)}
                className="absolute left-1 -top-12 w-10 h-10 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center shadow-none"
              >
                <i className="ri-add-line" />
              </IconButton>

              {showOptions && (
                <Box className="absolute bottom-16 left-2 z-10">
                  <Box className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-w-[240px]">
                    <div className="divide-y divide-gray-200">
                      <Button size="small" className="w-full justify-start py-2 px-3" onClick={() => { setShowOptions(false); setShowClubSelect(true) }}>
                        <span className="w-9 h-9 rounded-full bg-gray-300 inline-flex items-center justify-center mr-2 text-gray-700">
                          <i className="ri-group-line" />
                        </span>
                        <span className="text-gray-800">상대방의 모임</span>
                      </Button>
                      <Button size="small" className="w-full justify-start py-2 px-3" onClick={triggerImagePicker}>
                        <span className="w-9 h-9 rounded-full bg-gray-300 inline-flex items-center justify-center mr-2 text-gray-700">
                          <i className="ri-image-line" />
                        </span>
                        <span className="text-gray-800">사진</span>
                      </Button>
                      <Button size="small" className="w-full justify-start py-2 px-3" onClick={triggerFilePicker}>
                        <span className="w-9 h-9 rounded-full bg-gray-300 inline-flex items-center justify-center mr-2 text-gray-700">
                          <i className="ri-folder-2-line" />
                        </span>
                        <span className="text-gray-800">파일</span>
                      </Button>
                    </div>
                  </Box>
                </Box>
              )}

              {/* Hidden pickers */}
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelected} />
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
            </Box>
          </Box>
        </Box>
      )}

      {/* Club select in-page overlay */}
      {showClubSelect && (
        <Box className='fixed inset-0 bg-white z-80 flex flex-col'>
          {/* Header */}
          <Box className='flex items-center justify-between px-2 py-3 border-b border-gray-200'>
            <Box className='flex items-center'>
              <IconButton onClick={() => setShowClubSelect(false)} className='p-0'>
                <i className='ri-arrow-left-s-line text-2xl' />
              </IconButton>
              <Typography variant='subtitle1' className='font-semibold text-gray-800'>모임 선택하기</Typography>
            </Box>
            <Button
              variant='text'
              className='text-gray-800'
              disabled={!tempClub}
              onClick={() => { if (tempClub) { setSelectedClub(tempClub); setShowClubSelect(false); } }}
            >
              확인
            </Button>
          </Box>

          {/* List */}
          <Box className='flex-1 overflow-y-auto px-4 py-4'>
            <Box className='space-y-4'>
              {[{ id: '1', name: 'Prehistoric Planet', desc: 'The groundbreaking series', date: '2025년 05월 14일에 진행', image: '/images/custom/carousel-image1.jpg' },
              { id: '2', name: 'Morning Club', desc: '러닝 ㆍ 아침 런 커뮤니티', date: '2025년 05월 14일에 진행', image: '/images/custom/carousel-image2.png' },
              { id: '3', name: 'Wellness Club', desc: '건강 ㆍ 성장 ㆍ 웰빙', date: '2025년 05월 14일에 진행', image: '/images/custom/carousel-image3.png' }].map((c) => (
                <Box key={c.id} className={`bg-white rounded-lg overflow-hidden border-2 cursor-pointer ${tempClub?.id === c.id ? 'border-blue-500' : 'border-transparent'}`} onClick={() => setTempClub(c)}>
                  <Box className='w-full h-32 bg-gray-800 flex items-center justify-center'>
                    <img src={c.image} alt={c.name} className='w-full h-full object-cover opacity-80' />
                  </Box>
                  <Box className='p-3'>
                    <Typography variant='caption' className='text-gray-500 block mb-1'>{c.date}</Typography>
                    <Typography variant='h5' className='text-gray-900'>{c.name}</Typography>
                    <Typography variant='body2' className='text-gray-600'>{c.desc}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default ItemDetailHostPage
