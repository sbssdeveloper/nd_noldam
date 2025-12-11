'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Box, IconButton, TextField, Typography, Tabs, Tab, Select, MenuItem, CircularProgress } from '@mui/material'
import PageLoader from '@/components/PageLoader'
import { useRouter } from 'next/navigation'
import { getCommunityBadgeDisplay } from '@/utils/badgeUtils'
import { useNavigation } from '@/contexts/NavigationContext'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  searchMeetings,
  searchPosts,
  searchUsers,
  setQuery as setSearchQuery,
  setActiveTab as setSearchTab,
  setFilters,
  clearSearch,
  clearResults,
  fetchGenres
} from '@/store/slices/searchSlice'
import { fetchCategories } from '@/store/slices/authSlice'
import { formatDistanceToNow } from 'date-fns'
import FollowButton from '@/components/FollowButton'

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

const WebSearchPage = () => {
  const router = useRouter()
  const { navigate } = useNavigation()
  const dispatch = useAppDispatch()

  // Local state for input (not debounced)
  const [inputQuery, setInputQuery] = useState('')
  const [searchMode, setSearchMode] = useState(false) // Track if search mode is active

  // Redux state
  const {
    query: reduxQuery,
    activeTab,
    filters,
    meetingResults,
    postResults,
    userResults,
    genres,
    genresLoading,
    genresError,
    loading,
    error
  } = useAppSelector((state) => state.searchReducer)


  const { categories, categoriesLoading, user } = useAppSelector((state) => state.authReducer)

  // Debounced query for API calls
  const debouncedQuery = useDebounce(inputQuery, 500)

  // Local filter states
  const [filterCategory, setFilterCategory] = useState(filters.category || '')
  const [filterRound, setFilterRound] = useState(filters.round || 'all')
  const [filterSort, setFilterSort] = useState(filters.sort || 'latest')

  // Safely access categories with default empty array
  const categoriesList = categories || []

  // Load categories and genres on mount
  useEffect(() => {
    if (categoriesList.length === 0) {
      dispatch(fetchCategories())
    }
    if (genres.length === 0) {
      dispatch(fetchGenres())
    }
  }, [dispatch, categoriesList.length, genres.length])

  // Handle category click from initial screen
  const handleCategoryClick = useCallback((categoryId: string, categoryName: string) => {
    // Don't set search query, just filter by category
    setInputQuery('') // Keep search empty
    dispatch(setSearchQuery(''))
    dispatch(setSearchTab(0)) // Select meetings tab
    setFilterCategory(categoryId)
    dispatch(setFilters({ category: categoryId }))
    setSearchMode(true) // Activate search mode

    // Trigger search with category filter only (no text query)
    dispatch(searchMeetings({
      query: '', // Empty query
      filters: {
        category: categoryId,
        round: filterRound as 'all' | 'this_week' | 'this_month',
        sort: filterSort as 'latest' | 'popular'
      }
    }))
  }, [dispatch, filterRound, filterSort])

  // Trigger search when in search mode - only if there's a query
  useEffect(() => {
    if (!searchMode) return // Only run when in search mode

    const hasQuery = debouncedQuery.trim().length > 0

    // Don't search if there's no query
    if (!hasQuery) {
      dispatch(clearResults())
      return
    }

    // Search based on active tab (only if query exists)
    if (activeTab === 0) {
      dispatch(searchMeetings({
        query: debouncedQuery,
        filters: {
          category: filterCategory || undefined,
          round: filterRound as 'all' | 'this_week' | 'this_month',
          sort: filterSort as 'latest' | 'popular'
        }
      }))
    } else if (activeTab === 1) {
      dispatch(searchPosts({
        query: debouncedQuery,
        sort: filterSort
      }))
    } else if (activeTab === 2) {
      dispatch(searchUsers({ query: debouncedQuery, categoryId: filterCategory }))
    }
  }, [searchMode, debouncedQuery, activeTab, filterCategory, filterRound, filterSort, dispatch])

  // Handle tab change
  const handleTabChange = (_: any, newTab: number) => {
    dispatch(setSearchTab(newTab as 0 | 1 | 2))
    // Tab change will trigger the useEffect above which handles the search
  }

  // Handle filter changes
  const handleCategoryFilter = (value: string) => {
    setFilterCategory(value)
    dispatch(setFilters({ category: value || undefined }))

    // Always trigger search when category changes (stay in search mode)
    // value = '' means "전체" (show all)
    dispatch(searchMeetings({
      query: inputQuery,
      filters: {
        category: value || undefined,
        round: filterRound as 'all' | 'this_week' | 'this_month',
        sort: filterSort as 'latest' | 'popular'
      }
    }))

    // Also update users tab if it's active
    if (activeTab === 2) {
      dispatch(searchUsers({ query: inputQuery, categoryId: value || undefined }))
    }
  }

  const handleRoundFilter = (value: string) => {
    setFilterRound(value)
    dispatch(setFilters({ round: value as 'all' | 'this_week' | 'this_month' }))
    if (inputQuery.trim()) {
      dispatch(searchMeetings({
        query: inputQuery,
        filters: {
          category: filterCategory || undefined,
          round: value as 'all' | 'this_week' | 'this_month',
          sort: filterSort as 'latest' | 'popular'
        }
      }))
    }
  }

  const handleSortFilter = (value: string) => {
    setFilterSort(value)
    dispatch(setFilters({ sort: value as 'latest' | 'popular' | 'comments' }))

    if (inputQuery.trim()) {
      if (activeTab === 0) {
        dispatch(searchMeetings({
          query: inputQuery,
          filters: {
            category: filterCategory || undefined,
            round: filterRound as 'all' | 'this_week' | 'this_month',
            sort: value as 'latest' | 'popular'
          }
        }))
      } else if (activeTab === 1) {
        dispatch(searchPosts({ query: inputQuery, sort: value }))
      }
    }
  }

  // Navigate to meeting detail
  const handleMeetingClick = (meetingId: number, meeting?: any) => {
    // Check if current user is the meeting owner/host
    const isOwner = user && meeting && (meeting.userId === user.id || meeting.user?.id === user.id)

    // Route to appropriate page based on ownership
    if (isOwner) {
      navigate(`/meeting/item-detail-host/${meetingId}`)
    } else {
      navigate(`/meeting/item-detail/${meetingId}`)
    }
  }

  // Navigate to post detail
  const handlePostClick = (postId: number) => {
    navigate(`/post/${postId}`)
  }

  // Navigate to user profile
  const handleUserClick = (userId: number) => {
    navigate(`/profile?userId=${userId}`)
  }

  // Format date helper
  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      return formatDistanceToNow(dateObj, { addSuffix: true })
    } catch {
      return ''
    }
  }

  return (
    <Box className='min-h-screen bg-white pb-24'>
      {/* Header */}
      <Box className='fixed top-0 left-0 right-0 bg-white z-20 pt-4'>
        <Box className='flex items-center justify-between px-2 py-3'>
          <Box className='flex items-center w-full'>
            {searchMode && (
              <IconButton
                onClick={() => {
                  setSearchMode(false)
                  setInputQuery('')
                  setFilterCategory('')
                  dispatch(clearSearch())
                }}
                className='mr-1 p-0'
              >
                <i className='ri-arrow-left-s-line text-2xl' />
              </IconButton>
            )}
            <TextField
              fullWidth
              placeholder={searchMode ? 'Search_result' : "'모임이름', '닉네임', '동탄 1동'과 같이 검색해보세요."}
              size='small'
              value={inputQuery}

              onChange={(e) => setInputQuery(e.target.value)}
              onFocus={() => {
                // Activate search mode when user clicks search box
                if (!searchMode) {
                  setSearchMode(true)
                }
              }}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  paddingLeft: '8px',
                  borderRadius: '12px',
                  backgroundColor: '#7878801f',

                  '& fieldset': {
                    borderColor: searchMode ? '#D1D5DB' : 'transparent', // gray-300
                  },

                  '&:hover fieldset': {
                    borderColor: searchMode ? '#D1D5DB' : 'transparent',
                  },

                  '&.Mui-focused fieldset': {
                    borderColor: searchMode ? '#D1D5DB' : 'transparent',
                  }
                }
              }}
              InputProps={{
                startAdornment: (
                  <i className="ri-search-line mr-2 text-gray-500" />
                ),
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Content */}
      {!searchMode && (
        <Box className='pt-24 px-3'>
          {/* Single loader for entire page */}
          {(categoriesLoading || genresLoading) ? (
            <PageLoader />
          ) : (
            <>
              {/* Categories */}
              <Typography className='text-gray-800 font-bold mb-2 text-[22px]'>카테고리</Typography>
              <Box className="flex overflow-x-auto space-x-3 pb-2">
                {categoriesList.length > 0 &&
                  categoriesList.map((category: any) => (
                    <Box
                      key={category.id}
                      className="rounded-[16px] flex flex-col justify-start items-center cursor-pointer hover:opacity-80 h-[151px] bg-[#D9D9D9]"
                      sx={{
                        width: '112px',
                        flex: '0 0 auto',   // 🔥 THIS IS THE FIX
                      }}
                      onClick={() => handleCategoryClick(category.id.toString(), category.name)}
                    >
                      {/* IMAGE FIXED */}
                      <Box className="w-full h-[108px] rounded-t-[16px] overflow-hidden">
                        {category.image ? (
                          <img
                            src={category.image}
                            alt={category.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Box className="w-full h-full bg-gray-300" />
                        )}
                      </Box>

                      {/* TITLE */}
                      <Box className='p-1 '>
                        <Typography className="text-black text-[12px] font-semibold pt-2">
                          {category.name}
                        </Typography>
                      </Box>
                      {/*  */}
                    </Box>
                  ))}
              </Box>



              {/* Explore - Dynamic genres */}
              <Typography className='text-gray-800 font-bold mt-4 mb-2 text-[22px]'>둘러보기</Typography>
              <Box className='grid grid-cols-2 gap-3'>
                {genres.length > 0 ? (
                  // Dynamic genres
                  genres.map((genre: any) => (
                    <Box
                      key={genre.id}
                      className='h-24 bg-cover bg-center rounded-[16px] flex items-end p-2'
                      style={{
                        backgroundImage: genre.image ? `url(${genre.image})` : 'none',
                        backgroundColor: !genre.image ? '#D1D5DB' : undefined
                      }}
                    >
                      <Typography variant='caption' className='text-white font-medium text-[17px]'>
                        {genre.name}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  // Fallback when no genres available
                  <Box className='col-span-2 flex justify-center py-8 text-gray-500'>
                    <Typography>장르를 불러올 수 없습니다</Typography>
                  </Box>
                )}
              </Box>
            </>
          )}
        </Box>
      )}

      {searchMode && (
        <Box className='pt-16'>
          {/* Tabs */}
          <Box className='px-3'>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant='fullWidth'
              TabIndicatorProps={{ style: { backgroundColor: '#111827', height: 2, borderRadius: 1 } }}
              sx={{
                minHeight: 40,
                '& .MuiTabs-flexContainer': {
                  alignItems: 'center'
                },
                '& .MuiTab-root': {
                  minHeight: 40,
                  textTransform: 'none',
                  fontSize: 14,
                  flex: 1,
                  padding: '8px 0',
                  color: '#9CA3AF'
                },
                '& .MuiTab-root.Mui-selected': {
                  color: '#111827',
                  fontWeight: 600
                }
              }}
            >
              <Tab label='모임' />
              <Tab label='게시물' />
              <Tab label='유저' />
            </Tabs>
          </Box>

          {/* Filters row - only for first tab (모임) */}
          {activeTab === 0 && (
            <Box className='px-3 py-5 flex items-center gap-2 text-gray-600'>
              <Select
                value={filterCategory}
                onChange={(e) => handleCategoryFilter(e.target.value as string)}
                size='small'
                displayEmpty
                startAdornment={<i className='ri-layout-grid-fill' />}
                variant='outlined'
                sx={{
                  backgroundColor: '#F3F4F6',
                  borderRadius: '5px',
                  '& fieldset': { border: 'none' },
                  flex: 1,
                  minWidth: 0,
                  '.MuiSelect-select': {
                    paddingY: 0.5,
                    paddingX: 1.5,
                    fontSize: 10,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }
                }}
              >
                <MenuItem value=''>전체</MenuItem>
                {categoriesList.map((cat: any) => (
                  <MenuItem key={cat.id} value={cat.id.toString()}>{cat.name}</MenuItem>
                ))}
              </Select>

              <Select
                value={filterRound}
                onChange={(e) => handleRoundFilter(e.target.value as string)}
                size='small'
                displayEmpty
                startAdornment={<i className='ri-compass-3-line' />}
                variant='outlined'
                sx={{
                  backgroundColor: '#F3F4F6',
                  borderRadius: '5px',
                  '& fieldset': { border: 'none' },
                  flex: 1,
                  minWidth: 0,
                  '.MuiSelect-select': { paddingY: 0.5, paddingX: 1.5, fontSize: 10 }
                }}
              >
                <MenuItem value='all'>회차 전체</MenuItem>
                <MenuItem value='this_week'>이번주</MenuItem>
                <MenuItem value='this_month'>이번달</MenuItem>
              </Select>

              <Select
                value={filterSort}
                onChange={(e) => handleSortFilter(e.target.value as string)}
                size='small'
                displayEmpty
                startAdornment={<i className='ri-arrow-up-down-line' />}
                variant='outlined'
                sx={{
                  backgroundColor: '#F3F4F6',
                  borderRadius: '5px',
                  '& fieldset': { border: 'none' },
                  flex: 1,
                  minWidth: 0,
                  '.MuiSelect-select': { paddingY: 0.5, paddingX: 1.5, fontSize: 10 }
                }}
              >
                <MenuItem value='latest'>최신순</MenuItem>
                <MenuItem value='popular'>인기순</MenuItem>
              </Select>
            </Box>
          )}

          {/* Results list (모임) */}
          {activeTab === 0 && (
            <Box className='px-3 space-y-4'>
              {loading.meetings && (
                <Box className='flex justify-center py-8'>
                  <CircularProgress size={32} />
                </Box>
              )}

              {!loading.meetings && (!meetingResults || meetingResults.length === 0) && (
                <Box className='text-center py-8 text-gray-500'>
                  검색 결과가 없습니다
                </Box>
              )}

              {!loading.meetings && meetingResults && meetingResults.map((meeting: any) => (
                <Box
                  key={meeting.id}
                  className='flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg'
                  onClick={() => handleMeetingClick(meeting.id, meeting)}
                >
                  <Box
                    className='w-10 h-10 rounded-md bg-cover bg-center'
                    style={{
                      backgroundImage: meeting.meetingBackground ? `url(${meeting.meetingBackground})` : 'none',
                      backgroundColor: !meeting.meetingBackground ? '#D1D5DB' : undefined
                    }}
                  />
                  <Box className='flex-1'>
                    <Box className='text-xs flex items-center gap-1 text-gray-700'>
                      <span>{meeting.detailedAddress || meeting.roadNameAddress || meeting.user.city || meeting.user.province} · {meeting.categories[0] || ''}</span>
                      <button
                        type='button'
                        className='text-blue-600 hover:underline cursor-pointer bg-transparent border-none p-0'
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUserClick(meeting.user.id)
                        }}
                      >
                        {meeting.user.nickname}
                      </button>
                      {(() => {
                        const badgeDisplay = getCommunityBadgeDisplay(meeting.user.activeCommunityBadge)
                        if (!badgeDisplay) return null
                        return (
                          <img
                            src={badgeDisplay.image}
                            alt={badgeDisplay.label}
                            width={20}
                            height={20}
                            title={`커뮤니티 등급: ${badgeDisplay.label}`}
                          />
                        )
                      })()}
                    </Box>
                    <Box className='text-xs text-gray-700 mt-1'>{meeting.meetingName}</Box>
                    <Box className='text-[10px] text-gray-500 mt-0.5'>
                      참여자 {meeting.participantCount} · 좋아요 {meeting.likeCount}
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {/* Posts list (게시물) */}
          {activeTab === 1 && (
            <>
              {/* Single filter (최신순) */}
              <Box className='px-3 py-5 flex items-center gap-2'>
                <Select
                  value={filterSort}
                  onChange={(e) => handleSortFilter(e.target.value as string)}
                  size='small'
                  displayEmpty
                  startAdornment={<i className='ri-arrow-up-down-line' />}
                  variant='outlined'
                  sx={{
                    backgroundColor: '#F3F4F6',
                    borderRadius: '5px',
                    '& fieldset': { border: 'none' },
                    '.MuiSelect-select': { paddingY: 0.5, paddingX: 1.5, fontSize: 12 }
                  }}
                >
                  <MenuItem value='latest'>최신순</MenuItem>
                  <MenuItem value='popular'>인기순</MenuItem>
                  <MenuItem value='comments'>댓글순</MenuItem>
                </Select>
              </Box>

              {/* Posts list */}
              <Box className='px-3 space-y-6'>
                {loading.posts && (
                  <Box className='flex justify-center py-8'>
                    <CircularProgress size={32} />
                  </Box>
                )}

                {!loading.posts && (!postResults || postResults.length === 0) && (
                  <Box className='text-center py-8 text-gray-500'>
                    검색 결과가 없습니다
                  </Box>
                )}

                {!loading.posts && postResults && postResults.map((post: any) => (
                  <Box
                    key={post.id}
                    className='space-y-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg'
                    onClick={() => handlePostClick(post.id)}
                  >
                    {/* Header */}
                    <Box className='flex items-start justify-between px-1'>
                      <Box className='flex items-center gap-2'>
                        <Box
                          className='w-9 h-9 rounded-full bg-cover bg-center cursor-pointer'
                          style={{
                            backgroundImage: post.user.profileImage ? `url(${post.user.profileImage})` : 'none',
                            backgroundColor: !post.user.profileImage ? '#D1D5DB' : undefined
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUserClick(post.user.id)
                          }}
                        />
                        <Box>
                          <Box className='text-[14px] text-gray-900 flex items-center gap-1'>
                            <button
                              type='button'
                              className='text-left text-gray-900 font-medium hover:underline cursor-pointer bg-transparent border-none p-0'
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUserClick(post.user.id)
                              }}
                            >
                              {post.user.nickname}
                            </button>
                            {(() => {
                              const badgeDisplay = getCommunityBadgeDisplay(post.user.activeCommunityBadge)
                              if (!badgeDisplay) return null
                              return (
                                <img
                                  src={badgeDisplay.image}
                                  alt={badgeDisplay.label}
                                  width={20}
                                  height={20}
                                  title={`커뮤니티 등급: ${badgeDisplay.label}`}
                                />
                              )
                            })()}
                            <FollowButton
                              userId={post.user.id}
                              userNickname={post.user.nickname}
                              size="small"
                              isFollowing={post.user.isFollowing ?? false}
                            />
                          </Box>
                          <Box className='text-[14px] text-blue-600 leading-tight'>Club_name</Box>
                        </Box>
                      </Box>
                      <Box className='text-[12px] text-gray-600'>{formatDate(post.createdAt)}</Box>
                    </Box>

                    {/* Title */}
                    {post.title && (
                      <Box className='px-1'>
                        <Typography className='text-[15px] font-medium text-gray-900 line-clamp-1'>
                          {post.title}
                        </Typography>
                      </Box>
                    )}

                    {/* Content */}
                    {post.content && (
                      <Box className='px-1'>
                        <Typography className='text-[14px] text-gray-800 line-clamp-2'>
                          {post.content}
                        </Typography>
                      </Box>
                    )}

                    {/* Image */}
                    {post.imageUrl ? (
                      <Box
                        className='mx-1 h-40 bg-cover bg-center rounded-md'
                        style={{ backgroundImage: `url(${post.imageUrl})` }}
                      />
                    ) : (
                      <Box className='mx-1 h-40 bg-cover bg-center rounded-md bg-gray-200' />
                    )}

                    {/* Actions */}
                    <Box className='flex items-center gap-4 text-[11px] text-gray-600 px-1'>
                      <Box className='flex items-center gap-1'><i className='ri-heart-line' />{post.likeCount}</Box>
                      <Box className='flex items-center gap-1'><i className='ri-chat-1-line' />{post.commentCount}</Box>
                    </Box>

                    {/* Club card */}
                    <Box className='mx-1 flex items-center justify-between bg-gray-400 rounded-md p-2'>
                      <Box className='flex items-center gap-2'>
                        <Box className='w-8 h-8 rounded bg-gray-500' />
                        <Box className='h-8 bg-white' style={{ width: '1px' }}> </Box>
                        <Box className='leading-tight'>
                          <Box className='text-[14px] text-white mb-1'>Club Name <i className='ri-group-line text-[10px] text-gray-200 mx-1' /><span className='text-[10px] text-gray-200'>28</span></Box>
                          <Box className='text-[9px] flex items-center text-gray-200'> <i className='ri-calendar-line text-[10px] mr-1' />6월 1일에 진행함
                            <i className='ri-map-pin-line text-[10px] mx-1' />
                            도산공원</Box>
                        </Box>
                      </Box>
                      <i className='ri-arrow-right-s-line text-white' />
                    </Box>
                  </Box>
                ))}
              </Box>
            </>
          )}

          {/* Users list (유저) */}
          {activeTab === 2 && (
            <Box className='px-3 pt-5 pb-8 space-y-5'>
              {loading.users && (
                <Box className='flex justify-center py-8'>
                  <CircularProgress size={32} />
                </Box>
              )}

              {!loading.users && (!userResults || userResults.length === 0) && (
                <Box className='text-center py-8 text-gray-500'>
                  검색 결과가 없습니다
                </Box>
              )}

              {!loading.users && userResults && userResults.map((user: any) => (
                <Box
                  key={user.id}
                  className='flex items-start gap-3 hover:bg-gray-50 p-2 rounded-lg'
                >
                  <Box
                    className='w-9 h-9 rounded-full bg-cover bg-center cursor-pointer'
                    style={{
                      backgroundImage: user.profileImage ? `url(${user.profileImage})` : 'none',
                      backgroundColor: !user.profileImage ? '#D1D5DB' : undefined
                    }}
                    onClick={() => handleUserClick(user.id)}
                  />
                  <Box className='flex-1 cursor-pointer' onClick={() => handleUserClick(user.id)}>
                    <Box className='text-[14px] text-blue-600 flex items-center gap-1'>
                      {user.nickname}
                      {(() => {
                        const badgeDisplay = getCommunityBadgeDisplay(user.activeCommunityBadge)
                        if (!badgeDisplay) return null
                        return (
                          <img
                            src={badgeDisplay.image}
                            alt={badgeDisplay.label}
                            width={20}
                            height={20}
                            title={`커뮤니티 등급: ${badgeDisplay.label}`}
                          />
                        )
                      })()}
                    </Box>
                    <Box className='text-[12px] text-gray-600 mt-0.5'>{user.description}</Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

export default WebSearchPage

