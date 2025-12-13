'use client'

import React from 'react'
import { Box, Typography, IconButton, Avatar, Button } from '@mui/material'
import { useRouter } from 'next/navigation'
import { TrendingPost } from '@/services/types/frontend'
import { useChat } from '@/components/layout/ChatContext'
import FeedApiService from '@/services/feedApi'
import PageLoader from '@/components/PageLoader'
import FollowButton from '@/components/FollowButton'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { usePostActions } from '@/hooks/usePostActions'
import { useMyPageActions } from '@/hooks/useMyPageActions'
import CommentThreadModal from '@/components/CommentThreadModal'
import ThreadView from '@/components/ThreadView'
import ReplyModal from '@/components/ReplyModal'
import CommentItem from '@/components/CommentItem'
import { userApi } from '@/services/userApi'
import { getCommunityBadgeDisplay } from '@/utils/badgeUtils'

const LifestylePage = () => {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { openChat, openSearch, showChat } = useChat()
  // Get auth state from Redux (same pattern as create page)
  const authState = useAppSelector((state) => (state as any).authReducer)
  const token = authState?.token
  const user = authState?.user
  const isAuthenticated = authState?.isAuthenticated
  const { likedPosts, likedComments, feedData } = useAppSelector((state) => (state as any).mypageReducer || {})

  const { handleLikePost } = usePostActions()

  // Use MyPageActions for like functionality (same as profile page)
  const {
    likePost: handleLikePostFromMyPage,
    likeComment: handleLikeCommentFromMyPage,
    loadAllDataStable
  } = useMyPageActions()

  const [remainingPosts, setRemainingPosts] = React.useState<TrendingPost[]>([])
  const [loading, setLoading] = React.useState(true)

  // Comments and likes state for each post
  const [postsData, setPostsData] = React.useState<Record<number, any>>({})

  // Follow status for each user
  const [followStatus, setFollowStatus] = React.useState<Record<number, boolean>>({})

  // Modal states (same as profile page)
  const [replyModalOpen, setReplyModalOpen] = React.useState(false)
  const [threadViewOpen, setThreadViewOpen] = React.useState(false)
  const [threadModalOpen, setThreadModalOpen] = React.useState(false)
  const [selectedComment, setSelectedComment] = React.useState<any>(null)
  const [selectedPost, setSelectedPost] = React.useState<TrendingPost | null>(null)

  // Enrich data with like status from global state (same as profile page)
  const enrichDataWithLikes = React.useCallback((data: any) => {
    if (!data) return data

    const enrichComments = (comments: any[]): any[] =>
      comments.map(comment => {
        // Check if Redux has already updated this comment's like status
        const isLiked = comment.isLiked !== undefined ? comment.isLiked : likedComments.includes(comment.id)
        // Use the like count from Redux if available, otherwise fall back to original data
        const likeCount = comment.likeCount !== undefined ? comment.likeCount : (comment.likes?.length || 0)

        return {
          ...comment,
          isLiked,
          likeCount,
          replies: comment.replies ? enrichComments(comment.replies) : []
        }
      })

    const enrichPosts = (posts: any[]): any[] =>
      posts.map(post => {
        // Check if Redux has already updated this post's like status
        const isLiked = post.isLiked !== undefined ? post.isLiked : likedPosts.includes(post.id)
        // Use the like count from Redux if available, otherwise fall back to original data
        const likeCount = post.likeCount !== undefined ? post.likeCount : (post.likesCount || 0)

        return {
          ...post,
          isLiked,
          likeCount,
          comments: post.comments ? enrichComments(post.comments) : []
        }
      })

    return enrichPosts(data)
  }, [likedPosts, likedComments])

  // Memoized enriched posts data - use trending posts only (not user's own feed)
  const enrichedPosts = React.useMemo(() => {
    // For trending posts, always use remainingPosts (trending posts from other users)
    // Don't mix with feedData?.posts which contains current user's own posts
    return enrichDataWithLikes(remainingPosts)
  }, [remainingPosts, enrichDataWithLikes, likedPosts, likedComments])

  // Toggle post like function - direct API call for trending posts
  const togglePostLike = async (postId: number) => {
    if (!isAuthenticated || !token) {
      return
    }

    try {
      // Call the like API directly
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()

        if (result.success) {
          // Update the local state with the new like status and count
          setRemainingPosts(prevPosts =>
            prevPosts.map(post =>
              post.id === postId
                ? {
                  ...post,
                  isLiked: result.liked,
                  likeCount: result.likeCount,
                  likesCount: result.likeCount
                }
                : post
            )
          )

          // Also update Redux likedPosts array for consistency
          if (result.liked) {
            // Add to liked posts if not already there
            if (!likedPosts.includes(postId)) {
              dispatch({
                type: 'mypage/likePost/fulfilled',
                payload: { postId, liked: result.liked, likeCount: result.likeCount }
              })
            }
          } else {
            // Remove from liked posts
            dispatch({
              type: 'mypage/likePost/fulfilled',
              payload: { postId, liked: result.liked, likeCount: result.likeCount }
            })
          }
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }


  // Allow viewing without login; no redirect here

  // Load user data including liked posts when authenticated (same as profile page)
  React.useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadAllDataStable(user.id)
    }
  }, [isAuthenticated, user?.id, loadAllDataStable])

  // Fetch follow status for all unique users
  const fetchFollowStatus = React.useCallback(async (posts: TrendingPost[]) => {
    if (!isAuthenticated || !user) return

    try {
      // Get unique user IDs from posts
      const uniqueUserIds = [...new Set(posts.map(post => post.user?.id).filter(Boolean))]

      // Fetch follow status for each user
      const followStatusPromises = uniqueUserIds.map(async (userId) => {
        try {
          const status = await userApi.getFollowStatus(userId)
          return { userId, isFollowing: status || false }
        } catch (error) {
          return { userId, isFollowing: false }
        }
      })

      const followStatusResults = await Promise.all(followStatusPromises)

      // Convert to object for easy lookup
      const followStatusMap = followStatusResults.reduce((acc, { userId, isFollowing }) => {
        acc[userId] = isFollowing
        return acc
      }, {} as Record<number, boolean>)

      setFollowStatus(followStatusMap)
    } catch (error) {
      // Error fetching follow status
    }
  }, [isAuthenticated, user])

  // Fetch ALL trending posts (not just top 10)
  React.useEffect(() => {
    const fetchAllTrendingPosts = async () => {
      try {
        setLoading(true)
        // Fetch both trending posts (top 10) and remaining posts (all others)
        const [trendingResponse, remainingResponse] = await Promise.all([
          FeedApiService.getTrendingPosts(),
          FeedApiService.getRemainingTrendingPosts()
        ])

        let allPosts: TrendingPost[] = []
        
        // Combine top 10 trending posts with remaining posts
        if (trendingResponse.success && trendingResponse.data) {
          const trendingPosts = Array.isArray(trendingResponse.data) ? trendingResponse.data : []
          allPosts = [...trendingPosts]
        }
        
        if (remainingResponse.success && remainingResponse.data) {
          const remainingPosts = Array.isArray(remainingResponse.data) ? remainingResponse.data : []
          allPosts = [...allPosts, ...remainingPosts]
        }

        // Sort all posts by likes count (descending)
        allPosts.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))
        
        setRemainingPosts(allPosts)

        // Fetch follow status for all users in posts (only if authenticated)
        if (isAuthenticated && user) {
          await fetchFollowStatus(allPosts)
        }
      } catch (error) {
        // Error fetching posts
      } finally {
        setLoading(false)
      }
    }

    // Fetch all posts (works for both authenticated and non-authenticated users)
    fetchAllTrendingPosts()
  }, [isAuthenticated, user, fetchFollowStatus])


  // Threads-style modal handlers (same as profile page)
  // Handler for commenting directly on a post (no parent comment)
  const handleCommentOnPost = React.useCallback((post: any) => {
    setSelectedComment(null) // No parent comment - this is a top-level comment
    setSelectedPost(post)
    setReplyModalOpen(true)
  }, [])

  // Handler for replying to a specific comment
  const handleReplyClick = React.useCallback((comment: any, post: any) => {
    setSelectedComment(comment)
    setSelectedPost(post)
    setReplyModalOpen(true)
  }, [])

  const handleThreadClick = React.useCallback((comment: any, post: any) => {
    setSelectedComment(comment)
    setSelectedPost(post)
    setThreadViewOpen(true)
  }, [])

  // Handler for clicking on a comment to view its thread
  const handleCommentClick = React.useCallback((comment: any, post: any) => {
    setSelectedComment(comment)
    setSelectedPost(post)
    setThreadViewOpen(true)
  }, [])

  // Handle comment like using Redux (same as profile page)
  const handleLikeComment = async (commentId: number) => {
    try {
      const result = await handleLikeCommentFromMyPage(commentId)
    } catch (error) {
      // Error liking comment
    }
  }

  // Handle modal close (same as profile page)
  const handleCloseModals = React.useCallback(() => {
    setReplyModalOpen(false)
    setThreadViewOpen(false)
    setThreadModalOpen(false)
    setSelectedComment(null)
    setSelectedPost(null)
  }, [])

  // Handle follow status change
  const handleFollowChange = React.useCallback((userId: number, isFollowing: boolean) => {
    setFollowStatus(prev => ({
      ...prev,
      [userId]: isFollowing
    }))
  }, [])

  // Helper to render ordered content (same as post-detail page)
  const renderOrderedContent = (content: any) => {
    if (!content) return null

    let orderedContent
    try {
      if (Array.isArray(content)) {
        orderedContent = content
      } else if (typeof content === 'string') {
        orderedContent = JSON.parse(content)
      } else {
        orderedContent = content
      }
    } catch (error) {
      if (typeof content === 'string' && (content.includes('<p>') || content.includes('<div>') || content.includes('<img'))) {
        return (
          <Box
            className='text-gray-800 mb-3 ql-editor-content'
            dangerouslySetInnerHTML={{ __html: content }}
            sx={{
              '& p': { margin: '0 0 12px 0', wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word' },
              '& img': { maxWidth: '100%', height: 'auto', borderRadius: '8px', margin: '12px 0' },
              '& strong': { fontWeight: 600 },
              '& em': { fontStyle: 'italic' },
              '& u': { textDecoration: 'underline' },
              '& a': { color: '#3b82f6', textDecoration: 'underline' },
              '& ul, & ol': { paddingLeft: '1.5rem', marginBottom: '12px' },
              '& li': { marginBottom: '4px' },
              '& h1, & h2, & h3': { fontWeight: 600, marginBottom: '12px' },
              '& h1': { fontSize: '1.875rem' },
              '& h2': { fontSize: '1.5rem' },
              '& h3': { fontSize: '1.25rem' }
            }}
          />
        )
      }
      return (
        <Typography className='text-gray-800 mb-4 text-[12px] leading-relaxed' sx={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {content}
        </Typography>
      )
    }

    if (Array.isArray(orderedContent)) {
      return (
        <Box className='space-y-3 mb-4'>
          {orderedContent.map((item, index) => (
            <Box key={item.id || index}>
              {item.type === 'text' && (
                <Typography className='text-gray-800 text-[12px] leading-relaxed' sx={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
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
                  <img src={item.url} alt="Post image" className='w-full h-full object-cover' />
                </Box>
              )}
              {item.type === 'file' && (
                <Box className='flex items-center bg-gray-400 text-white rounded-lg px-3 py-2 w-full max-w-md'>
                  <i className='ri-folder-2-line mr-2' />
                  <Box className="h-8 bg-white mr-2" sx={{ width: '1px' }} />
                  <span className='flex-1 truncate'>{item.name}</span>
                  <IconButton className='ml-2 p-1' onClick={() => { alert(`다운로드 기능이 곧 추가될 예정입니다: ${item.name}`); }} title={`${item.name} 다운로드`}>
                    <i className='ri-download-line text-white text-xl' />
                  </IconButton>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )
    }
    return (
      <Typography className='text-gray-800 mb-4 text-[12px] leading-relaxed' sx={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {content}
      </Typography>
    )
  }

  const goToProfile = (userId?: number | null) => {
    if (!userId) return
    router.push(`/profile?userId=${userId}`)
  }

  return (
    <Box className="min-h-screen bg-white pb-28 md:pb-8">
      {/* Header */}
      <Box className="pt-8 pb-6 border-b border-gray-200">
        <Box className="relative flex items-center justify-center">
          <Box className="absolute left-0 flex items-center">
            <IconButton onClick={() => router.back()} className="mr-1">
              <i className="ri-arrow-left-s-line text-xl" />
            </IconButton>
            <Typography variant="body2" className="text-gray-700">
              뒤로
            </Typography>
          </Box>
          {/* <Typography variant="h5" className="font-bold text-black">
            Lifestyle
          </Typography> */}
        </Box>
      </Box>

      {/* Feed Posts */}
      <Box className="py-6">
        {loading ? (
          <PageLoader />
        ) : enrichedPosts.length > 0 ? (
          enrichedPosts.map((post: any) => {
            return (
              <Box key={post.id} className="mb-8 pb-2 px-4">
                <Box className="bg-white rounded-lg w-full px-2">
                  <Box className="flex items-center justify-between mb-4 w-full">
                    <Box className="flex items-center gap-3 w-full">
                      {post.user?.profileImage ? (
                        <Avatar
                          className="w-12 h-12 bg-gray-200 cursor-pointer"
                          src={post.user?.profileImage || undefined}
                          onClick={e => {
                            e.stopPropagation()
                            goToProfile(post.user?.id)
                          }}
                        >
                          {post.user?.nickname?.charAt(0)}
                        </Avatar>
                      ) : (
                        <i className="ri-user-line text-white text-xs" />
                      )}
                      <Box className="w-full">
                        <Box className="flex items-center justify-between w-full">
                          <Box className="flex items-center gap-2 w-full">
                            <Typography
                              variant="h6"
                              className="text-gray-900 font-semibold cursor-pointer"
                              onClick={e => {
                                e.stopPropagation()
                                goToProfile(post.user?.id)
                              }}
                            >
                              {post.user?.nickname || '익명'}
                            </Typography>
                            {(() => {
                              const badgeDisplay = getCommunityBadgeDisplay(post.user?.activeCommunityBadge)
                              if (!badgeDisplay) return null
                              return (
                                <img
                                  src={badgeDisplay.image}
                                  alt={badgeDisplay.label}
                                  className="w-5 h-5 object-contain"
                                  title={`커뮤니티 등급: ${badgeDisplay.label}`}
                                />
                              )
                            })()}
                          </Box>
                          <Box className="justify-self-end">
                            <FollowButton
                              userId={post.user?.id || 0}
                              userNickname={post.user?.nickname || 'User'}
                              size="small"
                              isFollowing={followStatus[post.user?.id || 0] || false}
                              onFollowChange={(isFollowing, counts) => {
                                handleFollowChange(post.user?.id || 0, isFollowing)
                              }}
                            />
                          </Box>
                        </Box>
                        <Typography variant="caption" className="text-gray-500">
                          {new Date(post.createdAt).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box onClick={() => router.push(`/post/${post.id}`)} style={{ cursor: 'pointer' }}>
                    {renderOrderedContent(post.content)}
                  </Box>

                  <Box className="flex items-center gap-4 mb-2">
                    <Button
                      size='small'
                      className={`flex items-center gap-1 transition-colors duration-200 ${post.isLiked
                        ? 'text-red-500'
                        : 'text-gray-500'
                        }`}
                      onClick={async (e) => {
                        e.stopPropagation()
                        await togglePostLike(post.id)
                      }}
                      sx={{
                        textTransform: 'none',
                        minWidth: 'auto',
                        px: 1,
                        backgroundColor: 'transparent !important',
                        '&:hover': { backgroundColor: 'transparent !important' },
                        '&:focus': { backgroundColor: 'transparent !important' },
                        '&:active': { backgroundColor: 'transparent !important' }
                      }}
                    >
                      <i className={`ri-heart-${post.isLiked ? 'fill' : 'line'}`} />
                      <Typography variant='caption' className={`transition-colors duration-200 ${post.isLiked ? 'text-red-500' : 'text-gray-500'}`}>
                        {post.likeCount || post.likesCount || 0}
                      </Typography>
                    </Button>

                    <Button
                      size='small'
                      className='flex items-center gap-1 text-gray-500 hover:text-blue-500'
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCommentOnPost(post)
                      }}
                      sx={{
                        textTransform: 'none',
                        minWidth: 'auto',
                        px: 1,
                        backgroundColor: 'transparent !important',
                        '&:hover': { backgroundColor: 'transparent !important' },
                        '&:focus': { backgroundColor: 'transparent !important' },
                        '&:active': { backgroundColor: 'transparent !important' }
                      }}
                    >
                      <i className='ri-chat-3-line' />
                      <Typography variant='caption' className='text-gray-500'>
                        {post.commentsCount || post.comments?.length || 0}
                      </Typography>
                    </Button>

                    <Button
                      className="flex items-center gap-1 text-gray-500 hover:text-green-500 p-0"
                      sx={{
                        textTransform: 'none',
                        minWidth: 'auto',
                        backgroundColor: 'transparent !important',
                        '&:hover': { backgroundColor: 'transparent !important' },
                        '&:focus': { backgroundColor: 'transparent !important' },
                        '&:active': { backgroundColor: 'transparent !important' }
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/post/${post.id}`)
                      }}
                    >
                      <i className="ri-share-forward-line text-sm" />
                    </Button>
                  </Box>
                </Box>
              </Box>
            )
          })
        ) : (
          <Box className="text-center py-8">
            <Typography variant="body1" className="text-gray-500">
              No more trending posts available
            </Typography>
          </Box>
        )}
      </Box>

      {!showChat && (
        <Box
          className="fixed right-4 transform z-30"
          sx={{ bottom: { xs: 88, md: 40 } }}
        >
          <Button
            variant="contained"
            startIcon={<i className='ri-add-line' />}
            sx={{
              backgroundColor: 'gray',
              color: '#fff',
              borderRadius: '10px',
              px: 2.5,
              py: 2,
              boxShadow: '0 8px 18px rgba(0,0,0,0.15)',
              textTransform: 'none',
              '&:hover': { backgroundColor: '#gray' }
            }}
            onClick={() => router.push('/feed/create')}
          >
            피드 작성하기
          </Button>
        </Box>
      )}

      {/* Threads-style Reply Modal */}
      <ReplyModal
        isOpen={replyModalOpen}
        onClose={handleCloseModals}
        postId={selectedPost?.id || 0}
        parentCommentId={selectedComment?.id}
        originalComment={selectedComment}
        originalPost={selectedPost}
      />

      {/* Thread View Modal */}
      <ThreadView
        isOpen={threadViewOpen}
        onClose={handleCloseModals}
        comment={selectedComment}
        post={selectedPost}
        postId={selectedPost?.id || 0}
        allComments={[]}
        onReply={(comment, post) => {
          setSelectedComment(comment)
          setReplyModalOpen(true)
        }}
        onLike={handleLikeComment}
        totalCommentsCount={0}
      />

      {/* Comment Thread Modal */}
      <CommentThreadModal
        isOpen={threadModalOpen}
        onClose={handleCloseModals}
        postId={selectedPost?.id || 0}
        parentComment={selectedComment}
        originalPost={selectedPost}
        childReplies={selectedComment?.replies || []}
      />
    </Box>
  )
}

export default LifestylePage

