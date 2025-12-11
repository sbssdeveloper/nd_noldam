'use client'

import React from 'react'
import { Box, IconButton, TextField, Typography, Tabs, Tab, Select, MenuItem } from '@mui/material'
import { useRouter } from 'next/navigation'
import type { SearchFilters, FeedItem, MeetingData } from '@/services/types/frontend'

const WebSearchPage = () => {
  const router = useRouter()
  const [query, setQuery] = React.useState('')
  const [activeTab, setActiveTab] = React.useState(0) // 0: 모임, 1: 게시물, 2: 유저
  const [filterCategory, setFilterCategory] = React.useState('카테고리')
  const [filterRound, setFilterRound] = React.useState('회차 전체')
  const [filterSort, setFilterSort] = React.useState('최신순')

  // For tab 2 (게시물) filter chip rendering with icon and chevron
  const renderPostFilterChip = (iconClass: string, text: string) => (
    <Box className='flex items-center gap-2'>
      <Box className='w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center'>
        <i className={`${iconClass} text-[12px] text-white`} />
      </Box>
      <span className='text-gray-700'>{text}</span>
      <i className='ri-arrow-down-s-line text-gray-400 text-sm' />
    </Box>
  )

  return (
    <Box className='min-h-screen bg-white pb-24'>
      {/* Header */}
      <Box className='fixed top-0 left-0 right-0 bg-white z-20'>
        <Box className='flex items-center justify-between px-2 py-3'>
          <Box className='flex items-center w-full'>
            {query && (
              <IconButton onClick={() => router.back()} className='mr-1 p-0'>
                <i className='ri-arrow-left-s-line text-2xl' />
              </IconButton>
            )}
            <TextField
              fullWidth
              placeholder={query ? 'Search_result' : "'모임이름', '닉네임', '동탄 1동'과 같이 검색해보세요."}
              size='small'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: <i className='ri-search-line mr-2 text-gray-500' /> as any,
                className: 'bg-gray-100 rounded-xl text-[12px]',
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Content */}
      {!query && (
        <Box className='pt-16 px-3'>
          {/* Categories */}
          <Typography variant='h5' className='text-gray-800 font-bold mb-2'>카테고리</Typography>
          <Box className='flex overflow-x-auto space-x-3 pb-2'>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Box key={`cat-${i}`} className=' bg-gray-300 rounded-[16px] flex flex-col justify-end items-center'>
                <Box className='min-w-[112px] min-h-[108px] bg-gray-100' borderRadius='16px 16px 0 0'></Box>
                <Typography className='text-gray-900 p-3 text-[12px]'>Category {i}</Typography>
              </Box>
            ))}
          </Box>

          {/* Explore */}
          <Typography variant='h5' className='text-gray-800 font-bold mt-4 mb-2'>둘러보기</Typography>
          <Box className='grid grid-cols-2 gap-3'>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Box key={`tile-${i}`} className='h-24 bg-gray-300 rounded-[16px] flex items-end p-2'>
                <Typography variant='caption' className='text-white'>Category_name{i % 2 === 0 ? '' : ''}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {query && (
        <Box className='pt-16'>
          {/* Tabs */}
          <Box className='px-3 mx-5'>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
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
                onChange={(e) => setFilterCategory(e.target.value as string)}
                size='small'
                displayEmpty
                startAdornment={<i className='ri-layout-grid-fill' />}
                variant='outlined'
                sx={{
                  backgroundColor: '#F3F4F6',
                  borderRadius: '5px',
                  '& fieldset': { border: 'none' },
                  '.MuiSelect-select': { paddingY: 0.5, paddingX: 1.5, fontSize: 10 }
                }}
              >
                <MenuItem value='카테고리'>카테고리</MenuItem>
                <MenuItem value='영화'>영화</MenuItem>
                <MenuItem value='운동'>운동</MenuItem>
                <MenuItem value='스터디'>스터디</MenuItem>
              </Select>

              <Select
                value={filterRound}
                onChange={(e) => setFilterRound(e.target.value as string)}
                size='small'
                displayEmpty
                startAdornment={<i className='ri-compass-3-line' />}
                variant='outlined'
                sx={{
                  backgroundColor: '#F3F4F6',
                  borderRadius: '5px',
                  '& fieldset': { border: 'none' },
                  '.MuiSelect-select': { paddingY: 0.5, paddingX: 1.5, fontSize: 10 }
                }}
              >
                <MenuItem value='회차 전체'>회차 전체</MenuItem>
                <MenuItem value='이번주'>이번주</MenuItem>
                <MenuItem value='이번달'>이번달</MenuItem>
              </Select>

              <Select
                value={filterSort}
                onChange={(e) => setFilterSort(e.target.value as string)}
                size='small'
                displayEmpty
                startAdornment={<i className='ri-arrow-up-down-line' />}
                variant='outlined'
                sx={{
                  backgroundColor: '#F3F4F6',
                  borderRadius: '5px  ',
                  '& fieldset': { border: 'none' },
                  '.MuiSelect-select': { paddingY: 0.5, paddingX: 1.5, fontSize: 10 }
                }}
              >
                <MenuItem value='최신순'>최신순</MenuItem>
                <MenuItem value='인기순'>인기순</MenuItem>
                <MenuItem value='거리순'>거리순</MenuItem>
              </Select>
            </Box>
          )}

          {/* Results list (모임) */}
          {activeTab === 0 && (
            <Box className='px-3 space-y-4'>
              {[1, 2].map((i) => (
                <Box key={`res-${i}`} className='flex items-start gap-3'>
                  <Box className='w-10 h-10 rounded-md bg-gray-300' />
                  <Box className='flex-1'>
                    <Box className='text-xs flex items-center gap-1 text-gray-700'>영등포구 · 취미 김이나
                      <img src='/images/custom/profile-light-green.png' alt='yellow verified badge' width={20} height={20} />

                    </Box>
                    <Box className='text-xs text-gray-700 mt-1'>처음부터 시작하는 러닝 <span className='text-blue-600'>하지하아아아아아아아</span> Crew</Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {/* Placeholder lists for other tabs */}
          {activeTab === 1 && (
            <>
              {/* Single filter (최신순) with chip style */}
              <Box className='px-3 py-5 flex items-center gap-2'>
                <Select
                  value={filterSort}
                  onChange={(e) => setFilterSort(e.target.value as string)}
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
                  <MenuItem value='최신순'>최신순</MenuItem>
                  <MenuItem value='인기순'>인기순</MenuItem>
                  <MenuItem value='댓글순'>댓글순</MenuItem>
                </Select>
              </Box>

              {/* Posts list */}
              <Box className='px-3 space-y-6'>
                {[1, 2].map((i) => (
                  <Box key={`post-${i}`} className='space-y-2'>
                    {/* Header */}
                    <Box className='flex items-start justify-between px-1'>
                      <Box className='flex items-center gap-2'>
                        <Box className='w-9 h-9 rounded-full bg-gray-300' />
                        <Box>
                          <Box className='text-[14px] text-gray-900 flex items-center gap-1'>
                            User Name
                            <img src='/images/custom/yellow-verified-badge.png' alt='yellow verified badge' width={20} height={20} />

                          </Box>
                          <Box className='text-[14px] text-blue-600 leading-tight'>Club_name</Box>
                        </Box>
                      </Box>
                      <Box className='text-[12px] text-gray-600'>3d</Box>
                    </Box>

                    {/* Image */}
                    <Box className='mx-1 h-40 bg-gray-200 rounded-md' />

                    {/* Actions */}
                    <Box className='flex items-center gap-4 text-[11px] text-gray-600 px-1'>
                      <Box className='flex items-center gap-1'><i className='ri-heart-line' />23</Box>
                      <Box className='flex items-center gap-1'><i className='ri-chat-1-line' />2</Box>
                    </Box>

                    {/* Club card */}
                    <Box className='mx-1 flex items-center justify-between bg-gray-400 rounded-md p-2'>
                      <Box className='flex items-center gap-2'>
                        <Box className='w-8 h-8 rounded bg-gray-500' />
                        <Box className='h-8 bg-white ' style={{ width: '1px' }}> </Box>
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
          {activeTab === 2 && (
            <Box className='px-3 pt-5 pb-8 space-y-5'>
              {[{ name: 'User Name', desc: 'Introducing anything' }, { name: 'User Name', desc: 'another' }, { name: 'User Name', desc: 'My Bio' }, { name: 'User Name', desc: 'I like user name!' }].map((u, idx) => (
                <Box key={`user-${idx}`} className='flex items-start gap-3'>
                  <Box className='w-9 h-9 rounded-full bg-gray-300' />
                  <Box className='flex-1'>
                    <Box className='text-[14px] text-blue-600 flex items-center gap-1'>
                      {u.name}
                      <img src='/images/custom/yellow-verified-badge.png' alt='yellow verified badge' width={20} height={20} />
                    </Box>
                    <Box className='text-[12px] text-gray-600 mt-0.5'>{u.desc}</Box>
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


