'use client'

import React from 'react'
import { Box, IconButton, Typography, Button, Avatar } from '@mui/material'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import { useChat } from '@/components/layout/ChatContext'
import type { FeedItem, MeetingData } from '@/services/types/frontend'

const ItemDetailPage = () => {
  const router = useRouter()
  const { navigate } = useNavigation()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { setChatView } = useChat()
  const [showBooking, setShowBooking] = React.useState(false)
  const [currentSlide, setCurrentSlide] = React.useState(0)
  const [touchStart, setTouchStart] = React.useState<number | null>(null)
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null)
  const [currentReview, setCurrentReview] = React.useState(0)
  const [reviewTouchStart, setReviewTouchStart] = React.useState<number | null>(null)
  const [reviewTouchEnd, setReviewTouchEnd] = React.useState<number | null>(null)

  // Slider images array
  const sliderImages = [
    '/images/custom/item-detail-slider-img.png',
    '/images/custom/carousel-image1.jpg',
    '/images/custom/carousel-image2.png',
    '/images/custom/carousel-image3.png',
    '/images/custom/carousel-image4.jpg'
  ]

  // Reviews data - matching reference exactly
  const reviews = [
    {
      title: "Title",
      rating: 4.5,
      date: "11월 13일",
      user: "USER_Name",
      body: "body"
    },
    {
      title: "Title",
      rating: 4.5,
      date: "11월 13일",
      user: "USER_Name",
      body: "body"
    },
    {
      title: "Title",
      rating: 4.5,
      date: "11월 13일",
      user: "USER_Name",
      body: "body"
    },
    {
      title: "Title",
      rating: 4.5,
      date: "11월 13일",
      user: "USER_Name",
      body: "body"
    }
  ]

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % sliderImages.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + sliderImages.length) % sliderImages.length)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  // Review slider functions
  const nextReview = () => {
    setCurrentReview((prev) => (prev + 1) % reviews.length)
  }

  const prevReview = () => {
    setCurrentReview((prev) => (prev - 1 + reviews.length) % reviews.length)
  }

  const goToReview = (index: number) => {
    setCurrentReview(index)
  }

  // Touch handlers for swipe functionality
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      nextSlide()
    } else if (isRightSwipe) {
      prevSlide()
    }
  }

  // Review touch handlers
  const handleReviewTouchStart = (e: React.TouchEvent) => {
    setReviewTouchEnd(null)
    setReviewTouchStart(e.targetTouches[0].clientX)
  }

  const handleReviewTouchMove = (e: React.TouchEvent) => {
    setReviewTouchEnd(e.targetTouches[0].clientX)
  }

  const handleReviewTouchEnd = () => {
    if (!reviewTouchStart || !reviewTouchEnd) return

    const distance = reviewTouchStart - reviewTouchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      nextReview()
    } else if (isRightSwipe) {
      prevReview()
    }
  }

  React.useEffect(() => {
    // Hide footer navbar by switching layout view state
    setChatView('search')
    return () => setChatView(null)
  }, [setChatView])

  // Auto-slide for reviews
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentReview((prev) => (prev + 1) % reviews.length)
    }, 2500) // Change slide every 2.5 seconds for better loop visibility

    return () => clearInterval(interval)
  }, [reviews.length])

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

  const openBooking = React.useCallback(() => {
    setShowBooking(true)
    if (pathname) {
      const url = `${pathname}?booking=1`
      navigate(url)
    }
  }, [pathname, router])

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
            <Box onClick={() => navigate('/feed/post-detail-social')} className="inline-flex items-center bg-black/50 backdrop-blur-sm border rounded-full border-white/50  px-3 py-2 mb-3 cursor-pointer">
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

      {/* DETAILS: completely below the fold (not visible initially) */}
      <Box className="relative z-10 bg-white rounded-t-2xl pt-5 pb-28 px-4">
        <Box className="max-w-md mx-auto">
          <Typography variant="h6" className="font-bold text-gray-900 mb-3">
            “매일 열심히 사는데, 왜 불안할까요?”
          </Typography>

          {/* Tag chips */}
          <Box className="flex items-center space-x-2 mb-3">
            <Box className="bg-gray-200 text-gray-700 rounded-md px-2 py-1 text-xs">낮은</Box>
            <Box className="bg-gray-200 text-gray-700 rounded-md px-2 py-1 text-xs">슬픔</Box>
            <Box className="bg-gray-200 text-gray-700 rounded-md px-2 py-1 text-xs">동기부여</Box>
          </Box>

          {/* Paragraphs */}
          <Typography variant="body2" className="text-gray-800 mb-2 leading-relaxed">
            가계부를 쓰고, 식단을 짜고, 아이 숙제를 챙기고, 문득 하루를 돌아봤을 때
          </Typography>
          <Typography variant="body2" className="text-gray-800 mb-2 leading-relaxed">
            무언가 계속하고 있지만, ‘나는 성장하고 있는 걸까?’라는 생각이 드는 순간이 있습니다.
          </Typography>
          <Typography variant="body2" className="text-gray-800 mb-2 leading-relaxed">
            언제부터인가 불안은 ‘나를 통제하지 못하는 기분’에서 오는 감정이 되었고,
          </Typography>
          <Typography variant="body2" className="text-gray-800 mb-5 leading-relaxed">
            일상은 점점 더 계획 없이 흘러가는 것만 같았죠.
          </Typography>

          {/* Section header with icon */}
          <Box className="flex items-center space-x-2 border-t border-gray-800 pt-5 mb-2">
            <Typography variant="subtitle1" className="font-bold text-gray-900">🧭 일상을 아카이빙하는 힘</Typography>
          </Box>
          <Typography variant="body2" className="text-gray-800 leading-relaxed mb-4">
            이 클래스는 특별한 기술을 배우는 자리가 아닙니다.
            그저 내가 하는 수많은 메모들을 보기 좋게 정리해보는 것에서 시작합니다.
          </Typography>
          {/* Missing bullet lines */}
          <Box className="space-y-3 mb-4">
            <Typography variant="body2" className="text-gray-800">✍️ 매일 쓰는 일기,</Typography>
            <Typography variant="body2" className="text-gray-800">🍽️ 매주 고민하는 식단표,</Typography>
            <Typography variant="body2" className="text-gray-800">📅 아이들의 숙제와 일정,</Typography>
            <Typography variant="body2" className="text-gray-800">📒 그리고 내 마음에 새겨진 좋은 문장들까지</Typography>
          </Box>
          <Typography variant="body2" className="text-gray-800 leading-relaxed mb-2">
            모두 나를 성장시키는 중요한 데이터가 됩니다.
          </Typography>
          <Typography variant="body2" className="text-gray-800 leading-relaxed mb-6">
            노션은 그 메모들을 한데 모아, 나만의 ‘생활 아카이브’를 만들어주는 도구입니다.
          </Typography>

          {/* Image Slider */}
          <Box className="border-t border-gray-200 pt-5 mb-6">
            <Box className="relative">
              {/* Main slider image with touch support */}
              <Box
                className="relative overflow-hidden cursor-grab active:cursor-grabbing"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <img
                  src={sliderImages[currentSlide]}
                  alt={`Slide ${currentSlide + 1}`}
                  className="rounded-xl w-full h-64 object-cover transition-transform duration-300 ease-in-out select-none"
                  draggable={false}
                />

                {/* Navigation dots overlaid on image */}
                <Box className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  {sliderImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${index === currentSlide
                        ? 'bg-white w-6'
                        : 'bg-white/50 hover:bg-white/70'
                        }`}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>

          {/* 강사 소개 */}
          <Box className="border-t border-gray-800 pt-5 mb-6">
            <Typography variant="h6" className="font-bold text-gray-900 mb-4">강사 소개</Typography>
            <Box className="flex flex-col items-start">
              <Avatar className="w-16 h-16 bg-gray-300 mb-4" />
              <Typography variant="body2" className="text-gray-800 leading-relaxed">
                대기업 마케터로 일하다 육아로 10년을 주부로 지냈습니다. 정체된 일상 속 불안을 계기로, 더 많이 배우고 도전하며 지금은 스타트업 창업을 준비하며 커리어를 다시 이어가고 있어요. 그 과정에서 얻은 작은 깨달음들을 함께 나누고 싶습니다.
                <br />
                <span className="text-gray-600">강사 팔로우하기</span>
              </Typography>
            </Box>
          </Box>



          {/* 이런 분께 추천해요 */}
          <Box className="border-t border-gray-800 pt-5 mb-6">
            <Box className="flex items-center space-x-2 mb-3"><Typography variant="h6" className="font-bold text-gray-900">💡 이런 분께 추천해요</Typography></Box>
            <ul className="list-disc pl-5 space-y-2 text-gray-800">
              <li>요즘 ‘나, 뭘 하고 있는 걸까?’ 하는 생각이 자주 드는 분</li>
              <li>하루하루 열심히 살고 있는데, 나만 뒤처지고 있는 것 같아 불안한 분</li>
              <li>가계부, 식단표, 육아 일정 등 다양한 메모들을 하나로 정리하고 싶은 분</li>
              <li>노션을 써보고는 싶었는데 어렵게 느껴졌던 분</li>
              <li>나의 일상과 감정을 한눈에 보기 좋게 아카이빙하고 싶은 분</li>
            </ul>
          </Box>

          {/* 클래스에서 함께할 것들 */}
          <Box className="border-t border-gray-800 pt-5 mb-6">
            <Box className="flex items-center space-x-2 mb-3">🛠<Typography variant="h6" className="font-bold text-gray-900">클래스에서 함께할 것들</Typography></Box>
            <ul className="list-disc pl-5 space-y-2 text-gray-800">
              <li>비슷한 고민을 가진 사람들과의 공감과 네트워킹</li>
              <li>내가 가지고 있는 메모를 ‘카테고리/별로 나누고 정리’하는 연습</li>
              <li>일상 아카이빙용 노션 템플릿 실습 (식단, 일정, 감정 기록 등)</li>
              <li>나에게 맞는 ‘기록 루틴’ 만들기</li>
            </ul>
          </Box>

          {/* 클래스 후 변화 */}
          <Box className="border-t border-gray-800 pt-5 mb-6">
            <Box className="flex items-center space-x-2 mb-3">💬 <Typography variant="h6" className="font-bold text-gray-900"> 클래스 후, 이런 변화가 찾아옵니다</Typography></Box>
            <ul className="list-disc pl-5 space-y-2 text-gray-800 mb-4">
              <li>내 일상이 다시 흐르기 시작합니다</li>
              <li>반복되는 하루에도, 내 안의 작고 소중한 변화가 보입니다</li>
              <li>메모가 흘러가는 게 아니라 ‘쌓여가는 것’이 됩니다</li>
              <li>불안한 마음에 작은 통제력을 되찾습니다</li>
            </ul>
            <Typography variant="body2" className="text-gray-800 leading-relaxed">
              이제 ‘쌓아두기만 하던 메모들’을 나를 위한 성장의 도구로 바꿔볼 시간이에요. 혼자서는 어려웠던 노션, 함께라서 가능한 정리와 기록의 여정을 시작해보세요.
            </Typography>
          </Box>

          {/* 준비물 */}
          <Box className="border-t border-gray-800 pt-5 mb-6">
            <Typography variant="h6" className="font-bold text-gray-900 mb-2">준비해야 하는 게 있나요?</Typography>
            <Typography variant="body2" className="text-gray-800 leading-relaxed">
              노트북 또는 태블릿 (노션 설치 해오기),<br />
              기록해 왔거나 향후 하고 싶은 일상 메모 생각해오기
            </Typography>
          </Box>

          {/* 별점 & 후기 */}
          {/* <Box className="border-t border-gray-200 pt-5 mb-6">
            <Typography variant="h6" className="font-bold text-gray-900 mb-2">별점 & 후기</Typography>
            <Box className="flex items-center justify-between mb-3">
              <Typography variant="h3" className="font-bold text-gray-900">4.5</Typography>
              <Box className="text-right">
                <Box className="flex items-center justify-end text-black-800 mb-1">
                  <i className="ri-star-fill" />
                  <i className="ri-star-fill" />
                  <i className="ri-star-fill" />
                  <i className="ri-star-fill" />
                  <i className="ri-star-half-line" />
                </Box>
                <Typography variant="caption" className="text-gray-600">15 Ratings</Typography>
              </Box>
            </Box>

            <Box
              className="relative overflow-hidden"
              onTouchStart={handleReviewTouchStart}
              onTouchMove={handleReviewTouchMove}
              onTouchEnd={handleReviewTouchEnd}
            >
              <Box
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentReview * 100}%)` }}
              >
                {reviews.map((review, index) => (
                  <Box key={index} className="w-full flex-shrink-0">
                    <Box className="bg-gray-100 rounded-xl p-3">
                      <Typography variant="subtitle2" className="text-gray-900 mb-1">
                        {review.title}
                      </Typography>

                      <Box className="flex justify-start gap-3 items-center">
                        <Box className="flex items-center text-black-800 mb-1">
                          <i className="ri-star-fill text-sm" />
                          <i className="ri-star-fill text-sm" />
                          <i className="ri-star-fill text-sm" />
                          <i className="ri-star-fill text-sm" />
                          <i className="ri-star-half-line text-sm" />
                        </Box>
                        <Typography variant="caption" className="text-gray-500 mb-1 block">
                          {review.date} · {review.user}
                        </Typography>
                      </Box>
                      <Typography variant="body2" className="text-gray-700">
                        {review.body}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box> */}

          {/* 정보 테이블 */}
          <Box className="border-t border-gray-200 pt-5 mb-2">
            <Typography variant="h6" className="font-bold text-gray-900 mb-3">정보</Typography>
            <Box className="divide-y divide-gray-200 rounded-lg overflow-hidden bg-white">
              {[
                ['이름', '불안한 일상, 노션으로 정돈하기'],
                ['강사', '김경희'],
                ['카테고리', '자기계발'],
                ['진행방식', '오프라인 소셜링 + 노션 활용 실습'],
                ['대상', '기록을 통해 성장하고 싶은 누구나'],
                ['인원', '3명~10명'],
                ['소요시간', '2시간'],
                ['언어', '한국어'],
                ['강의 내 결제', '없음']
              ].map(([label, value], idx) => (
                <Box key={idx} className="flex items-center justify-between py-3 px-2">
                  <Typography variant="body2" className="text-gray-800">{label}</Typography>
                  <Typography variant="body2" className="text-gray-400">{value}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Fixed Bottom CTA pill (visible while scrolling) */}
      <Box className="fixed gap-2 left-0 right-0 bottom-4 z-20 flex justify-center px-4 pointer-events-none">
        <Button
          fullWidth
          variant="contained"
          className="pointer-events-auto font-bold"
          onClick={openBooking}
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
          불안한 일상, 노션으로 정돈하기 <span className="text-black font-light ml-2"> 참여하기</span>
        </Button>
      </Box>

      {/* Booking overlay modal */}
      {showBooking && (
        <Box className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Blurred blue-tinted background within overlay */}
          <Box className="absolute inset-0 overflow-hidden">
            <img src="/images/custom/item-detail-img.png" alt="bg" className="w-full h-full object-cover  scale-110" />
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
                <Box className="  py-4 flex items-center">
                  <Box className="w-10 h-10 rounded bg-gray-200 mr-3" />
                  <Box>
                    <Typography variant="body2" className="text-gray-900 font-medium">불안한 일상, 노션으로 정돈하기</Typography>
                    <Box className="flex items-center text-gray-700 text-xs mt-1">
                      <span>김경희</span>
                      <Box className="w-4 h-4 ml-2 bg-green-200 rounded-full flex items-center justify-center">
                        <i className="ri-check-line text-green-500 text-xs" />
                      </Box>
                    </Box>
                  </Box>
                </Box>
                <Box className="border-t border-gray-300" />

                {/* Date section */}
                <Box className="  py-3">
                  <Typography variant="subtitle2" className="text-gray-900 font-bold mb-1">2025년 06월 21일 모임 참여</Typography>
                  <Typography fontSize={10} className="text-gray-500">결제가 확인되면 알림으로 상세 내용을 보내드려요</Typography>
                </Box>
                <Box className="" />

                {/* Price section - Only show until December 31, 2025 */}
                {new Date() <= new Date('2025-12-31T23:59:59') && (
                  <Box className="  py-3">
                    <Typography variant="subtitle2" className="text-gray-900 font-bold mb-1"><del className="text-gray-500">83,000원</del> 2025년 12월 31일까지 무료</Typography>
                    <Typography fontSize={10} className="text-gray-500">더 많이 배우고, 더 많이 보고 들을 수 있도록 지금 무료입니다.</Typography>
                  </Box>
                )}
                <Box className="border-t border-gray-300" />

                {/* Notes list */}
                <Box className="  py-3 text-gray-700">
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
                <Box className="  py-3 text-[10px] text-gray-600">이름 · 정영주   전화번호 · 010-1234-1234</Box>
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
    </Box>
  )
}

export default ItemDetailPage
