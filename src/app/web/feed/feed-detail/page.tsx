'use client'

import React from 'react'
import { Box, Typography, Card, CardContent, IconButton, Avatar, Button } from '@mui/material'
import { useRouter } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import type { FeedItem, MeetingData } from '@/services/types/frontend'
import Image from 'next/image'
import { useChat } from '@/components/layout/ChatContext'

const FeedDetailPage = ({ params }: { params: { id: string } }) => {
  const router = useRouter()
  const { navigate } = useNavigation()
  const { openChat, openSearch } = useChat()

  return (
    <Box className="min-h-screen  bg-white pb-28 md:pb-8">
      {/* Header */}
      <Box className="pt-8 pb-6 px-4">
        {/* Back Button */}
        <Box className="flex justify-start   fixed top-0 left-0 right-0 bg-white z-10 p-4 items-center mb-4">
          <IconButton
            onClick={() => router.back()}
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
              onClick={() => navigate('/feed/post-detail')}
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
        <Card className="mb-4">
          <CardContent className="p-2 bg-gray-400">
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
                        28
                      </Typography>
                    </Box>
                  </Box>
                  <Box className="flex items-center mt-1">

                    <i className="ri-calendar-line text-white mr-1 text-sm" />
                    <Typography variant="caption" className="text-white mr-3">
                      6월 1일 예정
                    </Typography>
                    <i className="ri-map-pin-line text-white mr-1 text-sm" />
                    <Typography variant="caption" className="text-white">
                      두산공원
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <IconButton>
                <i className="ri-arrow-right-s-line text-white" />
              </IconButton>
            </Box>
          </CardContent>
        </Card>

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
      <Box className="px-4 pb-12">
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

      {/* Comment Input */}
      <Box className="fixed bottom-16 left-0 right-0 p-4 border-t border-gray-200">
        <Box className="flex items-center bg-gray-500 text-white justify-between rounded-lg p-2">
          <Box className="flex items-center flex-1">
            <Avatar className="w-6 h-6 bg-gray-300 mr-2" />
            <input placeholder="답장하기: 김이나..." className="bg-gray-500 text-white border-none outline-none placeholder:text-white" />
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
  )
}

export default FeedDetailPage
