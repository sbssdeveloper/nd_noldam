'use client'

import React from 'react'
import { Box, Typography, Card, CardContent, IconButton, Avatar, Button } from '@mui/material'
import { useRouter } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import Image from 'next/image'
import { useChat } from '@/components/layout/ChatContext'
import type { FeedItem, MeetingData } from '@/services/types/frontend'
import { FollowingActivity, InterestMeeting, TrendingPost } from '@/services/types/frontend'
import FeedApiService from '@/services/feedApi'
import PageLoader from '@/components/PageLoader'
import { getCommunityBadgeDisplay } from '@/utils/badgeUtils'

const FeedPage = () => {
  const router = useRouter()
  const { navigate } = useNavigation()
  const { openChat, openSearch } = useChat()

  const [followingActivity, setFollowingActivity] = React.useState<FollowingActivity[]>([])
  const [interestMeetings, setInterestMeetings] = React.useState<InterestMeeting[]>([])
  const [trendingPosts, setTrendingPosts] = React.useState<TrendingPost[]>([])
  const [loading, setLoading] = React.useState(true)
  const [activityNames, setActivityNames] = React.useState<Record<string, string>>({})
  const [categoryNames, setCategoryNames] = React.useState<Record<string, string>>({})

  // Fetch all feed data
  React.useEffect(() => {
    const fetchFeedData = async () => {
      try {
        setLoading(true)

        // Fetch activities and categories for mapping
        const [activitiesRes, categoriesRes] = await Promise.all([
          fetch('/api/activities'),
          fetch('/api/categories')
        ])

        if (activitiesRes.ok) {
          const activitiesResponse = await activitiesRes.json()
          if (activitiesResponse.success && activitiesResponse.data) {
            const activityMap: Record<string, string> = {}
            activitiesResponse.data.forEach((activity: any) => {
              activityMap[activity.id.toString()] = activity.name
            })
            setActivityNames(activityMap)
          }
        }

        if (categoriesRes.ok) {
          const categoriesResponse = await categoriesRes.json()
          if (categoriesResponse.success && categoriesResponse.data) {
            const categoryMap: Record<string, string> = {}
            categoriesResponse.data.forEach((category: any) => {
              categoryMap[category.id.toString()] = category.name
            })
            setCategoryNames(categoryMap)
          }
        }

        // Fetch feed data using ApiService
        const [followingRes, interestRes, trendingRes] = await Promise.all([
          FeedApiService.getFollowingActivity(),
          FeedApiService.getInterestMeetings(),
          FeedApiService.getTrendingPosts()
        ])

        if (followingRes.success && followingRes.data) {
          setFollowingActivity(Array.isArray(followingRes.data) ? followingRes.data : [])
        }

        if (interestRes.success && interestRes.data) {
          setInterestMeetings(Array.isArray(interestRes.data) ? interestRes.data : [])
        }

        if (trendingRes.success && trendingRes.data) {
          setTrendingPosts(Array.isArray(trendingRes.data) ? trendingRes.data : [])
        }

        setLoading(false)
      } catch (error) {
        // Error fetching feed data
        setLoading(false)
      }
    }

    fetchFeedData()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear().toString().slice(2)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const period = hours >= 12 ? '오후' : '오전'
    const displayHours = hours % 12 || 12

    return `${year}.${month}.${day} (${['일', '월', '화', '수', '목', '금', '토'][date.getDay()]}) ${period} ${displayHours}:${String(minutes).padStart(2, '0')}`
  }

  const getCategoryName = (categoryId: string) => {
    return categoryNames[categoryId] || categoryId
  }

  const getActivityName = (activityId: string) => {
    return activityNames[activityId] || activityId
  }

  // Helper to extract image and text from content JSON array
  const extractFromContent = (content: string | null) => {
    if (!content) return { imageUrl: null, text: '' }

    try {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) {
        const imageItem = parsed.find((item: any) => item.type === 'image')
        const textItems = parsed.filter((item: any) => item.type === 'text')
        const text = textItems.map((item: any) => item.content).join(' ')
        return {
          imageUrl: imageItem?.url || null,
          text: text || ''
        }
      }
    } catch (e) {
      // If not JSON, treat as plain text or HTML
      return {
        imageUrl: null,
        text: content.replace(/<[^>]*>/g, '')
      }
    }
    return { imageUrl: null, text: '' }
  }

  if (loading) {
    return <PageLoader />
  }

  return (
    <Box className="min-h-screen bg-white pb-28 md:pb-8">
      {/* Header */}
      <Box className="pt-8 pb-6 px-4">
        {/* Logo */}
        <Box className="mx-auto mb-4 flex items-center justify-center">
          <svg width="41" height="26" viewBox="0 0 41 26" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.8628 24.2599V1.74008C17.8628 0.779577 18.6367 0 19.5901 0H27.5954C35.5452 0 40.5 4.88498 40.5 13C40.5 21.115 35.5452 26 27.6667 26H19.5901C18.6367 26 17.8628 25.2204 17.8628 24.2599ZM27.4158 20.1811C31.4092 20.1811 33.6542 18.4943 33.6542 13C33.6542 7.50573 31.4092 5.81887 27.2389 5.81887H26.3646C25.4112 5.81887 24.6373 6.59844 24.6373 7.55894V18.4437C24.6373 19.4042 25.4112 20.1838 26.3646 20.1838H27.4185L27.4158 20.1811ZM16.463 15.07L15.5914 13.7822L6.92588 0.968484C6.51651 0.364514 5.83774 0.00266327 5.11142 0.00266327H2.44388C1.36893 0.00266327 0.5 0.880679 0.5 1.96091V24.0418C0.5 25.1246 1.37157 26 2.44388 26H5.32536C6.4003 26 7.26923 25.122 7.26923 24.0418V15.2722C7.26923 15.2722 7.58353 12.9255 9.34516 14.5272L16.3706 24.0098C16.566 24.2732 16.9807 24.1349 16.9807 23.805V16.7702C16.9807 16.1635 16.7984 15.5702 16.4604 15.07H16.463Z" fill="url(#paint0_linear_2014_99)" />
            <defs>
              <linearGradient id="paint0_linear_2014_99" x1="32.6637" y1="-2.15247" x2="4.17148" y2="26.1307" gradientUnits="userSpaceOnUse">
                <stop stopColor="#E63865" stopOpacity="1" />
                <stop offset="1" stopColor="#EB6756" stopOpacity="1" />
              </linearGradient>
            </defs>
          </svg>
        </Box>

        {/* Title */}
        {/* <Typography variant="h5" className="font-bold text-black mb-2">
          최근 친구가 진행한 프로그램
        </Typography> */}

        {/* Subtitle */}
        {/* <Typography variant="body2" className="text-gray-600">
          모임에 참여하거나, 수업을 수강해보세요.
        </Typography> */}

      </Box>
      {followingActivity.length > 0 && (() => {
        const activity = followingActivity[0]
        const displayUser = activity.activityType === 'created' ? activity.host : activity.participant
        const actionText = activity.activityType === 'created' ? '개설한 모임' : '참여한 모임'

        return (
          <Box className="mb-6 px-4 section-1">
            <Card
              className="relative overflow-hidden rounded-xl cursor-pointer"
              sx={{
                width: '100%',
                height: '240px',
                backgroundImage: activity.meetingBackground
                  && `url(${activity.meetingBackground})`,
                backgroundColor: activity.meetingBackground
                  ? 'transparent'
                  : 'gray',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
              onClick={() => navigate(`/meeting/item-detail/${activity.meetingId}`)}
            >
              <CardContent className="p-0 h-full relative">
                {/* Dark overlay */}
                <Box className="absolute inset-0 bg-black/40" />

                {/* User info - positioned higher */}
                {displayUser && (
                  <Box className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                    <Box
                      className="flex items-center border-2 rounded-full px-2 py-1 bg-white/20 backdrop-blur-md border-white/50 cursor-pointer"
                      onClick={e => {
                        e.stopPropagation()
                        if (!displayUser?.id) return
                        navigate(`/profile?userId=${displayUser.id}`)
                      }}
                    >
                      {displayUser.profileImage ? (
                        <Avatar
                          src={displayUser.profileImage}
                          className="w-4 h-4 mr-1"
                        />
                      ) : (
                        <i className="ri-user-line text-white text-xs" />
                      )}

                      <Typography className="font-medium text-white" fontSize={10}>
                        {displayUser.nickname}
                      </Typography>
                      {(() => {
                        const badgeDisplay = getCommunityBadgeDisplay(displayUser.activeCommunityBadge)
                        if (!badgeDisplay) return null
                        return (
                          <img
                            src={badgeDisplay.image}
                            alt={badgeDisplay.label}
                            className="w-3 h-3 object-contain ml-2"
                            title={`커뮤니티 등급: ${badgeDisplay.label}`}
                          />
                        )
                      })()}
                    </Box>

                  </Box>
                )}

                {/* Meeting details - positioned at bottom with proper spacing */}
                <Box className="absolute bottom-0 left-0 right-0 p-4 z-10">
                  {/* Program title */}
                  <Typography variant="h5" className="font-bold text-white mb-2 line-clamp-2">
                    {activity.meetingName}
                  </Typography>

                  {/* Program details */}
                  <Typography className="text-white/90 mb-1" fontSize={11}>
                    {formatDate(activity.meetingTime)}
                  </Typography>
                  <Typography className="text-white/90 mb-1" fontSize={11}>
                    참여 인원: {activity.participantCount}명 / {activity.maxParticipants}명
                  </Typography>

                  {/* Activity text */}
                  {displayUser && (
                    <Typography className="text-white/90" fontSize={11}>
                      {displayUser.nickname}님이 {actionText}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        )
      })()}

      {interestMeetings.length > 0 && (() => {
        const meeting = interestMeetings[0]
        const meetingDate = new Date(meeting.meetingTime)
        const now = new Date()
        const isToday = meetingDate.toDateString() === now.toDateString()
        const timeStr = `${meetingDate.getHours()}:${String(meetingDate.getMinutes()).padStart(2, '0')}`

        return (
          <Box className="mb-6 px-4 section-2">
            <Box className="mb-4">
              <Typography variant="h5" className="font-bold text-black">
                추천
              </Typography>
              <Typography variant="body2" className="text-gray-600 mt-1">
                관심 카테고리와 일치하는 모임
              </Typography>
            </Box>

            <Card
              className="relative overflow-hidden rounded-xl cursor-pointer"
              sx={{
                width: '100%',
                height: '300px',
                backgroundImage: meeting.meetingBackground
                  && `url(${meeting.meetingBackground})`,
                backgroundColor: meeting.meetingBackground
                  ? 'transparent'
                  : 'gray',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
              onClick={() => navigate(`/meeting/item-detail/${meeting.id}`)}
            >
              <CardContent className="p-0 h-full relative">
                {/* Dark overlay */}
                <Box className="absolute inset-0 bg-black/40" />

                {/* Time indicator */}
                {isToday && (
                  <Box className="absolute top-4 left-4 z-10">
                    <Box className="bg-white/20 backdrop-blur-sm border-2 border-white/50 rounded-full px-3 py-1 flex items-center">
                      <i className="ri-time-line text-white text-sm mr-1" />
                      <Typography className="text-white font-medium" fontSize={10}>
                        오늘, {timeStr}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* User info */}
                <Box className={`absolute ${isToday ? 'top-16' : 'top-4'} left-4 right-4 flex items-center justify-between z-10`}>
                  <Box
                    className="flex items-center border-2 rounded-full px-2 py-1 bg-white/20 backdrop-blur-md border-white/50 cursor-pointer"
                    onClick={e => {
                      e.stopPropagation()
                      if (!meeting.user?.id) return
                      navigate(`/profile?userId=${meeting.user.id}`)
                    }}
                  >

                    {meeting.user?.profileImage ? (
                      <Avatar
                        src={meeting.user?.profileImage || undefined}
                        className="w-4 h-4 mr-1"
                      />
                    ) : (
                      <i className="ri-user-line text-white text-xs" />
                    )}
                    <Typography className="font-medium text-white" fontSize={10}>
                      {meeting.user?.nickname}
                    </Typography>
                    {(() => {
                      const badgeDisplay = getCommunityBadgeDisplay(meeting.user?.activeCommunityBadge)
                      if (!badgeDisplay) return null
                      return (
                        <img
                          src={badgeDisplay.image}
                          alt={badgeDisplay.label}
                          className="w-3 h-3 object-contain ml-2"
                          title={`커뮤니티 등급: ${badgeDisplay.label}`}
                        />
                      )
                    })()}
                  </Box>

                </Box>

                {/* Meeting details - positioned at bottom with proper spacing */}
                <Box className="absolute bottom-0 left-0 right-0 p-4 z-10">
                  {/* Program title */}
                  <Typography variant="h5" className="font-bold text-white mb-2 line-clamp-2">
                    {meeting.meetingName}
                  </Typography>

                  {/* Program description */}
                  <Typography className="text-white/90 mb-1" fontSize={11}>
                    {formatDate(meeting.meetingTime)}
                  </Typography>
                  <Typography className="text-white/90 mb-1" fontSize={11}>
                    참여 인원: {meeting.participantCount}명 / {meeting.maxParticipants}명
                  </Typography>

                  {/* Action buttons */}
                  <Box className="flex justify-start space-x-2">
                    <Button
                      variant="outlined"
                      size="small"
                      className="bg-white/20 rounded-full border-white/50 text-white hover:bg-white/30"
                      sx={{
                        textTransform: 'none',
                        fontSize: '11px',
                        padding: '4px 12px',
                        minWidth: 'auto'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/meeting/item-detail/${meeting.id}?booking=1`)
                      }}
                    >
                      참여하기
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      className="text-white border-0 hover:bg-white/10"
                      sx={{
                        textTransform: 'none',
                        fontSize: '11px',
                        padding: '4px 12px',
                        minWidth: 'auto'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/meeting/item-detail/${meeting.id}`)
                      }}
                    >
                      자세히 보기
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )
      })()}

      {trendingPosts.length > 0 && (
        <Box className="px-4 mt-8">
          <Box
            className='flex items-center cursor-pointer'
            onClick={() => navigate('/feed/trending-feeds/lifestyle')}
          >
            <Typography variant='h6' className='font-bold mb-4 flex items-center'>
              Trending <span className="text-gray-400 ml-1">Posts</span> <i className='ri-arrow-right-s-line text-gray-500 ' />
            </Typography>
          </Box>

          {/* Trending Slider */}
          <Box
            className='overflow-x-auto section-3'
            sx={{
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
          >
            <Box className='flex space-x-4 pb-4 ' style={{ width: 'max-content' }}>
              {trendingPosts.map((post) => {
                const { imageUrl, text } = extractFromContent(post.content)

                return (
                  <Box
                    key={post.id}
                    className='flex-shrink-0 rounded-lg shadow-sm overflow-hidden cursor-pointer'
                    sx={{ width: '320px' }}
                    onClick={() => navigate(`/post/${post.id}`)}
                  >
                    <Box className='relative' sx={{ height: '240px' }}>
                      {imageUrl || post.imageUrl ? (
                        <img
                          src={imageUrl || post.imageUrl}
                          alt='Post'
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        <Box className='w-full h-full object-cover bg-gray-300 bg-opacity-50'></Box>
                      )}

                      {/* Dark overlay */}
                      <Box className='absolute inset-0 bg-black/40' />

                      {/* User profile overlay */}
                      <Box className='absolute top-4 left-4 right-4 flex items-center justify-between z-10'>
                        <Box
                          className='flex items-center bg-white/20 backdrop-blur-sm border-2 border-white/50 rounded-full px-2 py-1 cursor-pointer'
                          onClick={e => {
                            e.stopPropagation()
                            if (!post.user?.id) return
                            navigate(`/profile?userId=${post.user.id}`)
                          }}
                        >

                          {post.user?.profileImage ? (
                            <Avatar
                              src={post.user?.profileImage || undefined}
                              className='w-4 h-4 mr-1'
                            />
                          ) : (
                            <i className="ri-user-line text-white text-xs" />
                          )}


                          <Typography className='text-white font-medium' fontSize={10}>
                            {post.user?.nickname || '익명'}
                          </Typography>
                          {(() => {
                            const badgeDisplay = getCommunityBadgeDisplay(post.user?.activeCommunityBadge)
                            if (!badgeDisplay) return null
                            return (
                              <img
                                src={badgeDisplay.image}
                                alt={badgeDisplay.label}
                                className='w-3 h-3 object-contain ml-2'
                                title={`커뮤니티 등급: ${badgeDisplay.label}`}
                              />
                            )
                          })()}
                        </Box>
                        {/* {post.user?.id && (
                          <FollowButton
                            userId={post.user.id}
                            userNickname={post.user.nickname}
                            size="small"
                          />
                        )} */}
                      </Box>

                      {/* Text overlay on image */}
                      <Box className='absolute bottom-0 left-0 right-0 p-4 z-10'>
                        {text && (
                          <Typography className='text-white/80 line-clamp-2 mb-2' fontSize={11}>
                            {text}
                          </Typography>
                        )}

                        {/* Heart icon inline with text */}
                        <Box className='flex items-center'>
                          <i className='ri-heart-line text-white text-sm mr-1' />
                          <Typography className='text-white' fontSize={11}>
                            {post.likesCount}
                          </Typography>
                          <Box className='mx-2 text-white/50'>·</Box>
                          <i className='ri-chat-1-line text-white text-sm mr-1' />
                          <Typography className='text-white' fontSize={11}>
                            {post.commentsCount}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                )
              })}
            </Box>
          </Box>
        </Box>
      )}

    </Box>
  )
}

export default FeedPage
