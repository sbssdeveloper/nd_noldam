'use client'

import React, { useState } from 'react'
import { Box, Typography, Button, Avatar } from '@mui/material'
import IconButton from '@mui/material/IconButton'
import { getCommunityBadgeDisplay } from '@/utils/badgeUtils'
interface CommentItemProps {
  comment: any
  depth?: number
  maxDepth?: number
  onReply: (comment: any, post: any) => void
  onLike: (commentId: number) => void
  onViewThread?: (comment: any, post: any) => void
  onCommentClick?: (comment: any, post: any) => void
  postData: any
  currentUserId?: number
  isOptimistic?: boolean
  onOptimisticLike?: (comment: any) => void
  hideReplies?: boolean // Don't show nested replies, only the comment itself
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  depth = 0,
  maxDepth = 3,
  onReply,
  onLike,
  onViewThread,
  onCommentClick,
  postData,
  currentUserId,
  isOptimistic = false,
  onOptimisticLike,
  hideReplies = false
}) => {
  const [showReplies, setShowReplies] = useState(false) // Don't auto-expand - user must click comment to see thread
  const [isExpanded, setIsExpanded] = useState(false) // For "See more" text expansion

  // Get replies for this comment
  const replies = comment.replies || []
  const hasReplies = replies.length > 0
  const isAtMaxDepth = depth >= maxDepth

  // Render ordered content for comments
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

  // Determine if text should be truncatable
  const shouldTruncate = comment.content && comment.content.length > 150

  return (
    <Box className="comment-item">
      {/* Main Comment */}
      <Box
        className={`flex items-start gap-3 ${depth > 0 ? 'ml-8' : ''
          } relative`}
        sx={{
          position: 'relative',
          paddingLeft: depth > 0 ? '20px' : 0,
          '&::before': depth > 0 ? {
            content: '""',
            position: 'absolute',
            left: '-8px',
            top: 0,
            bottom: hasReplies && showReplies ? '0' : '100%',
            width: '2px',
            backgroundColor: '#e0e0e0',
            zIndex: 0
          } : {}
        }}
      >
        {/* Threading Line - Horizontal connector */}
        {depth > 0 && (
          <Box
            sx={{
              position: 'absolute',
              left: '-8px',
              top: '24px',
              width: '12px',
              height: '2px',
              backgroundColor: '#e0e0e0',
              zIndex: 0
            }}
          />
        )}

        <Box
          className={`flex-1 ${depth === 0 ? 'p-4 bg-white rounded-lg' : 'py-3 px-2'} transition-colors duration-200 cursor-pointer`}
          onClick={() => {
            if (onCommentClick) {
              onCommentClick(comment, postData)
            }
          }}
        >
          <Box className="flex items-start gap-3">
            <Avatar
              className={`${depth === 0 ? 'w-8 h-8' : 'w-7 h-7'} bg-gray-200 flex-shrink-0`}
              src={comment.user?.profileImage || undefined}
              sx={{ position: 'relative', zIndex: 1 }}
            >
              {comment.user?.nickname?.charAt(0) || ''}
            </Avatar>

            <Box className='flex-1 min-w-0'>
              {/* User Info */}
              <Box className='flex items-center gap-2 mb-1'>
                <Typography variant='body2' className='text-gray-900 font-semibold'>
                  {comment.user?.nickname || 'Unknown User'}
                </Typography>

                {/* Community Rating Badge */}
                {(() => {
                  const badgeDisplay = getCommunityBadgeDisplay((comment.user as any)?.activeCommunityBadge)
                  if (!badgeDisplay) return null
                  return (
                    <img
                      src={badgeDisplay.image}
                      alt={badgeDisplay.label}
                      className='w-3 h-3 object-contain ml-1'
                      title={`커뮤니티 등급: ${badgeDisplay.label}`}
                    />
                  )
                })()}

                <Typography variant='caption' className='text-gray-500'>
                  {comment.createdAt ? new Date(comment.createdAt).toLocaleString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '시간 없음'}
                </Typography>
              </Box>

              {/* Comment Content */}
              <Box className='mb-2'>
                {shouldTruncate && !isExpanded ? (
                  <Typography
                    variant='body2'
                    className='text-gray-800 leading-relaxed'
                    sx={{
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {typeof comment.content === 'string' && comment.content.length > 150
                      ? `${comment.content.slice(0, 150)}...`
                      : comment.content || '내용 없음'
                    }
                  </Typography>
                ) : (
                  renderOrderedContent(comment.content)
                )}
              </Box>

              {/* See More/Less Button */}
              {shouldTruncate && (
                <Button
                  size="small"
                  onClick={() => setIsExpanded(!isExpanded)}
                  sx={{
                    textTransform: 'none',
                    color: '#666',
                    fontSize: '13px',
                    p: 0,
                    minWidth: 'auto',
                    mb: 1,
                    '&:hover': { backgroundColor: 'transparent', color: '#000' }
                  }}
                >
                  {isExpanded ? 'See less' : 'See more'}
                </Button>
              )}

              {/* Actions */}
              <Box className='flex items-center gap-4 mt-2'>
                {/* Like Button */}
                <Button
                  size='small'
                  className={`flex items-center gap-1 transition-colors duration-200 ${comment.isLiked
                    ? 'text-red-500'
                    : 'text-gray-500 hover:text-red-500'
                    }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (isOptimistic && onOptimisticLike) {
                      onOptimisticLike(comment)
                    } else if (typeof comment.id === 'number') {
                      onLike(comment.id)
                    }
                  }}
                  sx={{
                    textTransform: 'none',
                    minWidth: 'auto',
                    px: 1,
                    backgroundColor: 'transparent !important',
                    '&:hover': { backgroundColor: 'transparent !important' }
                  }}
                >
                  <i className={`ri-heart-${comment.isLiked ? 'fill' : 'line'} text-sm`} />
                  <Typography variant='caption' className={`text-xs ${comment.isLiked ? 'text-red-500' : 'text-gray-500'}`}>
                    {comment.likeCount || comment.likes?.length || 0}
                  </Typography>
                </Button>

                {/* Reply Button */}
                <Button
                  size='small'
                  className='flex items-center gap-1 text-gray-500 hover:text-blue-500'
                  onClick={(e) => {
                    e.stopPropagation()
                    onReply(comment, postData)
                  }}
                  sx={{
                    textTransform: 'none',
                    minWidth: 'auto',
                    px: 1,
                    backgroundColor: 'transparent !important',
                    '&:hover': { backgroundColor: 'transparent !important' }
                  }}
                >
                  <i className='ri-chat-3-line text-sm' />
                  <Typography variant='caption' className='text-xs'>
                    {replies.length || 0}
                  </Typography>
                </Button>

                {/* View Thread Button - Only show if has replies and at depth limit */}
                {hasReplies && isAtMaxDepth && onViewThread && (
                  <Button
                    size='small'
                    className='flex items-center gap-1 text-blue-500 hover:text-blue-600'
                    onClick={(e) => {
                      e.stopPropagation()
                      onViewThread(comment, postData)
                    }}
                    sx={{
                      textTransform: 'none',
                      minWidth: 'auto',
                      px: 1,
                      backgroundColor: 'transparent !important',
                      '&:hover': { backgroundColor: 'transparent !important' }
                    }}
                  >
                    <i className='ri-arrow-right-line text-sm' />
                    <Typography variant='caption' className='text-xs font-medium'>
                      View thread ({replies.length})
                    </Typography>
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Nested Replies - Hidden if hideReplies is true */}
      {!hideReplies && hasReplies && !isAtMaxDepth && (
        <Box className="replies-container mt-3">
          {/* Show/Hide Replies Toggle */}
          {depth > 0 && (
            <Button
              size="small"
              onClick={() => setShowReplies(!showReplies)}
              sx={{
                textTransform: 'none',
                color: '#0066cc',
                fontSize: '13px',
                fontWeight: 500,
                ml: depth > 0 ? `${depth * 20 + 20}px` : '0px',
                mb: 1,
                p: 0,
                minWidth: 'auto',
                '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' }
              }}
            >
              {showReplies ? (
                <>
                  <i className="ri-subtract-line text-sm mr-1" />
                  Hide {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </>
              ) : (
                <>
                  <i className="ri-add-line text-sm mr-1" />
                  View {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </>
              )}
            </Button>
          )}

          {/* Render Nested Comments */}
          {showReplies && (
            <Box className="space-y-3">
              {[...replies]
                .sort((a: any, b: any) => {
                  // Oldest first for conversation flow
                  const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
                  const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
                  return aTime - bTime
                })
                .map((reply: any) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    depth={depth + 1}
                    maxDepth={maxDepth}
                    onReply={onReply}
                    onLike={onLike}
                    onViewThread={onViewThread}
                    onCommentClick={onCommentClick}
                    postData={postData}
                    currentUserId={currentUserId}
                    hideReplies={hideReplies}
                  />
                ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

export default CommentItem

