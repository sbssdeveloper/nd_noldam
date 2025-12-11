'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getTimeAgo, formatDateTime, getCurrentTimestamp } from '@/utils/dateTimeUtils';
import { useParams, useRouter } from 'next/navigation';
import { useNavigation } from '@/contexts/NavigationContext';
import PageLoader from '@/components/PageLoader'
import {
  Box,
  Typography,
  Avatar,
  Button,
  Card,
  CardContent,
  TextField,
  CircularProgress,
  Divider,
  Chip,
  IconButton,
  Collapse,
  Alert,
  Modal,
  Fade,
  Backdrop,
} from '@mui/material';
import { useAppSelector } from '@/store/hooks';
import { usePostActions } from '@/hooks/usePostActions';
import { useMyPageActions } from '@/hooks/useMyPageActions';
import { getActiveCommunityBadge, getCommunityBadgeDisplay, isCurrentUser } from '@/utils/badgeUtils';
import { userApi } from '@/services/userApi';
import ReplyModal from '@/components/ReplyModal';
import ThreadView from '@/components/ThreadView';
import CommentThreadModal from '@/components/CommentThreadModal';
import CommentItem from '@/components/CommentItem';
import FollowButton from '@/components/FollowButton';
import type { Comment, Post } from '@/services/types/shared';
import type { ThreadedReplies } from '@/services/types/frontend';

