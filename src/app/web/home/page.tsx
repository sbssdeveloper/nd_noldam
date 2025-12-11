'use client'

// React Imports
import { useState, useEffect, useRef } from 'react'

import { useRouter } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'

import Footer from '@/components/Footer'
// Component Imports

// MUI Imports
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import Badge from '@mui/material/Badge'
import Button from '@mui/material/Button'
import PageLoader from '@/components/PageLoader'
import TextField from '@mui/material/TextField'

// Next.js Imports
import Image from 'next/image'

// Hook Imports
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { clearAuth } from '@/store/slices/authSlice'
import { useHomeActions } from '@/hooks/useHomeActions'
import { useMyPageActions as useMypageActions } from '@/hooks/useMyPageActions'

// Component Imports
import { useChat } from '@/components/layout/ChatContext'
import { useMounted } from '@/hooks/useMounted'
import FooterNavbar from '@/components/layout/FooterNavbar'
import { getCommunityBadgeDisplay } from '@/utils/badgeUtils'

// Type Imports
import type { SliderData, MeetingData, TypeBData, TypeAData } from '@/services/types/frontend'
import { meetingsApi } from '@/services/meetingsApi'

// Type A data now has the same structure as Type B (moved to centralized types)

// No fallback data - only use database data

const WebHomePage = () => {
  const router = useRouter()
  const { navigate } = useNavigation()
  const dispatch = useAppDispatch()
  const { user, loading, isAuthenticated } = useAppSelector((state: any) => state.authReducer)

  // Use Redux for home data
  const {
    sliderData,
    typeAData,
    typeBData,
    loading: dataLoading,
    error: dataError,
    hasFetchedData,
    loadHomeData,
    clearData,
    setFetchedData
  } = useHomeActions()

  // Get profile data from Mypage actions (only for authenticated users)
  const { profileData, profileLoading } = useMypageActions()

  const [currentSlide, setCurrentSlide] = useState(0)
  const [showPopup, setShowPopup] = useState(false)
  const isMounted = useMounted()
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0)
  const { showChat, chatView, setShowChat, setChatView, openChat, openSearch } = useChat()

  // Double-click handling for carousel items
  const [lastClickTime, setLastClickTime] = useState(0)
  const [clickedItemId, setClickedItemId] = useState<number | string | null>(null)
  const [hasSwiped, setHasSwiped] = useState(false)

  // Like state management
  const [meetingLikes, setMeetingLikes] = useState<Record<number, { isLiked: boolean; likesCount: number }>>({})
  const [likingMeetingId, setLikingMeetingId] = useState<number | null>(null)

  // Use ref to prevent multiple API calls even during rapid re-renders
  const isFetchingRef = useRef(false)


  // no-op; hydration handled by useMounted

  // Fetch dynamic data using Redux
  useEffect(() => {
    // Avoid duplicate calls while a request is in-flight or data already fetched
    if (hasFetchedData || isFetchingRef.current) return

    isFetchingRef.current = true
    loadHomeData()
    // IMPORTANT: do not reset here; wait for hasFetchedData to flip true
  }, [hasFetchedData, loadHomeData])

  // Initialize like states from fetched data
  useEffect(() => {
    if (hasFetchedData) {
      const likes: Record<number, { isLiked: boolean; likesCount: number }> = {}

      // Initialize from Type A data
      typeAData.forEach((section: TypeAData) => {
        section.meetings?.forEach((meeting: MeetingData) => {
          likes[meeting.id] = {
            isLiked: meeting.isLiked || false,
            likesCount: meeting.likesCount || 0
          }
        })
      })

      // Initialize from Type B data
      typeBData.forEach((section: TypeBData) => {
        section.meetings?.forEach((meeting: MeetingData) => {
          likes[meeting.id] = {
            isLiked: meeting.isLiked || false,
            likesCount: meeting.likesCount || 0
          }
        })
      })

      setMeetingLikes(likes)
    }
  }, [hasFetchedData, typeAData, typeBData])

  // Handle meeting like toggle
  const handleMeetingLike = async (meetingId: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }

    if (!isAuthenticated || likingMeetingId === meetingId) return

    const currentLike = meetingLikes[meetingId] || { isLiked: false, likesCount: 0 }

    // Optimistic update
    setMeetingLikes(prev => ({
      ...prev,
      [meetingId]: {
        isLiked: !currentLike.isLiked,
        likesCount: currentLike.isLiked ? currentLike.likesCount - 1 : currentLike.likesCount + 1
      }
    }))

    setLikingMeetingId(meetingId)

    try {
      const result = await meetingsApi.toggleLike(meetingId)
      if (result) {
        setMeetingLikes(prev => ({
          ...prev,
          [meetingId]: {
            isLiked: result.liked,
            likesCount: result.likeCount
          }
        }))
      } else {
        // Revert on error
        setMeetingLikes(prev => ({
          ...prev,
          [meetingId]: currentLike
        }))
      }
    } catch (error) {
      // Revert on error
      setMeetingLikes(prev => ({
        ...prev,
        [meetingId]: currentLike
      }))
    } finally {
      setLikingMeetingId(null)
    }
  }

  // Reset in-flight guard after data has been fetched successfully
  useEffect(() => {
    if (hasFetchedData && isFetchingRef.current) {
      isFetchingRef.current = false
    }
  }, [hasFetchedData])


  // Get current user from Redux store


  // Compute scope-filtered data based on auth and user categories
  const userCategoryIds: (number | string)[] = (isAuthenticated ? (profileData?.user?.categories || []) : []) as any

  const normalizeScope = (value?: string): 'public' | 'categories' => {
    const v = String(value || 'public').trim().toLowerCase()
    if (v === 'categories' || v === '카테고리') return 'categories'
    if (v === 'public' || v === '전체 공개' || v === '전체') return 'public'
    return 'public'
  }

  const extractCategories = (meta: any): (number | string)[] => {
    if (!meta) return []
    // Support multiple potential keys
    return meta.categories || meta.categoryIds || meta.category_ids || []
  }

  const hasCategoryMatch = (required?: (number | string)[]) => {
    const req = required || []
    if (req.length === 0) return false
    const userSet = new Set(userCategoryIds.map(String))
    return req.map(String).some(id => userSet.has(id))
  }

  const filterByScope = <T extends any>(items: T[], accessor?: (x: T) => { scope?: string, categories?: any[] }) => {
    return (items || []).filter((item: any) => {
      const meta = accessor ? accessor(item) : item
      const scope = normalizeScope(meta?.scope)
      const categories = extractCategories(meta)
      if (!isAuthenticated) {
        // Guests: only public
        return scope === 'public'
      }
      // Authenticated: include public, plus categories with overlap
      return scope === 'public' || hasCategoryMatch(categories)
    })
  }

  const visibleSliders = filterByScope(sliderData as any[], (s: any) => ({ scope: s.scope, categories: s.categories }))
  const visibleTypeA = filterByScope(typeAData as any[], (t: any) => ({ scope: t.scope, categories: t.categories }))
  const visibleTypeB = filterByScope(typeBData as any[], (t: any) => ({ scope: t.scope, categories: t.categories }))

  // Auto-advance slideshow every 5 seconds - only when slider data is available
  useEffect(() => {
    if (visibleSliders.length > 1) { // Only auto-advance if there are multiple slides
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % visibleSliders.length)
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [visibleSliders.length]) // Only depend on length, not the entire array

  // Show popup only once per session
  useEffect(() => {
    const hasShownPopup = sessionStorage.getItem('hasShownPopup')
    if (!hasShownPopup) {
      setShowPopup(true)
      sessionStorage.setItem('hasShownPopup', 'true')
    } else {
      setShowPopup(false)
    }
  }, [])

  const handleSlideChange = (index: number) => {
    setCurrentSlide(index)
  }

  // Double-click handler for carousel items
  const handleItemClick = (itemId: number | string, redirectUrl: string) => {
    const currentTime = Date.now()
    const timeDiff = currentTime - lastClickTime

    // If it's the same item and within 500ms, it's a double-click
    if (clickedItemId === itemId && timeDiff < 500) {
      navigate(redirectUrl)
      setLastClickTime(0) // Reset
      setClickedItemId(null)
    } else {
      // First click - set the item and time
      setClickedItemId(itemId)
      setLastClickTime(currentTime)
    }
  }

  const handlePopupClose = () => {
    setShowPopup(false)
    // Mark popup as shown in sessionStorage to prevent it from showing again
    sessionStorage.setItem('hasShownPopup', 'true')
  }

  const getUserLevelIcon = (level: number) => {
    if (level === 0) return null

    const getLevelColor = (level: number) => {
      switch (level) {
        case 1: return 'bg-green-500'
        case 2: return 'bg-blue-500'
        case 3: return 'bg-purple-500'
        case 4: return 'bg-red-500'
        default: return 'bg-gray-500'
      }
    }

    return (
      <Box
        className={`absolute -top-1 -right-1 w-4 h-4 ${getLevelColor(level)} rounded-full`}
      />
    )
  }

  const handleLogout = async () => {
    try {
      // Clear Redux auth state
      dispatch(clearAuth())
      navigate('/login')
    } catch (error) {
      // Force redirect to login even if logout fails
      navigate('/login')
    }
  }

  // Manual refresh function for when data needs to be refetched
  const refreshData = () => {
    setFetchedData(false)
    isFetchingRef.current = false
    clearData()
  }

  // Determine loading states
  const isLoading = !isMounted || dataLoading

  return (
    <Box className='min-h-screen bg-white'>
      {/* Show loading while fetching data */}
      {isLoading ? (
        <PageLoader />
      ) : (
        /* Main content */
        <>
          {/* Header */}
          <Box className='bg-white shadow-sm border-b border-gray-200 p-4'>
            <Box className='flex items-center justify-between'>
              <Box className='flex items-center'>
                <Image
                  src='/images/custom/nd-logo.png'
                  alt='ND Logo'
                  width={120}
                  height={40}
                  className='h-8 w-auto'
                />
              </Box>
              <Box className='flex items-center space-x-4'>
                {/* Profile Section */}
                <Box
                  className='flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded-lg -m-2'
                  onClick={() => navigate(isAuthenticated ? '/profile' : '/login')}
                >
                  <Avatar className='w-8 h-8 bg-gray-200'>
                    {isAuthenticated && profileData?.user?.profileImage ? (
                      <img
                        src={profileData.user?.profileImage}
                        alt="Profile"
                        className='w-full h-full object-cover rounded-full'
                      />
                    ) : (
                      <i className='ri-user-line text-gray-600' />
                    )}
                  </Avatar>
                  {isAuthenticated && (
                    <Typography
                      variant='body2'
                      className='font-medium text-gray-700 hover:text-blue-600'
                    >
                      {profileLoading ? 'Loading...' : (profileData?.user?.nickname || '')}
                    </Typography>
                  )}
                </Box>
                <IconButton onClick={() => navigate(isAuthenticated ? '/notifications' : '/login')}>
                  <i className='ri-notification-3-line text-xl' />
                </IconButton>
                {isAuthenticated && (
                  <IconButton onClick={handleLogout}>
                    <i className='ri-logout-box-r-line text-xl' />
                  </IconButton>
                )}
              </Box>
            </Box>
          </Box>

          {/* Show empty state if absolutely no data (no slider, no Type A, no Type B) */}
          {!dataLoading
            && (!visibleSliders || visibleSliders.length === 0)
            && (!visibleTypeA || visibleTypeA.length === 0)
            && (!visibleTypeB || visibleTypeB.length === 0) ? (
            <Box className='min-h-screen bg-gray-50 flex items-center justify-center'>
              <Box className='text-center'>
                <Typography variant='h6' className='text-gray-600 mb-2'>
                  No data available
                </Typography>
                <Typography variant='body2' className='text-gray-500'>
                  Please check your database connection and try again.
                </Typography>
              </Box>
            </Box>
          ) : (
            /* Main Content */
            <Box
              className=''
              sx={{
                paddingBottom: { xs: 'calc(1rem + env(safe-area-inset-bottom, 0px))', md: '2.5rem', lg: '3rem' },
                scrollBehavior: 'smooth',
                overflowX: 'hidden',
                '&::-webkit-scrollbar': {
                  width: '4px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#e0e0e0',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: '#bdbdbd',
                },
                // Hide scrollbar for carousel
                '& .scrollbar-hide': {
                  msOverflowStyle: 'none',
                  scrollbarWidth: 'none',
                  '&::-webkit-scrollbar': {
                    display: 'none',
                  },
                },
              }}
            >

              {/* Slideshow Section */}
              <Box className='bg-white overflow-hidden'>
                <Box
                  className='relative cursor-pointer'
                  sx={{
                    height: '490px',
                    width: '100%',
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    // Prevent navigation if user just swiped
                    if (hasSwiped) {
                      return
                    }

                    // Get the current visible slide
                    const currentSlideData = visibleSliders[currentSlide]

                    // Get the meeting ID from the slide's meetings array (first meeting)
                    if (currentSlideData && Array.isArray(currentSlideData.meetings) && currentSlideData.meetings.length > 0) {
                      const meetingId = currentSlideData.meetings[0]
                      // Ensure meetingId is valid before navigating
                      if (meetingId && (typeof meetingId === 'number' || typeof meetingId === 'string')) {
                        navigate(`/meeting/item-detail/${meetingId}`)
                      }
                    }
                  }}
                  onTouchStart={(e) => {
                    const touch = e.touches[0]
                    setTouchStart(touch.clientX)
                    setHasSwiped(false) // Reset swipe flag
                  }}
                  onTouchMove={(e) => {
                    if (!touchStart) return
                    const touch = e.touches[0]
                    const diff = touchStart - touch.clientX
                    if (Math.abs(diff) > 50) {
                      setHasSwiped(true) // Mark that a swipe occurred
                      if (diff > 0) {
                        // Swipe left - next slide
                        handleSlideChange((currentSlide + 1) % sliderData.length)
                      } else {
                        // Swipe right - previous slide
                        handleSlideChange((currentSlide - 1 + sliderData.length) % sliderData.length)
                      }
                      setTouchStart(null)
                    }
                  }}
                  onTouchEnd={() => {
                    setTouchStart(null)
                    // Reset swipe flag after a short delay to allow click detection
                    setTimeout(() => setHasSwiped(false), 100)
                  }}
                >
                  {visibleSliders.map((slide: SliderData, index: number) => (
                    <Box
                      key={slide.id}
                      className={`absolute inset-0 transition-opacity duration-500 ${index === currentSlide ? 'opacity-100' : 'opacity-0'
                        }`}
                    >
                      {slide.image ?
                        <img
                          src={slide.image}
                          alt={slide.title}
                          className='w-full h-full object-cover'
                          onError={(e) => {
                            e.currentTarget.src = '/images/custom/placeholder.jpg'
                          }}
                        /> :
                        <Box className='w-full h-full rounded bg-gray-200' />
                      }
                      {/* Gradient overlay for readability */}
                      <Box className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent' />
                      {/* Centered content and bottom profile pill */}
                      <Box className='absolute inset-0 flex flex-col items-start justify-end text-white pb-16'>
                        <Box className="max-w-[80%] mx-5">
                          <Typography
                            className="font-extrabold text-white text-[25px] mb-2 break-words leading-tight"
                            sx={{
                              // textShadow: '0 3px 12px rgba(0,0,0,0.6)',
                              wordBreak: 'break-word',
                            }}
                          >
                            {slide.title}
                          </Typography>

                          <Typography
                            className="opacity-90 text-white font-light text-[17px] mb-8 break-words leading-snug"
                            sx={{
                              textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                              wordBreak: 'break-word',
                              // textOverflow: 'ellipsis',
                              // overflow: 'hidden',
                              // whiteSpace: 'nowrap'
                            }}
                          >
                            {slide.subtitle}
                          </Typography>
                        </Box>

                        <Box className='absolute bottom-8 mb-3 border border-white/50 left-1/2 -translate-x-1/2 flex items-center text-gray-900 backdrop-blur-sm bg-white/20 rounded-full px-2 py-1 shadow-md'>
                          <Avatar className='w-6 h-6 mr-2'>
                            {slide.user.profileImage && slide.user.profileImage.trim() !== '' ? (
                              <img
                                src={slide.user.profileImage}
                                alt="Profile"
                                className='w-full h-full object-cover rounded-full'
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            ) : (
                              <i className='ri-user-line text-gray-600 text-xs' />
                            )}
                          </Avatar>
                          <Typography
                            variant='caption'
                            className='font-medium text-white cursor-pointer hover:text-blue-200 hover:underline'
                            onClick={(e) => {
                              e.stopPropagation()
                              // Use the currently visible slide instead of the mapped slide
                              const visibleSlide = visibleSliders[currentSlide]
                              const userId = visibleSlide?.user?.id
                              const currentUserId = user?.id || user?.userId || user?.uid

                              if (userId) {
                                // If it's the current user's profile, go to /profile without userId
                                const url = (currentUserId && userId === currentUserId) ? '/profile' : `/profile?userId=${userId}`
                                navigate(url)
                              }
                            }}
                          >
                            {slide.user.name}
                          </Typography>
                          {(() => {
                            const badgeDisplay = getCommunityBadgeDisplay(slide.user?.activeCommunityBadge)
                            if (badgeDisplay) {
                              return (
                                <img
                                  src={badgeDisplay.image}
                                  alt={badgeDisplay.label}
                                  className='w-4 h-4 object-contain ml-2'
                                  title={`커뮤니티 등급: ${badgeDisplay.label}`}
                                />
                              )
                            }
                            return (
                              <Box className='w-4 h-4 bg-green-200 rounded-full ml-2 flex items-center justify-center'>
                                <i className='ri-check-line text-green-500 text-[10px]' />
                              </Box>
                            )
                          })()}
                        </Box>
                      </Box>
                    </Box>
                  ))}
                  {/* Pagination dots inside image */}
                  <Box className='absolute bottom-4 left-0 right-0 flex justify-center items-center space-x-1 z-10'>
                    {sliderData.map((_: SliderData, index: number) => (
                      <Box
                        key={index}
                        className={`w-1.5 h-1.5 rounded-full transition-colors cursor-pointer ${index === currentSlide ? 'bg-white' : 'bg-white/50'
                          }`}
                        onClick={() => handleSlideChange(index)}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>

              {/* Type A Carousel Sections */}
              {visibleTypeA && visibleTypeA.length > 0 && visibleTypeA.map((typeASection: TypeAData, sectionIndex: number) => (
                <Box key={typeASection.id} className='mb-0 mt-4 mx-4'>
                  <Box className='flex justify-between items-end mb-4'>
                    <Box
                      className='cursor-pointer hover:bg-gray-50 p-2 rounded-md -m-2 relative z-10'
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        // Type A section clicked
                        // Use setTimeout to ensure this navigation takes priority
                        setTimeout(() => {
                          navigate('/feed')
                        }, 0)
                      }}
                    >
                      <Typography
                        className='font-bold text-black text-[20px] hover:text-blue-600 hover:underline'
                        sx={{
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          width: 275
                        }}
                      >
                        {typeASection.title}
                      </Typography>
                      <Typography className='text-black text-[15px]'
                        sx={{
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          width: 275
                        }}>
                        {typeASection.description}
                      </Typography>
                    </Box>
                    <Typography
                      variant='body2'
                      color='primary'
                      className='cursor-pointer hover:underline flex items-center'
                      onClick={() => navigate(`/web/home/more/${typeASection.id}`)}
                    >
                      더보기
                      <i className='ri-arrow-right-s-line text-sm ml-1' />
                    </Typography>
                  </Box>

                  {/* Carousel Container */}
                  <Box className='relative'>
                    {/* Mobile: Horizontal scroll */}
                    <Box className='md:hidden overflow-x-auto scrollbar-hide'>
                      <Box className='flex space-x-4 pb-4' style={{ width: 'max-content' }}>
                        {typeASection.meetings && typeASection.meetings.length > 0 && typeASection.meetings.map((item: MeetingData) => (
                          <Card
                            key={item.id}
                            className='flex-shrink-0 overflow-hidden transition-shadow cursor-pointer'
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/meeting/item-detail/${item.id}`)
                            }}
                            sx={{
                              width: '250px',
                              background: 'transparent',
                              boxShadow: 'none',
                              '&:hover': { boxShadow: 'none' }
                            }}
                          >
                            <Box className='relative h-[150px]'>
                              {item.image ? (
                                <CardMedia
                                  component="img"
                                  height="200"

                                  image={item.image}
                                  className="object-cover rounded-lg w-full h-full"
                                />
                              ) : (
                                <Box
                                  height="200px"
                                  className="object-cover w-full h-full bg-gray-300"
                                />
                              )}

                              {/* Gradient overlay for better text readability */}
                              <Box className='absolute inset-0 bg-gradient-to-t rounded-lg from-black/70 via-black/20 to-transparent' />

                              {/* Profile pill overlay */}
                              <Box className='absolute top-2 left-2 flex items-center bg-white/20 backdrop-blur-md rounded-full px-2 border border-white/50 py-1.5'
                                sx={{
                                  // boxShadow: '0 6px 18px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.02)'
                                }}>
                                <Avatar className='w-5 h-5 mr-1'>
                                  {item.user.profileImage && item.user.profileImage.trim() !== '' ? (
                                    <img
                                      src={item.user.profileImage}
                                      alt="Profile"
                                      className='w-full h-full object-cover rounded-full'
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                      }}
                                    />
                                  ) : (
                                    <i className='ri-user-line text-gray-600 text-xs' />
                                  )}
                                </Avatar>
                                <Typography
                                  variant='caption'
                                  className='text-white font-medium text-[10px] cursor-pointer hover:text-blue-200 hover:underline'
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const userId = (item.user as any)?.id
                                    const currentUserId = user?.id || user?.userId || user?.uid
                                    if (userId) {
                                      const url = (currentUserId && userId === currentUserId) ? '/profile' : `/profile?userId=${userId}`
                                      navigate(url)
                                    }
                                  }}
                                >
                                  {item.user.name}
                                </Typography>
                                {(() => {
                                  const badgeDisplay = getCommunityBadgeDisplay((item.user as any)?.activeCommunityBadge)
                                  if (badgeDisplay) {
                                    return (
                                      <img
                                        src={badgeDisplay.image}
                                        alt={badgeDisplay.label}
                                        className='w-4 h-4 object-contain ml-1'
                                        title={`커뮤니티 등급: ${badgeDisplay.label}`}
                                      />
                                    )
                                  }
                                  return (
                                    <Box className='w-4 h-4 bg-green-100 rounded-full ml-1 flex items-center justify-center'>
                                      <i className='ri-check-line text-green-500 text-xs' />
                                    </Box>
                                  )
                                })()}
                              </Box>

                              {/* Content overlay */}
                              <Box className='absolute bottom-0 left-0 right-0 p-3 text-white'>
                                <Typography variant='caption' className='text-white/80 mb-1 block text-xs'>
                                  {item.location} ㆍ{item.category}
                                </Typography>
                                <Typography variant='body2' className='font-medium mb-0 line-clamp-2 text-white text-sm'>
                                  {item.title}
                                </Typography>
                              </Box>

                              {/* Heart icon with like count */}
                              <Box className='absolute bottom-2 right-2 flex flex-col items-center rounded-full py-1'>
                                <IconButton
                                  onClick={(e) => handleMeetingLike(item.id, e)}
                                  className='text-white p-0'
                                  size='small'
                                  disabled={!isAuthenticated || likingMeetingId === item.id}
                                  sx={{
                                    width: 25,
                                    height: 25,
                                    cursor: isAuthenticated ? 'pointer' : 'default',
                                    '&:hover': { backgroundColor: 'transparent', opacity: isAuthenticated ? 0.8 : 1 }
                                  }}
                                >
                                  <i className={`ri-heart-${(meetingLikes[item.id]?.isLiked ?? item.isLiked) ? 'fill' : 'line'} text-[20px] text-white`} />
                                </IconButton>
                                <Typography variant='caption' className='text-white text-xs'>
                                  {meetingLikes[item.id]?.likesCount ?? item.likesCount ?? 0}
                                </Typography>
                              </Box>
                            </Box>

                            {/* Caption below image */}
                            <Box className='py-3 flex justify-start gap-2 items-center'>
                              <Typography variant='caption' className='text-gray-600 flex items-center block text-xs'>
                                <i className='ri-team-fill text-xs mr-1 text-gray-500' />
                                {item.memberType === 'participating' ? '참여중인 멤버' :
                                  item.memberType === 'applied' ? '신청한 멤버' : '모집인원'}: {item.members}명
                              </Typography>
                              <Typography variant='caption' className='text-gray-600 flex items-center  block text-xs'>
                                <i className='ri-calendar-2-line text-xs mr-1 text-gray-500' />
                                {item.date}
                              </Typography>
                            </Box>
                          </Card>
                        ))}
                      </Box>
                    </Box>

                    {/* Desktop: Carousel layout */}
                    <Box className='hidden md:block relative overflow-hidden'>
                      <Box
                        className='flex transition-transform duration-300 ease-in-out'
                        sx={{
                          transform: `translateX(-${currentCarouselIndex * 33.333}%)`,
                          gap: '16px'
                        }}
                      >
                        {typeASection.meetings && typeASection.meetings.length > 0 && typeASection.meetings.map((item: MeetingData) => (
                          <Card
                            key={item.id}
                            className='flex-shrink-0 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer'
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/meeting/item-detail/${item.id}`)
                            }}
                            sx={{
                              width: 'calc(33.333% - 10.667px)',
                              background: 'transparent',
                              boxShadow: 'none',
                              '&:hover': { boxShadow: 'none' }
                            }}
                          >
                            <Box className='relative h-[200px]'>
                              {item.image ? (
                                <CardMedia
                                  component="img"
                                  height="200"
                                  image={item.image}
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <Box
                                  height="200px"
                                  className="object-cover w-full h-full bg-gray-300 opacity-50"
                                />
                              )}


                              {/* Gradient overlay for better text readability */}
                              <Box className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent' />

                              {/* Profile pill overlay */}
                              <Box className='absolute top-3 left-3 flex items-center bg-white/20 backdrop-blur-sm rounded-full px-2 border border-white/50 py-1.5'>
                                <Avatar className='w-5 h-5 mr-2'>
                                  {item.user.profileImage && item.user.profileImage.trim() !== '' ? (
                                    <img
                                      src={item.user.profileImage}
                                      alt="Profile"
                                      className='w-full h-full object-cover rounded-full'
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                      }}
                                    />
                                  ) : (
                                    <i className='ri-user-line text-gray-600 text-xs' />
                                  )}
                                </Avatar>
                                <Typography
                                  variant='caption'
                                  className='text-white font-medium text-xs cursor-pointer hover:text-blue-200 hover:underline'
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const userId = (item.user as any)?.id
                                    const currentUserId = user?.id || user?.userId || user?.uid
                                    if (userId) {
                                      const url = (currentUserId && userId === currentUserId) ? '/profile' : `/profile?userId=${userId}`
                                      navigate(url)
                                    }
                                  }}
                                >
                                  {item.user.name}
                                </Typography>
                                {(() => {
                                  const badgeDisplay = getCommunityBadgeDisplay((item.user as any)?.activeCommunityBadge)
                                  if (badgeDisplay) {
                                    return (
                                      <img
                                        src={badgeDisplay.image}
                                        alt={badgeDisplay.label}
                                        className='w-3 h-3 object-contain ml-1.5'
                                        title={`커뮤니티 등급: ${badgeDisplay.label}`}
                                      />
                                    )
                                  }
                                  return (
                                    <Box className='w-3 h-3 bg-green-100 rounded-full ml-1.5 flex items-center justify-center'>
                                      <i className='ri-check-line text-green-500 text-xs' />
                                    </Box>
                                  )
                                })()}
                              </Box>

                              {/* Content overlay */}
                              <Box className='absolute bottom-0 left-0 right-0 p-3 text-white'>
                                <Typography variant='caption' className='text-white/80 mb-1 block text-xs'>
                                  {item.location} ㆍ{item.category}
                                </Typography>
                                <Typography variant='body2' className='font-medium mb-0 line-clamp-2 text-white text-sm'>
                                  {item.title}
                                </Typography>
                              </Box>

                              {/* Heart icon with like count */}
                              <Box className='absolute bottom-3 right-3 flex flex-col items-center bg-white/20 backdrop-blur-sm rounded-full px-2 py-1'>
                                <IconButton
                                  onClick={(e) => handleMeetingLike(item.id, e)}
                                  className='text-white p-0'
                                  size='small'
                                  disabled={!isAuthenticated || likingMeetingId === item.id}
                                  sx={{
                                    width: 20,
                                    height: 20,
                                    cursor: isAuthenticated ? 'pointer' : 'default',
                                    '&:hover': { backgroundColor: 'transparent', opacity: isAuthenticated ? 0.8 : 1 }
                                  }}
                                >
                                  <i className={`ri-heart-${(meetingLikes[item.id]?.isLiked ?? item.isLiked) ? 'fill' : 'line'} text-sm`} />
                                </IconButton>
                                <Typography variant='caption' className='text-white text-xs mt-1'>
                                  {meetingLikes[item.id]?.likesCount ?? item.likesCount ?? 0}
                                </Typography>
                              </Box>
                            </Box>

                            {/* Caption below image */}
                            <Box className='py-3 flex justify-start gap-2 items-center'>
                              <Typography variant='caption' className='text-gray-600 block text-xs'>
                                <i className='ri-group-line text-xs mr-1 text-gray-500' />
                                {item.memberType === 'participating' ? '참여중인 멤버' :
                                  item.memberType === 'applied' ? '신청한 멤버' : '모집인원'}: {item.members}명
                              </Typography>
                              <Typography variant='caption' className='text-gray-600 block text-xs mt-1'>
                                {item.date}
                              </Typography>
                            </Box>
                          </Card>
                        ))}
                      </Box>

                      {/* Desktop Navigation Arrows */}
                      <IconButton
                        className='absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 shadow-md z-10'
                        onClick={() => setCurrentCarouselIndex(Math.max(0, currentCarouselIndex - 1))}
                        disabled={currentCarouselIndex === 0}
                        sx={{
                          width: 40,
                          height: 40,
                          '&:disabled': {
                            opacity: 0.3
                          }
                        }}
                      >
                        <i className='ri-arrow-left-s-line' />
                      </IconButton>

                      <IconButton
                        className='absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 shadow-md z-10'
                        onClick={() => setCurrentCarouselIndex(Math.min(1, currentCarouselIndex + 1))}
                        disabled={currentCarouselIndex === 1}
                        sx={{
                          width: 40,
                          height: 40,
                          '&:disabled': {
                            opacity: 0.3
                          }
                        }}
                      >
                        <i className='ri-arrow-right-s-line' />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              ))}

              {/* Show message if no Type A sections */}
              {(!visibleTypeA || visibleTypeA.length === 0) && (
                <Box className='text-center py-8'>
                  <Typography variant='body1' className='text-gray-500'>
                    No Type A sections available
                  </Typography>
                </Box>
              )}

              {/* Feed Sections */}
              <Box className='grid grid-cols-1 pb-4 lg:grid-cols-3 gap-6 m-4'>
                {visibleTypeB && visibleTypeB.length > 0 && visibleTypeB.map((section: TypeBData) => (
                  <Box key={section.id} className='bg-white overflow-hidden lg:mt-0'>
                    <Box className='relative h-48'>
                      {section.image ?
                        <img
                          src={section.image}
                          alt={section.title}
                          className='w-full h-full rounded-lg object-cover'
                          onError={(e) => {
                            e.currentTarget.src = section.image
                          }}
                        /> :
                        <Box className='w-full h-full rounded bg-gray-200' />
                      }

                    </Box>
                    <Box className='py-3'>
                      <Typography className='font-bold text-[20px] text-black'>
                        {section.title}
                      </Typography>
                      <Typography className='text-black text-[15px]'>
                        {section.description}
                      </Typography>
                    </Box>
                    <Box>
                      {section.meetings && section.meetings.length > 0 && section.meetings.map((post: MeetingData) => (
                        <Box
                          key={post.id}
                          className='flex items-center py-2 border-t border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors'
                          onClick={() => navigate(`/meeting/item-detail/${post.id}`)}
                        >
                          <Box className='w-14 h-14 rounded-md mr-3 flex items-center justify-center overflow-hidden'>
                            {post.image ? (
                              <img
                                src={post.image}
                                alt={post.title}
                                className='w-full h-full object-cover'

                              />) : (
                              <Box className='w-full h-full rounded bg-gray-300' />
                            )}
                          </Box>
                          <Box className='flex-1 min-w-0'>
                            <Box className='flex items-center text-[11px] text-black mb-0.5'>
                              <span className='truncate'>
                                {post.location} ㆍ {post.category} ㆍ <span
                                  className='cursor-pointer hover:text-blue-600 hover:underline'
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const userId = (post.user as any)?.id
                                    const currentUserId = user?.id || user?.userId || user?.uid
                                    if (userId) {
                                      const url = (currentUserId && userId === currentUserId) ? '/profile' : `/profile?userId=${userId}`
                                      navigate(url)
                                    }
                                  }}
                                >
                                  {post.user.name}
                                </span>
                              </span>
                              {(() => {
                                const badgeDisplay = getCommunityBadgeDisplay((post.user as any)?.activeCommunityBadge)
                                if (badgeDisplay) {
                                  return (
                                    <img
                                      src={badgeDisplay.image}
                                      alt={badgeDisplay.label}
                                      className='w-4 h-4 object-contain ml-1'
                                      title={`커뮤니티 등급: ${badgeDisplay.label}`}
                                    />
                                  )
                                }
                                return (
                                  <Box className='w-2 h-2 bg-green-200 text-green-500 flex justify-center items-center rounded-full ml-2'>
                                    <i className='ri-check-line text-green-500 text-[6px]' />
                                  </Box>
                                )
                              })()}
                            </Box>
                            <Typography variant='body2' className='text-sm text-black font-medium truncate'>
                              {post.title}
                            </Typography>
                            <Box className='flex items-center text-[11px] text-black mt-0.5'>
                              <i className='ri-calendar-2-line text-sm mr-1' />
                              <span>{post.date}</span>
                            </Box>
                          </Box>
                          <Box className='flex flex-col items-center ml-2'>
                            <Box className='flex flex-col items-center'>
                              <IconButton
                                size='small'
                                className='text-gray-600 p-0'
                                onClick={(e) => handleMeetingLike(post.id, e)}
                                disabled={!isAuthenticated || likingMeetingId === post.id}
                                sx={{
                                  cursor: isAuthenticated ? 'pointer' : 'default',
                                  '&:hover': { opacity: isAuthenticated ? 0.8 : 1 }
                                }}
                              >
                                <i className={`ri-heart-${(meetingLikes[post.id]?.isLiked ?? post.isLiked) ? 'fill' : 'line'}`} />
                              </IconButton>
                              <Typography variant='caption' className='text-[11px] text-gray-600 mt-1'>
                                {meetingLikes[post.id]?.likesCount ?? post.likesCount ?? 0}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}


          {/* Popup */}
          {/* {isMounted && showPopup && (
            <Box className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
              <Card className='max-w-sm w-full relative'>
                <IconButton
                  className='absolute top-2 right-2'
                  onClick={handlePopupClose}
                >
                  <i className='ri-close-line' />
                </IconButton>
                <CardContent className='p-6 text-center'>
                  <Box className='w-12 h-12 bg-red-500 rounded-lg mx-auto mb-4 flex items-center justify-center'>
                    <Typography variant='h6' className='text-white font-bold'>
                      N
                    </Typography>
                  </Box>
                  <Typography variant='h6' className='font-bold mb-2'>
                    Noldam
                  </Typography>
                  <Typography variant='body2' className='text-gray-600 mb-4'>
                    다양한 놀담 모임을 시작해보세요.
                  </Typography>
                  <Button
                    variant='contained'
                    fullWidth
                    onClick={() => {
                      handlePopupClose()
                    }}
                  >
                    시작하기
                  </Button>
                </CardContent>
              </Card>
            </Box>
          )} */}
          <Footer />
        </>
      )}

      {/* Mobile Footer Navigation */}
      <FooterNavbar
        onSearchClick={openSearch}
      />
    </Box>
  )
}

export default WebHomePage
