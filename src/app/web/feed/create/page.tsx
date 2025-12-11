'use client'

import React from 'react'
import { Box, IconButton, Typography, Button, CircularProgress, TextField } from '@mui/material'
import { useRouter } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import { useChat } from '@/components/layout/ChatContext'
import { useAppSelector } from '@/store/hooks'
import FeedApiService from '@/services/feedApi'
import MeetingSelectModal from '@/components/MeetingSelectModal'
import { compressImage, dataURLtoFile } from '@/utils/imageCompression'

const FeedCreatePage = () => {
  const router = useRouter()
  const { navigate } = useNavigation()
  const imageInputRef = React.useRef<HTMLInputElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [text, setText] = React.useState('')
  const [showOptions, setShowOptions] = React.useState(false)
  const [showClubSelect, setShowClubSelect] = React.useState(false)
  const [selectedClubs, setSelectedClubs] = React.useState<any[]>([])
  const [tempClubs, setTempClubs] = React.useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false)

  // Ordered content array to track timeline
  const [orderedContent, setOrderedContent] = React.useState<any[]>([])
  const { setChatView } = useChat()

  // Get auth state from Redux
  const authState = useAppSelector((state) => (state as any).authReducer)
  const token = authState?.token
  const user = authState?.user
  const isAuthenticated = authState?.isAuthenticated

  // Debug: Log auth state
  React.useEffect(() => {
    // Auth State debug
  }, [token, user, isAuthenticated])

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!token || typeof token !== 'string') {
      // No valid token, redirecting to login
      const timer = setTimeout(() => {
        if (!token || typeof token !== 'string') {
          navigate('/login')
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [token, router])

  React.useEffect(() => {
    setChatView('search')
    return () => setChatView(null)
  }, [setChatView])

  // Detect keyboard open/close on mobile
  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const initialViewportHeight = window.visualViewport?.height || window.innerHeight

    const handleViewportChange = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight
      const heightDifference = initialViewportHeight - currentHeight

      // If viewport height decreased significantly (more than 150px), keyboard is likely open
      // Also check if it's below 70% of initial height (typical mobile keyboard takes ~40-50% of screen)
      if (heightDifference > 150 || currentHeight < initialViewportHeight * 0.7) {
        setIsKeyboardOpen(true)
      } else {
        setIsKeyboardOpen(false)
      }
    }

    // Use visualViewport API if available (better for mobile)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange)
      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange)
      }
    } else {
      // Fallback for browsers without visualViewport
      window.addEventListener('resize', handleViewportChange)
      return () => {
        window.removeEventListener('resize', handleViewportChange)
      }
    }
  }, [])

  const triggerImagePicker = () => imageInputRef.current?.click()
  const triggerFilePicker = () => fileInputRef.current?.click()

  // Handle text input
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value)
  }

  // Add current text to ordered content
  const addTextToOrderedContent = () => {
    if (text.trim()) {
      setOrderedContent(prev => [...prev, {
        type: 'text',
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: text.trim()
      }])
      setText('')
    }
  }

  // Update text content in ordered array
  const updateTextInOrderedContent = (id: string, newContent: string) => {
    setOrderedContent(prev =>
      prev.map(item =>
        item.id === id && item.type === 'text'
          ? { ...item, content: newContent }
          : item
      )
    )
  }

  // Handle image upload
  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Add current text to ordered content FIRST
    addTextToOrderedContent()

    const file = e.target.files?.[0]
    if (!file) return

    // Starting image processing...
    e.target.value = ''
    setShowOptions(false)

    try {
      // Compress image FIRST before upload (faster uploads!)
      // Compressing image...
      const compressedDataUrl = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.80,
        maxSizeMB: 2
      })

      // Convert compressed data URL back to File
      const compressedFile = dataURLtoFile(compressedDataUrl, file.name)
      // Image compressed

      // Upload compressed image to server
      // Uploading compressed image to server...
      const uploadResult = await FeedApiService.uploadImage(compressedFile, token)

      if (!uploadResult.success) {
        // Upload failed
        alert('이미지 업로드에 실패했습니다.')
        return
      }

      const imageUrl = uploadResult.data.imageUrl
      // Image uploaded successfully

      const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      setOrderedContent(prev => [...prev, {
        type: 'image',
        id: uniqueId,
        url: imageUrl,  // Short server URL like "/uploads/posts/123_image.jpg"
        filename: file.name
      }])
    } catch (error) {
      // Image upload error
      alert('이미지 업로드 중 오류가 발생했습니다.')
    }
  }

  // Handle file attachment
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Add current text to ordered content FIRST
    addTextToOrderedContent()

    const file = e.target.files?.[0]
    if (file) {
      setOrderedContent(prev => [...prev, {
        type: 'file',
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file: file,
        name: file.name
      }])
      setShowOptions(false)
      e.target.value = ''
    }
  }

  // Remove item from ordered content
  const removeFromOrderedContent = (id: string) => {
    setOrderedContent(prev => prev.filter(item => item.id !== id))
  }

  // Handle meeting selection (multiple selection support)
  const handleSelectClub = (club: any) => {
    setTempClubs(prev => {
      const isSelected = prev.some(c => c.id === club.id)
      if (isSelected) {
        // Remove if already selected
        return prev.filter(c => c.id !== club.id)
      } else {
        // Add if not selected
        return [...prev, club]
      }
    })
  }

  const handleConfirmClub = () => {
    // Add current text to ordered content FIRST
    addTextToOrderedContent()

    if (tempClubs.length > 0) {
      // Add all selected meetings to ordered content
      tempClubs.forEach(club => {
        setOrderedContent(prev => [...prev, {
          type: 'meeting',
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          meeting: club
        }])
      })
    }
    setSelectedClubs(tempClubs)
    setShowClubSelect(false)
  }

  const handleCancelClub = () => {
    setTempClubs([])
    setShowClubSelect(false)
  }

  // Submit post
  const handleSubmit = async () => {
    // Create the final content array including current text
    const finalContent = text.trim()
      ? [...orderedContent, {
        type: 'text',
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: text.trim()
      }]
      : orderedContent

    if (finalContent.length === 0) {
      alert('내용을 입력해주세요.')
      return
    }

    setIsSubmitting(true)

    try {
      const postData = {
        content: JSON.stringify(finalContent),
        tags: [],
        meetingId: selectedClubs.length > 0 ? selectedClubs[0].id : null // Use first selected club for now
      }

      const response = await FeedApiService.createPost(postData)

      if (response.success) {
        // alert('게시물이 작성되었습니다!')
        navigate('/profile')
      } else {
        alert('게시물 작성에 실패했습니다. 다시 시도해주세요.')
      }
    } catch (error) {
      // Post creation error
      alert('게시물 작성 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <Box className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <Box className="flex items-center justify-between">
          <IconButton onClick={() => router.back()} className="p-0">
            <i className="ri-arrow-left-line text-2xl" />
          </IconButton>
          <Typography variant="h6" className="font-semibold">
            피드 작성하기
          </Typography>
          <Typography
            onClick={handleSubmit}
            className="text-blue-500 font-semibold cursor-pointer hover:text-blue-600"
          >
            {isSubmitting ? <CircularProgress size={20} /> : '게시하기'}
          </Typography>
        </Box>
      </Box>

      {/* Main Content */}
      <Box className="px-4 py-4">
        {/* Ordered Content Preview - Shows ABOVE text input */}
        {orderedContent.length > 0 && (
          <Box className='mb-4 space-y-3'>
            {orderedContent.map((item) => (
              <Box key={item.id} className='relative'>
                {item.type === 'text' && (
                  <Box className='relative group'>
                    <TextField
                      fullWidth
                      multiline
                      value={item.content}
                      onChange={(e) => updateTextInOrderedContent(item.id, e.target.value)}
                      variant="standard"
                      sx={{
                        '& .MuiInput-root': {
                          fontSize: '1rem',
                          padding: '8px 0',
                          '&:before': {
                            borderBottom: 'none'
                          },
                          '&:after': {
                            borderBottom: 'none'
                          },
                          '&:hover:not(.Mui-disabled):before': {
                            borderBottom: 'none'
                          }
                        },
                        '& .MuiInputBase-input': {
                          wordWrap: 'break-word',
                          overflowWrap: 'break-word',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          padding: '8px 24px 8px 0'
                        }
                      }}
                    />
                    <IconButton
                      onClick={() => removeFromOrderedContent(item.id)}
                      className='absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity'
                      size='small'
                    >
                      <i className='ri-close-line text-gray-500' />
                    </IconButton>
                  </Box>
                )}

                {item.type === 'meeting' && (
                  <Box className='rounded-lg px-4 py-3 flex items-center justify-between min-h-[80px]' sx={{ backgroundColor: '#9A9A9A' }}>
                    <Box className='flex items-center flex-1 min-w-0'>
                      {/* Square meeting image placeholder */}
                      <Box className='w-12 h-12 mr-4 flex-shrink-0 flex items-center justify-center'>
                        {item.meeting.image || item.meeting.meetingBackground ? (
                          <img
                            src={item.meeting.image || item.meeting.meetingBackground}
                            alt={item.meeting.name || item.meeting.meetingName || 'Meeting'}
                            width={48}
                            height={48}
                            className='rounded-md object-cover'
                            style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                          />
                        ) : (
                          <Box className='w-12 h-12 bg-gray-600 rounded-md flex items-center justify-center'>
                            <i className='ri-group-line text-white text-lg' />
                          </Box>
                        )}
                      </Box>

                      {/* Vertical separator line */}
                      <Box className="h-12 bg-white mr-4 flex-shrink-0" sx={{ width: '1px' }} />

                      {/* Meeting details */}
                      <Box className='flex-1 min-w-0'>
                        {/* First line: Name and participants */}
                        <Box className='flex items-center justify-between mb-2'>
                          <Typography
                            variant='h6'
                            className='text-white font-bold text-lg mr-4 flex-1 min-w-0'
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {item.meeting.name || item.meeting.meetingName || item.meeting.title}
                          </Typography>
                          <Box className='flex items-center flex-shrink-0'>
                            <i className='ri-group-line text-white text-sm mr-1' />
                            <Typography variant='body2' className='text-white text-sm whitespace-nowrap'>
                              {item.meeting.currentParticipants ||
                                item.meeting.participants?.length ||
                                item.meeting.members ||
                                (item.meeting.maxNum ? `${item.meeting.participants?.length || 0}/${item.meeting.maxNum}` : '0')}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Second line: Date and location */}
                        <Box className='flex items-center space-x-4'>
                          <Box className='flex items-center min-w-0'>
                            <i className='ri-calendar-line text-white text-sm mr-1 flex-shrink-0' />
                            <Typography
                              variant='body2'
                              className='text-white text-sm min-w-0'
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {(() => {
                                const dateValue = item.meeting.date || item.meeting.meetingTime;
                                if (!dateValue) return '날짜 미정';

                                try {
                                  const date = new Date(dateValue);
                                  return date.toLocaleDateString('ko-KR', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                  });
                                } catch (error) {
                                  return '날짜 미정';
                                }
                              })()}
                            </Typography>
                          </Box>
                          <Box className='flex items-center min-w-0'>
                            <i className='ri-map-pin-line text-white text-sm mr-1 flex-shrink-0' />
                            <Typography
                              variant='body2'
                              className='text-white text-sm min-w-0'
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {item.meeting.location ||
                                item.meeting.roadNameAddress ||
                                item.meeting.detailedAddress ||
                                '장소 미정'}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>

                    {/* Right arrow only - no close button */}
                    <Box className='flex items-center flex-shrink-0 ml-2'>
                      <i className='ri-arrow-right-s-line text-white text-xl' />
                    </Box>
                  </Box>
                )}

                {item.type === 'image' && (
                  <Box className='relative overflow-hidden rounded-lg bg-gray-200' sx={{ height: 200 }}>
                    <img
                      src={item.url}
                      alt="Post image"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    <IconButton
                      onClick={() => removeFromOrderedContent(item.id)}
                      className='absolute top-1 right-1 bg-black/50'
                    >
                      <i className='ri-close-line text-white' />
                    </IconButton>
                  </Box>
                )}

                {item.type === 'file' && (
                  <Box className='flex items-center bg-gray-400 text-white rounded-lg px-3 py-2 w-full max-w-md'>
                    <i className='ri-folder-2-line mr-2' />
                    <Box className="h-8 bg-white mr-2" sx={{ width: '1px' }} />
                    <span className='flex-1 truncate'>{item.name}</span>
                    <IconButton onClick={() => removeFromOrderedContent(item.id)} className='ml-2 p-1'>
                      <i className='ri-close-line text-white text-xl' />
                    </IconButton>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}

        {/* Text Input - Always BELOW ordered content */}
        <TextField
          fullWidth
          multiline
          minRows={3}
          maxRows={20}
          value={text}
          onChange={handleTextChange}
          placeholder="즐거운 경험을 공유해주세요"
          variant="standard"
          sx={{
            '& .MuiInput-root': {
              fontSize: '1rem',
              padding: '12px 0',
              '&:before': {
                borderBottom: 'none'
              },
              '&:after': {
                borderBottom: 'none'
              },
              '&:hover:not(.Mui-disabled):before': {
                borderBottom: 'none'
              }
            },
            '& .MuiInputBase-input': {
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap'
            }
          }}
        />
      </Box>

      {/* Bottom Options - Moves to top when keyboard is open */}
      <Box
        className={`fixed left-0 right-0 p-4 bg-white border-t border-gray-200 transition-all duration-300 ${isKeyboardOpen ? 'top-0 border-b border-gray-200' : 'bottom-0'
          }`}
        sx={{
          zIndex: 1000
        }}
      >
        <Box className="relative">
          <IconButton
            onClick={() => setShowOptions(!showOptions)}
            className={`absolute left-1 w-10 h-10 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center shadow-none ${isKeyboardOpen ? 'top-1' : '-top-12'
              }`}
          >
            <i className="ri-add-line" />
          </IconButton>

          {showOptions && (
            <Box className={`absolute left-2 z-10 ${isKeyboardOpen ? 'top-14' : 'bottom-16'
              }`}>
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

      {/* Meeting Selection Modal */}
      <MeetingSelectModal
        isOpen={showClubSelect}
        onClose={handleCancelClub}
        onSelect={handleSelectClub}
        onConfirm={handleConfirmClub}
        selectedMeetings={tempClubs}
        allowMultiple={true}
      />
    </Box>
  )
}

export default FeedCreatePage