// Comment and Post interfaces moved to centralized types

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { navigate } = useNavigation();
  const postId = params?.id as string;

  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());

  // Separate state for threaded replies
  const [threadedReplies, setThreadedReplies] = useState<ThreadedReplies>({});

  // Helper functions for threaded replies
  const getThreadedReplyText = (commentId: number) => threadedReplies[commentId] || '';
  const setThreadedReplyText = (commentId: number, text: string) => {
    setThreadedReplies(prev => ({ ...prev, [commentId]: text }));
  };
  const clearThreadedReply = (commentId: number) => {
    setThreadedReplies(prev => {
      const newState = { ...prev };
      delete newState[commentId];
      return newState;
    });
  };
  const [loadingMore, setLoadingMore] = useState(false);
  const [commentPage, setCommentPage] = useState(1);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followStatusLoading, setFollowStatusLoading] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // Threads-style modal states
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [threadViewOpen, setThreadViewOpen] = useState(false);
  const [threadModalOpen, setThreadModalOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<any>(null);

  // Use Redux for authentication
  const { user, isAuthenticated, token } = useAppSelector((state) => state.authReducer)

  // Use Redux for profile and badge data
  const {
    profileData,
    badgesData,
    loadAllDataStable
  } = useMyPageActions();

  // Use Redux for post management
  const {
    currentPost: post,
    comments,
    loading,
    error,
    likeLoading,
    commentLoading,
    hasMoreComments,
    totalComments,
    loadPost,
    handleLikePost,
    handleAddComment,
    handleLikeComment,
    handleClearPost
  } = usePostActions();

  // Get current community badge (highest earned one) - this is the ACTIVE badge to show beside profile
  const currentCommunityBadge = getActiveCommunityBadge(null);

  // Show loading state if user data is not available
  if (!isAuthenticated || !user) {
    return (
      <Box className="flex items-center justify-center min-h-screen">
        <CircularProgress />
      </Box>
    );
  }

  // Function to fetch follow status
  const fetchFollowStatus = async (targetUserId: number) => {
    if (!isAuthenticated || !user || Number(user.id) === targetUserId) {
      return;
    }

    try {
      setFollowStatusLoading(true);
      const followStatus = await userApi.getFollowStatus(targetUserId);
      if (followStatus !== null) {
        setIsFollowing(followStatus);
      }
    } catch (error) {
      // Error fetching follow status
    } finally {
      setFollowStatusLoading(false);
    }
  };

  useEffect(() => {
    if (postId) {
      loadPost(postId);
    }

    // Load profile and badge data
    if (profileData?.data?.user?.id) {
      loadAllDataStable(profileData.data.user.id);
    }

    // Cleanup on unmount
    return () => {
      handleClearPost();
      // Clear any pending timeouts or intervals
      setLocalError(null);
    };
  }, [postId, loadPost, loadAllDataStable, handleClearPost]);

  // Fetch follow status when post is loaded
  useEffect(() => {
    if (post?.user?.id && isAuthenticated && user) {
      fetchFollowStatus(post.user.id);
    }
  }, [post?.user?.id, isAuthenticated, user]);


  const loadMoreComments = async () => {
    if (loadingMore || !hasMoreComments) return;

    try {
      setLoadingMore(true);

      // Use Redux action instead of direct fetch
      // await handleLoadMoreComments(postId, commentPage + 1);
      // Load more comments not implemented yet
      setCommentPage(prev => prev + 1);
      setLoadingMore(false);
    } catch (err) {
      // Error loading more comments
      setLoadingMore(false);
    }
  };

  const goToProfile = React.useCallback((targetUserId?: number | null) => {
    if (!targetUserId) return;
    navigate(`/profile?userId=${targetUserId}`);
  }, [navigate]);

  const addComment = async (content: string, parentCommentId: number | null = null) => {
    if (!postId) return;

    if (!content || !content.trim()) {
      setLocalError('댓글 내용을 입력해주세요.');
      return;
    }

    try {
      await handleAddComment(postId.toString(), content, parentCommentId);
      if (parentCommentId) {
        clearThreadedReply(parentCommentId);
      } else {
        setNewComment('');
      }
      setReplyingTo(null);
      setLocalError(null);
    } catch (error) {
      // Error adding comment
      setLocalError('Failed to add comment. Please try again.');
    }
  };

  const togglePostLike = async () => {
    if (!postId) return;

    try {
      await handleLikePost(postId.toString());
    } catch (error) {
      // Error toggling post like
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/post/${postId}`;
    setShareUrl(url);
    setShareModalOpen(true);
  };

  const handleFollowChange = (newIsFollowing: boolean, counts: { followingCount: number; followersCount: number }) => {
    setIsFollowing(newIsFollowing);
    // You could also update any follower count displays here if needed
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      // You could add a toast notification here
    } catch (err) {
      // Error copying to clipboard
      // Fallback for older browsers - use a completely safe approach
      try {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        textArea.style.opacity = '0';
        textArea.style.pointerEvents = 'none';
        textArea.style.zIndex = '-1000';
        textArea.setAttribute('readonly', '');

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, 99999); // For mobile devices

        const successful = document.execCommand('copy');

        // Safe removal with proper error handling
        const safeRemoveElement = () => {
          try {
            // Check if element still exists and is in the DOM
            if (textArea && textArea.parentNode && document.body.contains(textArea)) {
              textArea.parentNode.removeChild(textArea);
            }
          } catch (removeErr) {
            // Silently handle removal errors - element might already be removed
          }
        };

        // Try immediate removal
        safeRemoveElement();

        // Cleanup with timeout as backup
        setTimeout(safeRemoveElement, 50);

        if (!successful) {
          throw new Error('Copy command was unsuccessful');
        }
      } catch (fallbackErr) {
        // Fallback copy failed
        // If all else fails, just show the URL to the user
        alert(`링크를 복사할 수 없습니다. 수동으로 복사해주세요: ${shareUrl}`);
      }
    }
  };

  // File download function
  const handleFileDownload = async (fileItem: any) => {

    if (!fileItem) {
      alert('파일 정보가 올바르지 않습니다.\n파일 데이터가 없습니다.');
      return;
    }

    // Get fileName early (needed for File object handling)
    const fileName = fileItem.name || fileItem.fileName || fileItem.filename ||
      fileItem.file?.name || 'download';

    // Try to find the file URL from different possible properties
    let fileUrl = fileItem.url || fileItem.fileUrl || fileItem.src || fileItem.path;

    // If still no URL, check if it's a file object with a different structure
    if (!fileUrl && fileItem.file) {

      // Check nested file object properties
      fileUrl = fileItem.file.url ||
        fileItem.file.fileUrl ||
        fileItem.file.src ||
        fileItem.file.path ||
        fileItem.file.webkitRelativePath;

      // If file object has a File type, we need to read it differently
      if (!fileUrl && fileItem.file instanceof File) {
        // For File objects, we can create a blob URL
        const blobUrl = URL.createObjectURL(fileItem.file);
        // Download directly from blob
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 100);
        alert(`파일 다운로드가 완료되었습니다.\n파일명: ${fileName}`);
        setDownloadingFileId(null);
        return;
      }
    }

    // If fileId exists, try to construct URL
    if (!fileUrl && fileItem.fileId) {
      fileUrl = `/uploads/posts/${fileItem.fileId}`;
    }

    // If we have an id, try to construct URL from it
    // Files are typically stored as: /uploads/posts/{userId}_{timestamp}_{random}.{ext}
    // The id format looks like: '1762418989995-ptbigl2l2' which might be the server filename
    if (!fileUrl && fileItem.id) {
      // Try using id directly as filename (it might already be the server filename)
      fileUrl = `/uploads/posts/${fileItem.id}`;

      // If id doesn't have extension and we have a name, try to add extension
      if (!fileItem.id.includes('.') && fileItem.name) {
        const extension = fileItem.name.split('.').pop();
        if (extension) {
          fileUrl = `/uploads/posts/${fileItem.id}.${extension}`;
        }
      }
    }

    if (!fileUrl) {
      console.error('No URL found in file item:', fileItem);
      console.error('File object structure:', fileItem.file);
      alert(`파일 정보가 올바르지 않습니다.\n파일 URL을 찾을 수 없습니다.\n\n파일명: ${fileItem.name || '알 수 없음'}\n\n파일 데이터를 콘솔에서 확인하세요.`);
      return;
    }

    // Update fileName from URL if we found one and name wasn't set
    const finalFileName = fileName === 'download' && fileUrl
      ? fileUrl.split('/').pop() || fileName
      : fileName;

    const fileId = fileItem.id || fileItem.url;
    if (downloadingFileId === fileId) {
      return; // Already downloading
    }

    try {
      setDownloadingFileId(fileId);

      // Get authentication token from Redux or localStorage
      let authToken = token;
      if (!authToken && typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('noldam-root') || localStorage.getItem('persist:noldam-root');
          if (stored) {
            const parsed = JSON.parse(stored);
            const auth = JSON.parse(parsed.auth || '{}');
            authToken = auth.token || null;
          }
        } catch (e) {
          // Failed to get token from localStorage
        }
      }

      // Prepare headers
      const headers: HeadersInit = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      // Handle relative URLs - prepend base URL if needed
      let finalFileUrl = fileUrl;
      if (finalFileUrl && !finalFileUrl.startsWith('http://') && !finalFileUrl.startsWith('https://')) {
        // Relative URL - prepend current origin
        if (finalFileUrl.startsWith('/')) {
          finalFileUrl = `${window.location.origin}${finalFileUrl}`;
        } else {
          finalFileUrl = `${window.location.origin}/${finalFileUrl}`;
        }
      }

      // Fetch the file
      const response = await fetch(finalFileUrl, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          alert(`파일을 찾을 수 없습니다.\n파일명: ${finalFileName}\nURL: ${finalFileUrl}`);
        } else if (response.status === 403) {
          alert(`파일 다운로드 권한이 없습니다.\n파일명: ${finalFileName}`);
        } else {
          alert(`파일 다운로드에 실패했습니다.\n오류 코드: ${response.status}\n파일명: ${finalFileName}`);
        }
        return;
      }

      // Get file as blob
      const blob = await response.blob();

      if (!blob || blob.size === 0) {
        alert(`파일이 비어있거나 손상되었습니다.\n파일명: ${finalFileName}`);
        return;
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = finalFileName;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      // Success message
      const fileSizeMB = (blob.size / (1024 * 1024)).toFixed(2);
      alert(`파일 다운로드가 완료되었습니다.\n파일명: ${finalFileName}\n크기: ${fileSizeMB} MB`);

    } catch (error) {
      console.error('File download error:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      alert(`파일 다운로드 중 오류가 발생했습니다.\n${errorMessage}\n파일명: ${finalFileName}`);
    } finally {
      setDownloadingFileId(null);
    }
  };

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
                  {/* Download button for images */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      borderRadius: '50%',
                      padding: '8px'
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileDownload({ ...item, name: item.name || item.url?.split('/').pop() || 'image.jpg' });
                      }}
                      disabled={downloadingFileId === (item.id || item.url)}
                      sx={{
                        color: 'white',
                        '&:disabled': {
                          opacity: 0.6,
                          cursor: 'not-allowed'
                        }
                      }}
                      title="이미지 다운로드"
                    >

                    </IconButton>
                  </Box>
                </Box>
              )}

              {item.type === 'file' && (
                <Box className='flex items-center bg-gray-400 text-white rounded-lg px-3 py-2 w-full max-w-md'>
                  <i className='ri-folder-2-line mr-2' />
                  <Box className="h-8 bg-white mr-2" sx={{ width: '1px' }} />
                  <span className='flex-1 truncate' title={item.name}>{item.name}</span>
                  <IconButton
                    className='ml-2 p-1'
                    onClick={() => {
                      handleFileDownload(item);
                    }}
                    disabled={downloadingFileId === (item.id || item.url)}
                    title={`${item.name} 다운로드`}
                    sx={{
                      '&:disabled': {
                        opacity: 0.6,
                        cursor: 'not-allowed'
                      }
                    }}
                  >
                    {downloadingFileId === (item.id || item.url) ? (
                      <CircularProgress size={20} className='text-white' />
                    ) : (
                      <i className='ri-download-line text-white text-xl' />
                    )}
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

  // Threads-style modal handlers
  const handleReplyClick = (comment: any) => {
    setSelectedComment(comment);
    setReplyModalOpen(true);
  };

  const handleThreadClick = (comment: any) => {
    setSelectedComment(comment);
    setThreadViewOpen(true);
  };

  const handleCommentTextClick = (comment: any) => {
    setSelectedComment(comment);
    setThreadModalOpen(true);
  };

  const handlePostCommentClick = () => {
    setSelectedComment(null); // No parent comment for post replies
    setReplyModalOpen(true);
  };

  const handleCloseModals = () => {
    setReplyModalOpen(false);
    setThreadViewOpen(false);
    setThreadModalOpen(false);
    setSelectedComment(null);
  };

  const addReplyToComment = (comments: Comment[], parentCommentId: number, newReply: Comment): Comment[] => {
    // Adding reply to comment
    return comments.map((comment: Comment) => {
      if (comment.id === parentCommentId) {
        // Found parent comment, adding reply
        return {
          ...comment,
          replies: [...(comment.replies || []), newReply]
        };
      }
      if (comment.replies) {
        return {
          ...comment,
          replies: addReplyToComment(comment.replies, parentCommentId, newReply)
        };
      }
      return comment;
    });
  };


  const toggleCommentLike = async (commentId: number) => {
    // Token is handled automatically by the API service

    try {
      await handleLikeComment(commentId);
      // Log updated state for this comment
      const findCommentById = (list: Comment[], id: number): Comment | null => {
        for (const c of list) {
          if (c.id === id) return c
          if (c.replies) {
            const found = findCommentById(c.replies, id)
            if (found) return found
          }
        }
        return null
      }
      const updated = findCommentById(comments, commentId)
    } catch (error) {
      // Error toggling comment like
    }
  };

  const updateCommentLikes = (comments: Comment[], commentId: number, isLiked: boolean, likeCount: number): Comment[] => {
    return comments.map((comment: Comment) => {
      if (comment.id === commentId) {
        return {
          ...comment,
          isLiked,
          likeCount
        };
      }
      if (comment.replies) {
        return {
          ...comment,
          replies: updateCommentLikes(comment.replies, commentId, isLiked, likeCount)
        };
      }
      return comment;
    });
  };

  const processCommentsWithLikes = (comments: Comment[], currentUserId: number | null): Comment[] => {
    return comments.map((comment: Comment) => {
      const isLiked = currentUserId ? comment.likes?.some((like: any) => like.userId === currentUserId) || false : false;
      const likeCount = comment.likeCount || comment.likes?.length || 0;

      return {
        ...comment,
        isLiked,
        likeCount,
        replies: comment.replies ? processCommentsWithLikes(comment.replies, currentUserId) : undefined
      };
    });
  };

  const toggleCommentExpansion = (commentId: number) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  // Function to flatten all nested replies for a specific comment
  const flattenAllReplies = (comment: Comment): Comment[] => {
    const flattened: Comment[] = [];

    const flatten = (replyList: Comment[]) => {
      replyList.forEach(reply => {
        flattened.push(reply);
        if (reply.replies && reply.replies.length > 0) {
          flatten(reply.replies);
        }
      });
    };

    if (comment.replies && comment.replies.length > 0) {
      flatten(comment.replies);
    }

    return flattened;
  };

  // Function to count total nested replies (including nested ones)
  const getTotalReplyCount = (comment: Comment): number => {
    let count = 0;

    const countReplies = (replyList: Comment[]) => {
      replyList.forEach(reply => {
        count++;
        if (reply.replies && reply.replies.length > 0) {
          countReplies(reply.replies);
        }
      });
    };

    if (comment.replies && comment.replies.length > 0) {
      countReplies(comment.replies);
    }

    return count;
  };

  // Function to count ALL comments including nested ones
  const getTotalCommentsCount = (commentsList: Comment[]): number => {
    let count = 0;

    const countAll = (list: Comment[]) => {
      list.forEach(comment => {
        count++; // Count this comment
        if (comment.replies && comment.replies.length > 0) {
          countAll(comment.replies); // Recursively count replies
        }
      });
    };

    countAll(commentsList);
    return count;
  };

  const renderComment = (comment: Comment) => {
    const timeAgo = getTimeAgo(comment.createdAt);

    return (
      <Box key={comment.id} className='mb-4'>
        <Box className='flex gap-3 min-w-0'>
          {/* Avatar */}
          <Avatar
            className='w-8 h-8 bg-gray-200 flex-shrink-0 cursor-pointer'
            src={comment.user.profileImage || undefined}
            onClick={() => goToProfile(comment.user.id)}
          >
            {comment.user.nickname.charAt(0)}
          </Avatar>

          {/* Comment Content */}
          <Box className='flex-1 min-w-0'>
            {/* Comment Header */}
            <Box className='flex items-center gap-2 mb-1'>
              <Typography
                variant='body2'
                className='text-gray-900 font-semibold cursor-pointer hover:underline'
                onClick={() => goToProfile(comment.user.id)}
              >
                {comment.user.nickname}
              </Typography>
              {/* Community Rating Badge */}
              {(() => {
                const badgeDisplay = getCommunityBadgeDisplay(comment.user?.activeCommunityBadge)
                if (!badgeDisplay) return null
                return (
                  <img
                    src={badgeDisplay.image}
                    alt={badgeDisplay.label}
                    className='w-3 h-3 object-contain'
                    title={`커뮤니티 등급: ${badgeDisplay.label}`}
                  />
                )
              })()}
              <Typography variant='caption' className='text-gray-500 text-xs'>
                {timeAgo}
              </Typography>
            </Box>

            {/* Comment Text */}
            <Typography
              variant='body2'
              className='text-gray-900 mb-2 leading-relaxed break-words whitespace-pre-wrap cursor-pointer hover:bg-gray-50 p-2 rounded'
              onClick={() => handleCommentTextClick(comment)}
              sx={{
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                maxWidth: '100%',
                fontSize: '14px'
              }}
            >
              {comment.content}
            </Typography>

            {/* Comment Actions - Same as post actions */}
            <Box className='flex items-center gap-4 mb-2'>
              <Button
                size='small'
                className={`flex items-center gap-1 p-0 ${comment.isLiked
                  ? 'text-red-500 hover:text-red-600'
                  : 'text-gray-500 hover:text-red-500'
                  }`}
                onClick={() => toggleCommentLike(comment.id)}
                sx={{
                  textTransform: 'none',
                  minWidth: 'auto',
                  backgroundColor: 'transparent !important',
                  '&:hover': { backgroundColor: 'transparent !important' },
                  '&:focus': { backgroundColor: 'transparent !important' },
                  '&:active': { backgroundColor: 'transparent !important' }
                }}
              >
                <i className={`ri-heart-${comment.isLiked ? 'fill' : 'line'} text-sm`} />
                <Typography variant='caption' className='text-xs'>
                  {comment.likeCount || 0}
                </Typography>
              </Button>

              {/* Reply Count Button - Opens Modal */}
              <Button
                size='small'
                className='flex items-center gap-1 text-gray-500 hover:text-blue-500 p-0'
                onClick={() => handleReplyClick(comment)}
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
                  {comment.replies?.length || 0}
                </Typography>
              </Button>

              {/* Share Button */}
              <Button
                size='small'
                className='flex items-center gap-1 text-gray-500 hover:text-green-500 p-0'
                onClick={() => handleShare()}
                sx={{
                  textTransform: 'none',
                  minWidth: 'auto',
                  backgroundColor: 'transparent !important',
                  '&:hover': { backgroundColor: 'transparent !important' },
                  '&:focus': { backgroundColor: 'transparent !important' },
                  '&:active': { backgroundColor: 'transparent !important' }
                }}
              >
                <i className='ri-share-forward-line text-sm' />
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  // Function to render a reply without reply indicators (YouTube style)
  const renderReply = (reply: Comment) => {
    const timeAgo = getTimeAgo(reply.createdAt);

    return (
      <Box key={reply.id} className='mb-3 border-b border-gray-200 pb-3'>
        <Box className='flex gap-3 min-w-0'>
          {/* Avatar - Same size for all comments */}
          <Avatar
            className='w-10 h-10 bg-gray-200 flex-shrink-0 cursor-pointer'
            src={reply.user.profileImage || undefined}
            onClick={() => goToProfile(reply.user.id)}
          >
            {reply.user.nickname.charAt(0)}
          </Avatar>

          {/* Comment Content */}
          <Box className='flex-1 min-w-0'>
            {/* Comment Header */}
            <Box className='flex items-center justify-between mb-1'>
              <Box className='flex items-center gap-2'>
                <Typography
                  variant='subtitle2'
                  className='text-gray-900 font-semibold cursor-pointer hover:underline'
                  onClick={() => goToProfile(reply.user.id)}
                >
                  @{reply.user.nickname}
                </Typography>
                {/* Community Rating Badge - Use activeCommunityBadge from API (dynamic) */}
                {(() => {
                  const badgeDisplay = getCommunityBadgeDisplay(reply.user?.activeCommunityBadge)
                  if (!badgeDisplay) return null
                  return (
                    <img
                      src={badgeDisplay.image}
                      alt={badgeDisplay.label}
                      className='w-4 h-4 object-contain'
                      title={`커뮤니티 등급: ${badgeDisplay.label}`}
                    />
                  )
                })()}
                <Typography variant='caption' className='text-gray-500'>
                  {timeAgo}
                </Typography>
              </Box>

            </Box>

            {/* Comment Text */}
            <Typography
              variant='body2'
              className='text-gray-900 mb-2 leading-relaxed break-words whitespace-pre-wrap cursor-pointer hover:bg-gray-50 p-2 rounded'
              onClick={() => handleCommentTextClick(reply)}
              sx={{
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                maxWidth: '100%'
              }}
            >
              {reply.content}
            </Typography>

            {/* Comment Actions - Heart Style */}
            <Box className='flex items-center gap-2 sm:gap-4 mb-2'>
              <Button
                size='small'
                className={`flex items-center gap-1 p-1 ${reply.isLiked
                  ? 'text-red-500 hover:text-red-600'
                  : 'text-gray-500 hover:text-red-500'
                  }`}
                onClick={() => toggleCommentLike(reply.id)}
                sx={{ textTransform: 'none', minWidth: 'auto' }}
              >
                <i className={`ri-heart-${reply.isLiked ? 'fill' : 'line'} text-lg`} />
                <Typography variant='caption' className='font-medium'>
                  {reply.likeCount || 0}
                </Typography>
              </Button>

              {/* Reply Button - Always show */}
              <Button
                size='small'
                className='text-blue-600 hover:text-blue-800 p-1'
                onClick={() => setReplyingTo(replyingTo === reply.id ? null : reply.id)}
                sx={{ textTransform: 'none', minWidth: 'auto' }}
              >
                <Typography variant='caption' className='font-medium'>
                  답글
                </Typography>
              </Button>
            </Box>

            {/* Reply Input - Show Current User Profile */}
            {/* {replyingTo === reply.id && (
              <Box className='mt-2 p-2 bg-gray-50 rounded-lg'>
                <Box className='flex gap-3 min-w-0'>
                  <Avatar 
                    className='w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0' 
                    src={user?.profileImage || undefined}
                  >
                    {user?.nickname?.charAt(0) || ''}
                  </Avatar>
                  <Box className='flex-1 min-w-0'> */}
            {/* Current User Info */}
            {/* <Box className='flex items-center gap-2 mb-2'>
                      <Typography variant='subtitle2' className='text-gray-900 font-semibold text-sm'>
                        @{user?.nickname || 'User'}
                      </Typography> */}
            {/* Current User Community Rating Badge */}
            {/* {((user as any)?.activeCommunityBadge || (profileData as any)?.data?.user?.activeCommunityBadge) && (
                        <img 
                          src={(user as any)?.activeCommunityBadge?.imageUrl || (profileData as any)?.data?.user?.activeCommunityBadge?.imageUrl} 
                          alt={(user as any)?.activeCommunityBadge?.name || (profileData as any)?.data?.user?.activeCommunityBadge?.name}
                          className='w-4 h-4 object-contain'
                          title={`Community Level: ${(user as any)?.activeCommunityBadge?.name || (profileData as any)?.data?.user?.activeCommunityBadge?.name}`}
                        />
                      )}
                    </Box>
                    <TextField
                      fullWidth
                      placeholder={`@${reply.user.nickname}에게 답글...`}
                      value={getThreadedReplyText(reply.id)}
                      onChange={(e) => setThreadedReplyText(reply.id, e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && getThreadedReplyText(reply.id).trim()) {
                          addComment(getThreadedReplyText(reply.id).trim(), reply.id);
                        }
                      }}
                      variant='outlined'
                      size='small'
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: '8px',
                          '& fieldset': {
                            borderColor: '#e5e7eb'
                          },
                          '&:hover fieldset': {
                            borderColor: '#d1d5db'
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#3b82f6'
                          }
                        }
                      }}
                    />
                    <Box className='flex justify-end gap-2 mt-2'>
                      <Button
                        variant='text'
                        size='small'
                        className='text-gray-500 hover:text-gray-700'
                        onClick={() => {
                          setReplyingTo(null);
                          clearThreadedReply(reply.id);
                        }}
                        sx={{ textTransform: 'none', minWidth: 'auto' }}
                      >
                        취소
                      </Button>
                      <Button
                        variant='contained'
                        size='small'
                        className='bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4'
                        onClick={() => {
                          if (getThreadedReplyText(reply.id).trim()) {
                            addComment(getThreadedReplyText(reply.id).trim(), reply.id);
                          }
                        }}
                        disabled={!getThreadedReplyText(reply.id).trim() || commentLoading}
                        sx={{ textTransform: 'none', minWidth: 'auto' }}
                      >
                        {commentLoading ? (
                          <CircularProgress size={16} className='text-white' />
                        ) : (
                          '답글'
                        )}
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )} */}
          </Box>
        </Box>
      </Box>
    );
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error || !post) {
    return (
      <Box className='flex flex-col items-center justify-center min-h-screen p-8'>
        <i className='ri-error-warning-line text-red-500 text-6xl mb-4' />
        <Typography variant='h6' className='text-gray-500 mb-2'>
          {error || '게시물을 찾을 수 없습니다'}
        </Typography>
        <Box className='flex gap-4 mt-4'>
          <Button
            variant='outlined'
            onClick={() => router.back()}
            className='border-gray-300 text-gray-700'
          >
            돌아가기
          </Button>
          {error && error.includes('Authentication') && (
            <Button
              variant='contained'
              onClick={() => navigate('/login')}
              className='bg-blue-600 hover:bg-blue-700'
            >
              로그인하기
            </Button>
          )}
        </Box>
      </Box>
    );
  }

  // Loading state
  if (loading) {
    return <PageLoader />;
  }

  // Error state
  if (error) {
    return (
      <Box className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <Alert severity="error" className='max-w-md'>
          {error}
        </Alert>
      </Box>
    );
  }

  // No post data
  if (!post) {
    return (
      <Box className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <Typography variant='h6' className='text-gray-500'>
          게시물을 찾을 수 없습니다.
        </Typography>
      </Box>
    );
  }

  return (
    <Box className='min-h-screen bg-gray-50'>
      {/* Header */}
      <Box className='bg-white border-b border-gray-200 p-4'>
        <Box className='flex items-center gap-4 max-w-4xl mx-auto'>
          <IconButton onClick={() => router.back()} className='text-gray-600'>
            <i className='ri-arrow-left-line text-xl' />
          </IconButton>
          <Typography variant='h6' className='text-gray-900 font-semibold'>
            게시물
          </Typography>
        </Box>
      </Box>

      <Box className='max-w-4xl mx-auto mb-10'>
        {/* Main Post - YouTube Style */}
        <Box className='bg-white rounded-lg w-full'>
          <Box className='p-6'>
            {/* Post Header */}
            <Box className='flex items-center justify-between mb-4 w-full'>
              <Box className='flex items-center gap-3 w-full'>
                <Avatar
                  className='w-12 h-12 bg-gray-200 cursor-pointer'
                  src={post.user.profileImage || undefined}
                  onClick={() => goToProfile(post.user.id)}
                >
                  {post.user.nickname.charAt(0)}
                </Avatar>
                <Box className='w-full'>
                  <Box className='flex items-center justify-between w-full'>
                    {/* Left: nickname + badge */}
                    <Box className='flex items-center gap-2 w-full'>
                      <Typography
                        variant='h6'
                        className='text-gray-900 font-semibold cursor-pointer hover:underline'
                        onClick={() => goToProfile(post.user.id)}
                      >
                        {post.user.nickname}
                      </Typography>

                      {(() => {
                        const badgeDisplay = getCommunityBadgeDisplay(post.user.activeCommunityBadge)
                        if (!badgeDisplay) return null
                        return (
                          <img
                            src={badgeDisplay.image}
                            alt={badgeDisplay.label}
                            className='w-5 h-5 object-contain'
                            title={`커뮤니티 등급: ${badgeDisplay.label}`}
                          />
                        )
                      })()}
                    </Box>

                    {/* Right: follow button */}
                    <Box className='justify-self-end'>
                      <FollowButton
                        userId={post.user.id}
                        userNickname={post.user.nickname}
                        isFollowing={isFollowing}
                        onFollowChange={handleFollowChange}
                      />
                    </Box>
                  </Box>

                  <Typography variant='caption' className='text-gray-500'>
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

            {/* Post Content */}
            {renderOrderedContent(post.content)}

            {/* Post Actions - Same as comment actions */}
            <Box className='flex items-center gap-4 mb-2'>
              <Button
                className={`flex items-center gap-1 p-0 ${post?.isLiked
                  ? 'text-red-500 hover:text-red-600'
                  : 'text-gray-500 hover:text-red-500'
                  }`}
                onClick={togglePostLike}
                disabled={likeLoading}
                sx={{
                  textTransform: 'none',
                  minWidth: 'auto',
                  backgroundColor: 'transparent !important',
                  '&:hover': { backgroundColor: 'transparent !important' },
                  '&:focus': { backgroundColor: 'transparent !important' },
                  '&:active': { backgroundColor: 'transparent !important' }
                }}
              >
                <i className={`ri-heart-${post?.isLiked ? 'fill' : 'line'} text-sm`} />
                <Typography variant='caption' className='text-xs'>
                  {post?.likeCount ?? post?.likes?.length ?? 0}
                </Typography>
              </Button>

              {/* Comment Count Button */}
              <Button
                className='flex items-center gap-1 text-gray-500 hover:text-blue-500 p-0'
                onClick={() => handlePostCommentClick()}
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
                  {getTotalCommentsCount(comments)}
                </Typography>
              </Button>

              {/* Share Button */}
              <Button
                className='flex items-center gap-1 text-gray-500 hover:text-green-500 p-0'
                onClick={handleShare}
                sx={{
                  textTransform: 'none',
                  minWidth: 'auto',
                  backgroundColor: 'transparent !important',
                  '&:hover': { backgroundColor: 'transparent !important' },
                  '&:focus': { backgroundColor: 'transparent !important' },
                  '&:active': { backgroundColor: 'transparent !important' }
                }}
              >
                <i className='ri-share-forward-line text-sm' />
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Comments Section - YouTube Style */}
        <Box className='mb-6 p-4'>
          {/* Comments Header - Threads Style */}
          <Box className='flex items-center justify-between mb-6'>
            <Box className='flex items-center gap-2'>
              <i className='ri-chat-3-line text-gray-600 text-lg' />
              <Typography variant='h6' className='text-gray-900 font-semibold'>
                댓글 {getTotalCommentsCount(comments)}개
              </Typography>
            </Box>
          </Box>


          {/* Comments List - Only parent comments like Threads */}
          {comments.length > 0 ? (
            <Box>
              {comments
                .filter((comment: Comment) => !comment.parentCommentId) // Only top-level comments
                .map((comment: Comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    depth={0}
                    maxDepth={3}
                    onReply={(comment, post) => {
                      setSelectedComment(comment);
                      setReplyModalOpen(true);
                    }}
                    onLike={handleLikeComment}
                    onViewThread={(comment, post) => {
                      setSelectedComment(comment);
                      setThreadViewOpen(true);
                    }}
                    onCommentClick={(comment, post) => {
                      setSelectedComment(comment);
                      setThreadViewOpen(true);
                    }}
                    postData={post}
                    currentUserId={typeof user?.id === 'string' ? parseInt(user.id) : user?.id}
                  />
                ))}

              {/* Load More Button */}
              {hasMoreComments && (
                <Box className='flex justify-center mt-6'>
                  <Button
                    variant='outlined'
                    className='border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full px-8'
                    onClick={loadMoreComments}
                    disabled={loadingMore}
                    sx={{ textTransform: 'none' }}
                  >
                    {loadingMore ? (
                      <CircularProgress size={20} className='mr-2' />
                    ) : (
                      <i className='ri-arrow-down-s-line mr-2' />
                    )}
                    더 많은 댓글 보기
                  </Button>
                </Box>
              )}
            </Box>
          ) : (
            <Box className='flex flex-col items-center justify-center py-12'>
              <i className='ri-chat-3-line text-gray-300 text-6xl mb-4' />
              <Typography variant='h6' className='text-gray-500 mb-2'>
                아직 댓글이 없습니다
              </Typography>
              <Typography variant='body2' className='text-gray-400 text-center max-w-sm'>
                첫 번째 댓글을 남겨보세요!
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* YouTube-style Share Modal */}
      <Modal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
      >
        <Fade in={shareModalOpen}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: { xs: '90%', sm: 400 },
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 24,
              p: 3,
            }}
          >
            <Box className='flex items-center justify-between mb-4'>
              <Typography variant='h6' className='font-semibold'>
                공유
              </Typography>
              <IconButton
                onClick={() => setShareModalOpen(false)}
                size='small'
                className='text-gray-500 hover:text-gray-700'
              >
                <i className='ri-close-line text-lg' />
              </IconButton>
            </Box>

            <Box className='mb-4'>
              <Typography variant='body2' className='text-gray-600 mb-2'>
                링크 복사
              </Typography>
              <Box className='flex items-center gap-2'>
                <TextField
                  fullWidth
                  value={shareUrl}
                  variant='outlined'
                  size='small'
                  disabled
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f5f5f5',
                      '& fieldset': {
                        borderColor: '#e0e0e0',
                      },
                    },
                  }}
                />
                <Button
                  variant='contained'
                  onClick={copyToClipboard}
                  className='bg-blue-600 hover:bg-blue-700 text-white px-4'
                  sx={{ textTransform: 'none', minWidth: 'auto' }}
                >
                  복사
                </Button>
              </Box>
            </Box>
          </Box>
        </Fade>
      </Modal>

      {/* Threads-style Reply Modal */}
      <ReplyModal
        isOpen={replyModalOpen}
        onClose={handleCloseModals}
        postId={parseInt(postId)}
        parentCommentId={selectedComment?.id}
        originalComment={selectedComment}
        originalPost={post}
      />

      {/* Thread View Modal */}
      <ThreadView
        isOpen={threadViewOpen}
        onClose={handleCloseModals}
        comment={selectedComment}
        post={post}
        postId={parseInt(postId)}
        allComments={comments}
        onReply={(comment, post) => {
          setSelectedComment(comment);
          setReplyModalOpen(true);
        }}
        onLike={handleLikeComment}
        totalCommentsCount={getTotalCommentsCount(comments)}
      />

      {/* Comment Thread Modal */}
      <CommentThreadModal
        isOpen={threadModalOpen}
        onClose={handleCloseModals}
        postId={parseInt(postId)}
        parentComment={selectedComment}
        originalPost={post}
        childReplies={selectedComment?.replies || []}
      />

    </Box>
  );
}
