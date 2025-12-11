'use client'

import React, { useState, useEffect } from 'react'
import {
  Modal,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  Avatar,
  CircularProgress
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  MoreVert as MoreVertIcon,
  Image as ImageIcon,
  GifBox as GifIcon,
  EmojiEmotions as EmojiIcon,
  LocationOn as LocationIcon,
  Menu as MenuIcon
} from '@mui/icons-material'
import Image from 'next/image'
import { useAppSelector } from '@/store/hooks'
import { usePostActions } from '@/hooks/usePostActions'
import { getTimeAgo } from '@/utils/dateTimeUtils'
import FollowButton from './FollowButton'

interface CommentThreadModalProps {
  isOpen: boolean
  onClose: () => void
  postId: number
  parentComment: any
  originalPost: any
  childReplies: any[]
}

const CommentThreadModal: React.FC<CommentThreadModalProps> = ({
  isOpen,
  onClose,
  postId,
  parentComment,
  originalPost,
  childReplies
}) => {
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(false)

  const { user } = useAppSelector((state) => state.authReducer)
  const { handleAddComment } = usePostActions()

  // Render ordered content for posts and comments
  const renderOrderedContent = (content: any) => {
    if (!content) return null;

    // Try to parse as ordered content array first (JSON content)
    let orderedContent;
    try {
      // Check if content is already an array
      if (Array.isArray(content)) {
        orderedContent = content;
      } else if (typeof content === 'string') {
        // Try to parse JSON string first
        orderedContent = JSON.parse(content);
      } else {
        orderedContent = content;
      }
    } catch (error) {
      // If JSON parsing fails, check if it's HTML content from rich text editor
      if (typeof content === 'string' && (content.includes('<p>') || content.includes('<div>') || content.includes('<img'))) {
        return (
          <Box
            className='text-gray-800 mb-3 ql-editor-content'
            dangerouslySetInnerHTML={{ __html: content }}
            sx={{
              '& p': {
                margin: '0 0 12px 0',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                wordBreak: 'break-word'
              },
              '& img': {
                maxWidth: '100%',
                height: 'auto',
                borderRadius: '8px',
                margin: '12px 0'
              },
              '& strong': {
                fontWeight: 600
              },
              '& em': {
                fontStyle: 'italic'
              },
              '& u': {
                textDecoration: 'underline'
              },
              '& a': {
                color: '#3b82f6',
                textDecoration: 'underline'
              },
              '& ul, & ol': {
                paddingLeft: '1.5rem',
                marginBottom: '12px'
              },
              '& li': {
                marginBottom: '4px'
              },
              '& h1, & h2, & h3': {
                fontWeight: 600,
                marginBottom: '12px'
              },
              '& h1': {
                fontSize: '1.875rem'
              },
              '& h2': {
                fontSize: '1.5rem'
              },
              '& h3': {
                fontSize: '1.25rem'
              }
            }}
          />
        );
      }

      // If all parsing fails, treat as regular text
      // Failed to parse content as JSON
      // Content:
      return (
        <Typography
          className='text-gray-800 mb-4 text-[12px] leading-relaxed'
          sx={{
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        >
          {content}
        </Typography>
      );
    }

    // If it's an array, render ordered content
    if (Array.isArray(orderedContent)) {
      return (
        <Box className='space-y-3 mb-4'>
          {orderedContent.map((item, index) => (
            <Box key={item.id || index}>
              {item.type === 'text' && (
                <Typography
                  className='text-gray-800 text-[12px] leading-relaxed'
                  sx={{
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {item.content}
                </Typography>
              )}

              {item.type === 'meeting' && (
                <Box className='bg-gray-400 rounded-lg px-3 py-2 flex items-center justify-between'>
                  <Box className='flex items-center'>
                    <Avatar className='w-8 h-8 bg-gray-600 mr-2' />
                    <Box className="h-8 bg-white mr-2" sx={{ width: '1px' }} />
                    <Typography variant='body2' className='text-white font-medium'>{item.meeting?.name || 'Meeting'}</Typography>
                  </Box>
                </Box>
              )}

              {item.type === 'image' && (
                <Box className='relative overflow-hidden rounded-lg bg-gray-200' sx={{ height: 300 }}>
                  <img
                    src={item.url}
                    alt="Post image"
                    className='w-full h-full object-cover'
                  />
                </Box>
              )}

              {item.type === 'file' && (
                <Box className='flex items-center bg-gray-400 text-white rounded-lg px-3 py-2 w-full max-w-md'>
                  <i className='ri-folder-2-line mr-2' />
                  <Box className="h-8 bg-white mr-2" sx={{ width: '1px' }} />
                  <span className='flex-1 truncate'>{item.name}</span>
                  <IconButton
                    className='ml-2 p-1'
                    onClick={() => {
                      // TODO: Implement file download from server
                      alert(`다운로드 기능이 곧 추가될 예정입니다: ${item.name}`);
                    }}
                    title={`${item.name} 다운로드`}
                  >
                    <i className='ri-download-line text-white text-xl' />
                  </IconButton>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      );
    }

    // Fallback to regular text
    return (
      <Typography
        className='text-gray-800 mb-4 text-[12px] leading-relaxed'
        sx={{
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
      >
        {content}
      </Typography>
    );
  };

  const handlePostReply = async () => {
    if (!replyText.trim()) return

    setLoading(true)
    try {
      await handleAddComment(
        postId.toString(),
        replyText.trim(),
        parentComment.id
      )

      // Clear input and close modal
      setReplyText('')
      onClose()
    } catch (error) {
      // Failed to post reply
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center'
      }}
    >
      <Box sx={{
        width: '100%',
        height: '100%',
        backgroundColor: 'white',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 3,
          py: 2,
          backgroundColor: 'white',
          borderBottom: '1px solid #e0e0e0'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#000', fontSize: '16px' }}>
            Thread
          </Typography>
          <Button
            onClick={onClose}
            sx={{
              textTransform: 'none',
              color: '#666',
              fontWeight: 500,
              fontSize: '16px',
              minWidth: 'auto',
              px: 0,
              py: 0.5
            }}
          >
            Cancel
          </Button>
        </Box>

        {/* Content Area */}
        <Box sx={{
          backgroundColor: 'white',
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}>
          {/* Thread Line Container */}
          <Box sx={{
            position: 'relative',
            margin: '0 16px',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: '30px',
              top: '60px',
              bottom: '25px',
              width: '2px',
              backgroundColor: '#e0e0e0',
              zIndex: 0
            }
          }}>
            {/* Original Post Display */}
            {originalPost && (
              <Box sx={{
                backgroundColor: 'white',
                p: 2,
                margin: '8px 0'
              }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Avatar
                    src={originalPost.user?.profileImage || undefined}
                    sx={{
                      width: 48,
                      height: 48,
                      border: '2px solid #e0e0e0',
                      zIndex: 2,
                      position: 'relative'
                    }}
                  >
                    {originalPost.user?.nickname?.charAt(0)}
                  </Avatar>

                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '16px', color: '#000' }}>
                        {originalPost.user?.nickname}
                      </Typography>
                      {/* Blue verification checkmark */}
                      <Box sx={{
                        width: 18,
                        height: 18,
                        backgroundColor: '#1d9bf0',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="ri-check-line" style={{ fontSize: '12px', color: 'white' }} />
                      </Box>
                      <FollowButton
                        userId={originalPost.user?.id}
                        userNickname={originalPost.user?.nickname}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '14px', color: '#666' }}>
                        {getTimeAgo(originalPost.createdAt)}
                      </Typography>
                    </Box>

                    {renderOrderedContent(originalPost.content)}

                    {/* Video/Media Preview */}
                    {originalPost.imageUrl && (
                      <Box sx={{
                        borderRadius: '16px',
                        overflow: 'hidden',
                        backgroundColor: '#000',
                        position: 'relative',
                        mt: 2
                      }}>
                        <img
                          src={originalPost.imageUrl}
                          alt="Post media"
                          style={{
                            width: '100%',
                            height: '240px',
                            objectFit: 'cover'
                          }}
                        />
                        {/* Speaker icon overlay (muted) */}
                        <Box sx={{
                          position: 'absolute',
                          bottom: '16px',
                          right: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 32,
                          height: 32,
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          borderRadius: '50%'
                        }}>
                          <i className="ri-volume-mute-line" style={{ fontSize: '16px', color: 'white' }} />
                        </Box>
                      </Box>
                    )}

                    {/* Post Actions */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                      {/* Like Button */}
                      <Button
                        className={`flex items-center gap-1 p-0 ${(originalPost?.isLiked ?? originalPost?.likes?.some((like: any) => like.userId === user?.id))
                          ? 'text-red-500 hover:text-red-600'
                          : 'text-gray-500 hover:text-red-500'
                          }`}
                        onClick={() => {
                          // Handle like functionality
                        }}
                        sx={{
                          textTransform: 'none',
                          minWidth: 'auto',
                          backgroundColor: 'transparent !important',
                          '&:hover': { backgroundColor: 'transparent !important' },
                          '&:focus': { backgroundColor: 'transparent !important' },
                          '&:active': { backgroundColor: 'transparent !important' }
                        }}
                      >
                        <i className={`ri-heart-${(originalPost?.isLiked ?? originalPost?.likes?.some((like: any) => like.userId === user?.id)) ? 'fill' : 'line'} text-sm`} />
                        <Typography variant='caption' className='text-xs'>
                          {originalPost?.likeCount ?? originalPost?.likes?.length ?? 0}
                        </Typography>
                      </Button>

                      {/* Comment Button */}
                      <Button
                        className='flex items-center gap-1 text-gray-500 hover:text-blue-500 p-0'
                        onClick={() => {
                          // Handle comment functionality
                        }}
                        sx={{
                          textTransform: 'none',
                          minWidth: 'auto',
                          backgroundColor: 'transparent !important',
                          '&:hover': { backgroundColor: 'transparent !important' },
                          '&:focus': { backgroundColor: 'transparent !important' },
                          '&:active': { backgroundColor: 'transparent !important' }
                        }}
                      >
                        <i className='ri-chat-3-line text-sm' />
                        <Typography variant='caption' className='text-xs'>
                          {originalPost?.commentCount ?? originalPost?.comments?.length ?? 0}
                        </Typography>
                      </Button>

                      {/* Share Button */}
                      <Button
                        className='flex items-center gap-1 text-gray-500 hover:text-green-500 p-0'
                        onClick={() => {
                          // Handle share functionality
                        }}
                        sx={{
                          textTransform: 'none',
                          minWidth: 'auto',
                          backgroundColor: 'transparent !important',
                          '&:hover': { backgroundColor: 'transparent !important' },
                          '&:focus': { backgroundColor: 'transparent !important' },
                          '&:active': { backgroundColor: 'transparent !important' }
                        }}
                      >
                        <i className='ri-share-line text-sm' />
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Parent Comment Display */}
            {parentComment && (
              <Box sx={{
                backgroundColor: 'white',
                p: 2,
                margin: '8px 0'
              }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Avatar
                    src={parentComment.user?.profileImage || undefined}
                    sx={{
                      width: 48,
                      height: 48,
                      border: '2px solid #e0e0e0',
                      zIndex: 2,
                      position: 'relative'
                    }}
                  >
                    {parentComment.user?.nickname?.charAt(0)}
                  </Avatar>

                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '16px', color: '#000' }}>
                        {parentComment.user?.nickname}
                      </Typography>
                      {/* Blue verification checkmark */}
                      <Box sx={{
                        width: 18,
                        height: 18,
                        backgroundColor: '#1d9bf0',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="ri-check-line" style={{ fontSize: '12px', color: 'white' }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '14px', color: '#666' }}>
                        {getTimeAgo(parentComment.createdAt)}
                      </Typography>
                    </Box>

                    {renderOrderedContent(parentComment.content)}

                    {/* Comment Actions */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                      {/* Like Button */}
                      <Button
                        className={`flex items-center gap-1 p-0 ${parentComment.isLiked
                          ? 'text-red-500 hover:text-red-600'
                          : 'text-gray-500 hover:text-red-500'
                          }`}
                        onClick={() => {
                          // Handle like functionality
                        }}
                        sx={{
                          textTransform: 'none',
                          minWidth: 'auto',
                          backgroundColor: 'transparent !important',
                          '&:hover': { backgroundColor: 'transparent !important' },
                          '&:focus': { backgroundColor: 'transparent !important' },
                          '&:active': { backgroundColor: 'transparent !important' }
                        }}
                      >
                        <i className={`ri-heart-${parentComment.isLiked ? 'fill' : 'line'} text-sm`} />
                        <Typography variant='caption' className='text-xs'>
                          {parentComment.likeCount || parentComment.likes?.length || 0}
                        </Typography>
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Child Replies */}
            {childReplies.map((reply, index) => (
              <Box key={reply.id} sx={{
                backgroundColor: 'white',
                p: 2,
                margin: '8px 0'
              }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Avatar
                    src={reply.user?.profileImage || undefined}
                    sx={{
                      width: 48,
                      height: 48,
                      border: '2px solid #e0e0e0',
                      zIndex: 2,
                      position: 'relative'
                    }}
                  >
                    {reply.user?.nickname?.charAt(0)}
                  </Avatar>

                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '16px', color: '#000' }}>
                        {reply.user?.nickname}
                      </Typography>
                      {/* Blue verification checkmark */}
                      <Box sx={{
                        width: 18,
                        height: 18,
                        backgroundColor: '#1d9bf0',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="ri-check-line" style={{ fontSize: '12px', color: 'white' }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '14px', color: '#666' }}>
                        {getTimeAgo(reply.createdAt)}
                      </Typography>
                    </Box>

                    {renderOrderedContent(reply.content)}

                    {/* Comment Actions */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                      {/* Like Button */}
                      <Button
                        className={`flex items-center gap-1 p-0 ${reply.isLiked
                          ? 'text-red-500 hover:text-red-600'
                          : 'text-gray-500 hover:text-red-500'
                          }`}
                        onClick={() => {
                          // Handle like functionality
                        }}
                        sx={{
                          textTransform: 'none',
                          minWidth: 'auto',
                          backgroundColor: 'transparent !important',
                          '&:hover': { backgroundColor: 'transparent !important' },
                          '&:focus': { backgroundColor: 'transparent !important' },
                          '&:active': { backgroundColor: 'transparent !important' }
                        }}
                      >
                        <i className={`ri-heart-${reply.isLiked ? 'fill' : 'line'} text-sm`} />
                        <Typography variant='caption' className='text-xs'>
                          {reply.likeCount || reply.likes?.length || 0}
                        </Typography>
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </Box>
            ))}

            {/* Reply Input Area */}
            <Box sx={{
              backgroundColor: 'white',
              margin: '8px 0',
              position: 'relative'
            }}>
              <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Avatar
                    src={user?.profileImage || undefined}
                    sx={{
                      width: 48,
                      height: 48,
                      border: '2px solid #e0e0e0',
                      zIndex: 2,
                      position: 'relative'
                    }}
                  >
                    {user?.nickname?.charAt(0)}
                  </Avatar>

                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '16px', color: '#000' }}>
                        {user?.nickname}
                      </Typography>
                      {/* Blue verification checkmark */}
                      <Box sx={{
                        width: 18,
                        height: 18,
                        backgroundColor: '#1d9bf0',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <i className="ri-check-line" style={{ fontSize: '12px', color: 'white' }} />
                      </Box>
                    </Box>

                    <TextField
                      placeholder="Add to thread"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      multiline
                      minRows={1}
                      maxRows={20}
                      fullWidth
                      variant="standard"
                      sx={{
                        '& .MuiInput-root': {
                          fontSize: '16px',
                          color: '#000',
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
                        '& .MuiInput-input': {
                          padding: '8px 0',
                          fontSize: '16px',
                          lineHeight: 1.5
                        }
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Footer - Fixed at Bottom */}
        <Box sx={{
          px: 3,
          py: 2,
          backgroundColor: '#f5f5f5',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'end',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <Button
            variant="contained"
            disabled={!replyText.trim() || loading}
            onClick={handlePostReply}
            sx={{
              borderRadius: '24px',
              textTransform: 'none',
              px: 4,
              py: 1.5,
              fontSize: '16px',
              fontWeight: 600,
              backgroundColor: replyText.trim() ? '#000' : '#e0e0e0',
              color: replyText.trim() ? '#fff' : '#999',
              '&:hover': {
                backgroundColor: replyText.trim() ? '#333' : '#e0e0e0'
              },
              '&:disabled': {
                backgroundColor: '#e0e0e0',
                color: '#999'
              }
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Post'}
          </Button>
        </Box>
      </Box>
    </Modal>
  )
}

export default CommentThreadModal
