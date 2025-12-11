// Utility functions for enriching data with like status
import { RootState } from '@/store'

// Enrich posts with like status from global state
export const enrichPostsWithLikes = (posts: any[], globalState: RootState) => {
  const { likedPosts } = globalState.mypageReducer
  
  return posts.map(post => ({
    ...post,
    isLiked: likedPosts.includes(post.id),
    likeCount: post.likeCount || post.likes?.length || 0
  }))
}

// Enrich comments with like status from global state
export const enrichCommentsWithLikes = (comments: any[], globalState: RootState) => {
  const { likedComments } = globalState.mypageReducer
  
  return comments.map(comment => ({
    ...comment,
    isLiked: likedComments.includes(comment.id),
    likeCount: comment.likeCount || comment.likes?.length || 0
  }))
}

// Enrich nested comments (replies) with like status
export const enrichNestedCommentsWithLikes = (comments: any[], globalState: RootState) => {
  const { likedComments } = globalState.mypageReducer
  
  const enrichComment = (comment: any) => ({
    ...comment,
    isLiked: likedComments.includes(comment.id),
    likeCount: comment.likeCount || comment.likes?.length || 0,
    replies: comment.replies ? comment.replies.map(enrichComment) : []
  })
  
  return comments.map(enrichComment)
}

// Check if a post is liked
export const isPostLiked = (postId: number, globalState: RootState) => {
  const { likedPosts } = globalState.mypageReducer
  return likedPosts.includes(postId)
}

// Check if a comment is liked
export const isCommentLiked = (commentId: number, globalState: RootState) => {
  const { likedComments } = globalState.mypageReducer
  return likedComments.includes(commentId)
}
