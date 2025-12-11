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
  Poll as PollIcon
} from '@mui/icons-material'
import Image from 'next/image'
import { useAppSelector } from '@/store/hooks'
import { usePostActions } from '@/hooks/usePostActions'
import { getTimeAgo } from '@/utils/dateTimeUtils'
import CommentItem from './CommentItem'
import FollowButton from './FollowButton'

interface ThreadViewProps {
  isOpen: boolean
  onClose: () => void
  comment: any
  post: any
  postId: number
  allComments?: any[]
  onReply?: (comment: any, post: any) => void
  onLike?: (commentId: number) => void
  totalCommentsCount?: number
}

const ThreadView: React.FC<ThreadViewProps> = ({
  isOpen,
  onClose,
  comment: initialComment,
  post,
  postId,
  allComments = [],
  onReply,
  onLike,
  totalCommentsCount
}) => {
  const [replyText, setReplyText] = useState('')
  const [currentComment, setCurrentComment] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const { user } = useAppSelector((state) => state.authReducer)
  const { handleAddComment } = usePostActions()

  // Render ordered content for posts
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

  // Flatten the comment tree to get all comments in a flat list
  const flattenComments = (comments: any[]): any[] => {
    const result: any[] = []
    const flatten = (comment: any) => {
      result.push(comment)
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.forEach(flatten)
      }
    }
    comments.forEach(flatten)
    return result
  }

  // Build the full thread path by finding all ancestors
  const buildThreadPath = (comment: any): any[] => {
    const path: any[] = []
    const flatComments = flattenComments(allComments)

    let current = comment

    // Traverse up the parent chain
    while (current) {
      path.unshift(current) // Add to the beginning

      if (current.parentCommentId) {
        // Find the parent in the flat list
        current = flatComments.find((c: any) => c.id === current.parentCommentId)
      } else {
        current = null // Reached top-level
      }
    }

    return path
  }

  // Update current comment when modal opens or initial comment changes
  useEffect(() => {
    if (isOpen && initialComment) {
      setCurrentComment(initialComment)
    }
  }, [isOpen, initialComment])

  const handlePostReply = async () => {
    if (!replyText.trim()) return

    try {
      await handleAddComment(
        postId.toString(),
        replyText.trim(),
        currentComment.id
      )

      // Clear input
      setReplyText('')
    } catch (error) {
      // Failed to post reply
    }
  }


  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Box sx={{
        width: '100%',
        height: '100%',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: 'white',
          position: 'sticky',
          top: 0,
          zIndex: 1
        }}>
          <IconButton onClick={onClose}>
            <ArrowBackIcon />
          </IconButton>
          <IconButton>
            <MoreVertIcon />
          </IconButton>
        </Box>

        {/* Content Area */}
        <Box sx={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: '#fafafa'
        }}>
          <Box sx={{ backgroundColor: 'white', position: 'relative' }}>
            {/* Original Post */}
            {post && (
              <Box sx={{
                p: 2,
                borderBottom: '1px solid #e5e7eb',
                position: 'relative'
              }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Avatar
                    src={post.user?.profileImage || undefined}
                    sx={{ width: 48, height: 48 }}
                  >
                    {post.user?.nickname?.charAt(0)}
                  </Avatar>

                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '16px' }}>
                        {post.user?.nickname}
                      </Typography>
                      <FollowButton
                        userId={post.user?.id}
                        userNickname={post.user?.nickname}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '14px' }}>
                        {getTimeAgo(post.createdAt)}
                      </Typography>
                    </Box>

                    {renderOrderedContent(post.content)}

                    {/* Post Image */}
                    {post.imageUrl && (
                      <Box sx={{
                        borderRadius: '12px',
                        overflow: 'hidden',
                        mt: 2,
                        mb: 1
                      }}>
                        <img
                          src={post.imageUrl}
                          alt="Post"
                          style={{
                            width: '100%',
                            maxHeight: '400px',
                            objectFit: 'cover'
                          }}
                        />
                      </Box>
                    )}

                    {/* Action Buttons for Post */}
                    <Box sx={{ display: 'flex', gap: 2, mt: 1.5 }}>
                      <Button
                        size='small'
                        className={`flex items-center gap-1 transition-colors duration-200 ${post.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                          }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          // Call like post handler if available
                          // For now just show the count
                        }}
                        sx={{ textTransform: 'none', minWidth: 'auto', px: 1, backgroundColor: 'transparent !important' }}
                      >
                        <i className={`ri-heart-${post.isLiked ? 'fill' : 'line'} text-sm`} />
                        <Typography variant='caption' className='text-xs'>
                          {post.likeCount || post.likes?.length || 0}
                        </Typography>
                      </Button>

                      <Button
                        size='small'
                        className='flex items-center gap-1 text-gray-500 hover:text-blue-500'
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onReply && currentComment) {
                            // Reply to the post (top-level comment)
                            onReply(null, post)
                          }
                        }}
                        sx={{ textTransform: 'none', minWidth: 'auto', px: 1, backgroundColor: 'transparent !important' }}
                      >
                        <i className='ri-chat-3-line text-sm' />
                        <Typography variant='caption' className='text-xs'>
                          {totalCommentsCount ?? post.totalCommentsCount ?? allComments.length ?? 0}
                        </Typography>
                      </Button>
                    </Box>
                  </Box>
                </Box>

                {/* Vertical line connecting to comment below */}
                <Box sx={{
                  position: 'absolute',
                  left: '40px',
                  top: '72px',
                  bottom: 0,
                  width: '2px',
                  backgroundColor: '#e0e0e0'
                }} />
              </Box>
            )}

            {/* Thread Path - Show ALL ancestors from post to clicked comment */}
            {currentComment && (() => {
              const threadPath = buildThreadPath(currentComment)
              return threadPath.map((pathComment: any, index: number) => {
                const isLast = index === threadPath.length - 1
                return (
                  <Box key={pathComment.id} sx={{ position: 'relative', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
                    {/* Vertical line to next comment */}
                    {!isLast && (
                      <Box sx={{
                        position: 'absolute',
                        left: '40px',
                        top: '50px',
                        bottom: 0,
                        width: '2px',
                        backgroundColor: '#e0e0e0',
                        zIndex: 0
                      }} />
                    )}

                    <Box sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Avatar
                          src={pathComment.user?.profileImage || undefined}
                          sx={{ width: 40, height: 40, flexShrink: 0 }}
                        >
                          {pathComment.user?.nickname?.charAt(0)}
                        </Avatar>

                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '15px' }}>
                              {pathComment.user?.nickname}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '13px' }}>
                              {getTimeAgo(pathComment.createdAt)}
                            </Typography>
                          </Box>

                          {renderOrderedContent(pathComment.content)}

                          {/* Action Buttons - Show on all comments in thread path */}
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button
                              size='small'
                              className={`flex items-center gap-1 transition-colors duration-200 ${pathComment.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                                }`}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (onLike) onLike(pathComment.id)
                              }}
                              sx={{ textTransform: 'none', minWidth: 'auto', px: 1, backgroundColor: 'transparent !important' }}
                            >
                              <i className={`ri-heart-${pathComment.isLiked ? 'fill' : 'line'} text-sm`} />
                              <Typography variant='caption' className='text-xs'>
                                {pathComment.likeCount || 0}
                              </Typography>
                            </Button>

                            <Button
                              size='small'
                              className='flex items-center gap-1 text-gray-500 hover:text-blue-500'
                              onClick={(e) => {
                                e.stopPropagation()
                                if (onReply) onReply(pathComment, post)
                              }}
                              sx={{ textTransform: 'none', minWidth: 'auto', px: 1, backgroundColor: 'transparent !important' }}
                            >
                              <i className='ri-chat-3-line text-sm' />
                              <Typography variant='caption' className='text-xs'>
                                {pathComment.replies?.length || 0}
                              </Typography>
                            </Button>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                )
              })
            })()}

            {/* Clear Divider */}
            {currentComment && currentComment.replies && currentComment.replies.length > 0 && (
              <Box sx={{
                height: '12px',
                backgroundColor: '#f8f9fa',
                borderTop: '1px solid #e5e7eb',
                borderBottom: '1px solid #e5e7eb'
              }} />
            )}

            {/* All Replies with Full Hierarchy - Using CommentItem */}
            {currentComment && currentComment.replies && currentComment.replies.length > 0 && (
              <Box sx={{ p: 3 }}>
                {[...currentComment.replies]
                  .filter((reply: any) => !reply.parentCommentId || reply.parentCommentId === currentComment.id)
                  .sort((a: any, b: any) => {
                    // Newest first for top-level
                    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
                    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
                    return bTime - aTime
                  })
                  .map((reply: any) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      depth={0}
                      maxDepth={3}
                      onReply={onReply || (() => { })}
                      onLike={onLike || (() => { })}
                      onViewThread={(comment, post) => {
                        // Navigate to this comment's thread
                        setCurrentComment(comment)
                      }}
                      onCommentClick={(comment) => {
                        // Navigate to this comment's thread
                        setCurrentComment(comment)
                      }}
                      postData={post}
                      hideReplies={true}
                    />
                  ))}
              </Box>
            )}

            {/* No replies message */}
            {currentComment && (!currentComment.replies || currentComment.replies.length === 0) && (
              <Box sx={{ p: 4, textAlign: 'center', color: '#999' }}>
                <i className="ri-chat-3-line text-4xl mb-2" style={{ color: '#d0d0d0' }} />
                <Typography variant="body2">No replies yet</Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  Be the first to reply!
                </Typography>
              </Box>
            )}

            {/* Loading indicator */}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            )}
          </Box>
        </Box>

        {/* Reply Input Area */}
        {/* <Box sx={{
          p: 2,
          borderTop: '1px solid #e5e7eb',
          backgroundColor: 'white',
          position: 'sticky',
          bottom: 0
        }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Avatar 
              src={user?.profileImage || undefined}
              sx={{ width: 40, height: 40 }}
            >
              {user?.nickname?.charAt(0)}
            </Avatar>
            
            <TextField
              placeholder={`Reply to @${currentComment?.user?.nickname}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              multiline
              rows={3}
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '20px'
                }
              }}
            />
          </Box>

         
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <IconButton size="small">
              <ImageIcon />
            </IconButton>
            <IconButton size="small">
              <GifIcon />
            </IconButton>
            <IconButton size="small">
              <EmojiIcon />
            </IconButton>
            <IconButton size="small">
              <PollIcon />
            </IconButton>
          </Box>

        
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="caption" color="text.secondary">
              Anyone can reply & quote
            </Typography>
            <Button
              variant="contained"
              disabled={!replyText.trim()}
              onClick={handlePostReply}
              sx={{
                borderRadius: '20px',
                textTransform: 'none',
                px: 3
              }}
            >
              Post
            </Button>
          </Box>
        </Box> */}
      </Box>
    </Modal>
  )
}

export default ThreadView

