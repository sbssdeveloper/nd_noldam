'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  CircularProgress
} from '@mui/material'
import Image from 'next/image'
import { meetingsApi } from '@/services/meetingsApi'

interface Meeting {
  id: string
  name: string
  desc: string
  date: string
  image: string
  // Additional fields from database
  meetingName?: string
  meetingTime?: string
  meetingBackground?: string
  description?: string
  location?: string
  currentParticipants?: number
  maxNum?: number
  participants?: any[]
  detailedAddress?: string
  roadNameAddress?: string
}

interface MeetingSelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (meeting: Meeting) => void
  onConfirm: () => void
  selectedMeetings: Meeting[]
  meetings?: Meeting[]
  allowMultiple?: boolean
}

const MeetingSelectModal: React.FC<MeetingSelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  onConfirm,
  selectedMeetings = [],
  meetings: propMeetings,
  allowMultiple = false
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch meetings when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMeetings()
    }
  }, [isOpen])

  const fetchMeetings = async () => {
    setLoading(true)
    setError(null)

    try {
      // If meetings are passed as props, use them, otherwise fetch from API
      if (propMeetings && propMeetings.length > 0) {
        setMeetings(propMeetings)
      } else {
        const fetchedMeetings = await meetingsApi.getMeetings()

        if (fetchedMeetings) {
          // Transform API data to match our interface
          const transformedMeetings: Meeting[] = fetchedMeetings.map((meeting: any) => ({
            id: meeting.id.toString(),
            name: meeting.meetingName || meeting.title || 'Untitled Meeting',
            desc: meeting.description || 'No description available',
            date: meeting.date || (meeting.meetingTime ? new Date(meeting.meetingTime).toLocaleDateString('ko-KR') : '날짜 미정'),
            image: meeting.image || meeting.meetingBackground || '/images/placeholder-meeting.jpg',
            // Keep original fields for compatibility
            meetingName: meeting.meetingName,
            meetingTime: meeting.meetingTime,
            meetingBackground: meeting.meetingBackground,
            description: meeting.description,
            location: meeting.location,
            currentParticipants: meeting.currentParticipants,
            maxNum: meeting.maxNum,
            participants: meeting.participants
          }))

          setMeetings(transformedMeetings)
        } else {
          setMeetings([])
        }
      }
    } catch (err) {
      // Error fetching meetings
      setError('모임을 불러오는 중 오류가 발생했습니다.')
      setMeetings([])
    } finally {
      setLoading(false)
    }
  }

  // Filter meetings based on search query
  const filteredMeetings = useMemo(() => {
    if (!searchQuery.trim()) return meetings

    return meetings.filter(meeting =>
      meeting.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.desc.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [meetings, searchQuery])

  // Check if a meeting is selected
  const isSelected = (meeting: Meeting) => {
    return selectedMeetings.some(selected => selected.id === meeting.id)
  }

  // Handle meeting selection
  const handleMeetingSelect = (meeting: Meeting) => {
    onSelect(meeting)
  }

  if (!isOpen) return null

  return (
    <Box
      className="fixed inset-0 bg-white z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <Box className="w-full h-full flex flex-col">
        <Box className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3">
          <Box className="flex justify-between items-center mb-3">
            <Typography variant="h6" className="font-semibold">
              모임 선택 {allowMultiple && selectedMeetings.length > 0 && `(${selectedMeetings.length}개 선택됨)`}
            </Typography>
            <IconButton onClick={onClose}>
              <i className="ri-close-line" />
            </IconButton>
          </Box>

          {/* Search Input */}
          <TextField
            fullWidth
            placeholder="모임 이름으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            variant="outlined"
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <i className="ri-search-line text-gray-400" />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchQuery('')}
                    className="text-gray-400"
                  >
                    <i className="ri-close-line" />
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                '& fieldset': {
                  borderColor: '#e5e7eb',
                },
                '&:hover fieldset': {
                  borderColor: '#d1d5db',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#3b82f6',
                },
              },
            }}
          />
        </Box>

        <Box className="px-4 py-4 flex-1 overflow-y-auto">
          {loading ? (
            <Box className="flex flex-col items-center justify-center py-12">
              <CircularProgress size={48} className="mb-4" />
              <Typography variant="h6" className="text-gray-500 mb-2">
                모임을 불러오는 중...
              </Typography>
            </Box>
          ) : error ? (
            <Box className="flex flex-col items-center justify-center py-12">
              <i className="ri-error-warning-line text-red-300 text-6xl mb-4" />
              <Typography variant="h6" className="text-red-500 mb-2">
                오류가 발생했습니다
              </Typography>
              <Typography variant="body2" className="text-gray-400 text-center mb-4">
                {error}
              </Typography>
              <Button
                variant="outlined"
                onClick={fetchMeetings}
                className="text-blue-500 border-blue-500"
              >
                다시 시도
              </Button>
            </Box>
          ) : filteredMeetings.length === 0 ? (
            <Box className="flex flex-col items-center justify-center py-12">
              <i className="ri-search-line text-gray-300 text-6xl mb-4" />
              <Typography variant="h6" className="text-gray-500 mb-2">
                {searchQuery ? '검색 결과가 없습니다' : '등록된 모임이 없습니다'}
              </Typography>
              <Typography variant="body2" className="text-gray-400 text-center">
                {searchQuery ? '다른 검색어를 시도해보세요' : '새로운 모임을 만들어보세요'}
              </Typography>
            </Box>
          ) : (
            filteredMeetings.map((meeting) => (
              <Box
                key={meeting.id}
                onClick={() => handleMeetingSelect(meeting)}
                className={`mb-4 rounded-xl border overflow-hidden cursor-pointer transition-all ${isSelected(meeting) ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:shadow-md'
                  }`}
              >
                {/* Card Image - Full Width */}
                <Box
                  className="relative w-full bg-gray-200"
                  sx={{ height: 200 }}
                >
                  {meeting.image && meeting.image !== '/images/placeholder-meeting.jpg' ? (
                    <Image
                      src={meeting.image}
                      alt={meeting.name}
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <Box className="w-full h-full flex items-center justify-center bg-gray-300">
                      <i className="ri-group-line text-gray-500 text-6xl" />
                    </Box>
                  )}
                  {/* Checkmark overlay when selected */}
                  {isSelected(meeting) && (
                    <Box
                      className="absolute top-2 right-2 bg-blue-500 rounded-full p-1"
                      sx={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <i className="ri-check-line text-white text-xl" />
                    </Box>
                  )}
                </Box>

                {/* Card Details */}
                <Box className={`p-4 ${isSelected(meeting) ? 'bg-blue-50' : 'bg-white'}`}>
                  <Typography
                    variant="h6"
                    className="font-bold mb-2 text-lg"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {meeting.name}
                  </Typography>
                  <Box className="flex items-center text-gray-500 space-x-4">
                    <Box className="flex items-center min-w-0">
                      <i className="ri-calendar-line mr-1 text-sm flex-shrink-0" />
                      <Typography
                        variant="body2"
                        className="text-sm"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {meeting.date}
                      </Typography>
                    </Box>
                    <Box className="flex items-center min-w-0">
                      <i className="ri-map-pin-line mr-1 text-sm flex-shrink-0" />
                      <Typography
                        variant="body2"
                        className="text-sm"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {meeting.location || meeting.detailedAddress || meeting.roadNameAddress || '장소 미정'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            ))
          )}
        </Box>

        <Box className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
          <Button
            fullWidth
            variant="contained"
            onClick={onConfirm}
            disabled={selectedMeetings.length === 0}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {allowMultiple
              ? `확인 ${selectedMeetings.length > 0 ? `(${selectedMeetings.length}개 선택됨)` : ''}`
              : '확인'
            }
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

export default MeetingSelectModal
