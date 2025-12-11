// import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
// import HomeApiService from '@/services/homeApi'
// import FeedApiService from '@/services/feedApi'
// import { meetingsApi } from '@/services/meetingsApi'

// // Types
// interface MypageState {
//   profileData: any | null
//   profileLoading: boolean
//   profileError: string | null
//   summaryData: any | null
//   summaryLoading: boolean
//   summaryError: string | null
//   // Normalized feed container to simplify UI rendering
//   feedData: { posts?: any[]; replies?: any[]; tagged?: any[] } | null
//   feedLoading: boolean
//   feedError: string | null
//   activeTab: 'posts' | 'replies' | 'tagged'
//   meetingsData: any[]
//   meetingsLoading: boolean
//   meetingsError: string | null
//   badgesData: any[]
//   badgesLoading: boolean
//   badgesError: string | null
//   likedPosts: number[]
//   likedComments: number[]
//   hasFetched: boolean
// }

// // Initial state
// const initialState: MypageState = {
//   profileData: null,
//   profileLoading: false,
//   profileError: null,
//   summaryData: null,
//   summaryLoading: false,
//   summaryError: null,
//   feedData: null,
//   feedLoading: false,
//   feedError: null,
//   activeTab: 'posts',
//   meetingsData: [],
//   meetingsLoading: false,
//   meetingsError: null,
//   badgesData: [],
//   badgesLoading: false,
//   badgesError: null,
//   likedPosts: [],
//   likedComments: [],
//   hasFetched: false
// }

// // Async thunks following MedQwik pattern
// export const fetchProfile = createAsyncThunk(
//   'mypage/fetchProfile',
//   async (userId: number | undefined, { getState, rejectWithValue }) => {
//     try {
//       // fetchProfile -> calling API
//       const response = await HomeApiService.getProfile(userId)
      
//       if (!response.success) {
//         return rejectWithValue(response.error || 'Failed to fetch profile')
//       }

//       return response.data
//     } catch (error) {
//       return rejectWithValue('Network error')
//     }
//   }
// )

// export const fetchSummary = createAsyncThunk(
//   'mypage/fetchSummary',
//   async (_, { getState, rejectWithValue }) => {
//     try {
//       // fetchSummary -> calling API
//       const response = await HomeApiService.getSummary()
      
//       if (!response.success) {
//         return rejectWithValue(response.error || 'Failed to fetch summary')
//       }

//       return response.data
//     } catch (error) {
//       return rejectWithValue('Network error')
//     }
//   }
// )

// export const fetchFeed = createAsyncThunk(
//   'mypage/fetchFeed',
//   async (
//     payload: { tab: 'posts' | 'replies' | 'tagged'; userId?: number },
//     { getState, rejectWithValue }
//   ) => {
//     try {
//       const state = getState() as any
//       const response = await FeedApiService.getFeed(payload.tab, payload.userId)
      
//       if (!response.success) {
//         return rejectWithValue(response.error || 'Failed to fetch feed')
//       }

//       // response.data is the whole body: { success, data: { type, items, total } }
//       // We only need the inner data payload for reducers
//       const inner = (response.data as any)?.data
      
//       // Get current user ID from auth state
//       const currentUserId = state.authReducer?.user?.id || 1 // Fallback to 1 for now
      
//       // Redux fetchFeed - Auth state
      
//       return { data: inner, tab: payload.tab, currentUserId }
//     } catch (error) {
//       return rejectWithValue('Network error')
//     }
//   }
// )

// export const fetchBadges = createAsyncThunk(
//   'mypage/fetchBadges',
//   async (_, { getState, rejectWithValue }) => {
//     try {
//       // fetchBadges -> calling API
//       const response = await HomeApiService.getBadges()
      
//       if (!response.success) {
//         return rejectWithValue(response.error || 'Failed to fetch badges')
//       }

//       return response.data
//     } catch (error) {
//       return rejectWithValue('Network error')
//     }
//   }
// )

// export const fetchMeetings = createAsyncThunk(
//   'mypage/fetchMeetings',
//   async (
//     params: { userId?: number; meetingType?: 'all' | 'created' | 'participated' } | undefined,
//     { rejectWithValue }
//   ) => {
//     try {
//       const userId = params?.userId
//       const meetingType = params?.meetingType || 'all'
//       const data = await meetingsApi.getMeetings(userId, meetingType)
//       if (!data) {
//         return rejectWithValue('Failed to fetch meetings')
//       }
//       return { meetingType, items: data }
//     } catch (error) {
//       return rejectWithValue('Network error')
//     }
//   }
// )

// export const likePost = createAsyncThunk(
//   'mypage/likePost',
//   async (postId: number, { rejectWithValue }) => {
//     try {
//       const response = await FeedApiService.likePost(postId.toString())
      
//       if (!response.success) {
//         return rejectWithValue(response.error || 'Failed to like post')
//       }

//       return {
//         postId,
//         liked: response.data.liked,
//         likeCount: response.data.likeCount
//       }
//     } catch (error) {
//       return rejectWithValue('Network error')
//     }
//   }
// )

// export const likeComment = createAsyncThunk(
//   'mypage/likeComment',
//   async (commentId: number, { rejectWithValue }) => {
//     try {
//       const response = await FeedApiService.likeComment(commentId.toString())
      
//       if (!response.success) {
//         return rejectWithValue(response.error || 'Failed to like comment')
//       }

//       return {
//         commentId,
//         liked: response.data.liked,
//         likeCount: response.data.likeCount
//       }
//     } catch (error) {
//       return rejectWithValue('Network error')
//     }
//   }
// )

// export const deleteComment = createAsyncThunk(
//   'mypage/deleteComment',
//   async (commentId: number, { rejectWithValue }) => {
//     try {
//       const response = await FeedApiService.deleteComment(commentId.toString())
      
//       if (!response.success) {
//         return rejectWithValue(response.error || 'Failed to delete comment')
//       }

//       return { commentId }
//     } catch (error) {
//       return rejectWithValue('Network error')
//     }
//   }
// )


// export const updateProfilePrivacy = createAsyncThunk(
//   'mypage/updateProfilePrivacy',
//   async (publicVisibility: boolean, { rejectWithValue }) => {
//     try {
//       const { userApi } = await import('@/services/userApi')
//       const response = await userApi.updateProfilePrivacy(publicVisibility)
      
//       if (!response) {
//         return rejectWithValue('Failed to update profile privacy')
//       }

//       return { publicVisibility }
//     } catch (error) {
//       return rejectWithValue('Network error')
//     }
//   }
// )

// export const updateTabPrivacy = createAsyncThunk(
//   'mypage/updateTabPrivacy',
//   async ({ tabType, privacy }: { tabType: 'feed' | 'meetings' | 'badges', privacy: boolean }, { rejectWithValue }) => {
//     try {
//       const { userApi } = await import('@/services/userApi')
//       const response = await userApi.updateTabPrivacy(tabType, privacy)
      
//       if (!response) {
//         return rejectWithValue('Failed to update tab privacy')
//       }

//       return { tabType, privacy }
//     } catch (error) {
//       return rejectWithValue('Network error')
//     }
//   }
// )

// // Mypage slice
// const mypageSlice = createSlice({
//   name: 'mypage',
//   initialState,
//   reducers: {
//     setActiveTab: (state, action) => {
//       state.activeTab = action.payload
//     },
//     clearData: (state) => {
//       state.profileData = null
//       state.profileLoading = false
//       state.profileError = null
//       state.summaryData = null
//       state.summaryLoading = false
//       state.summaryError = null
//       state.feedData = null
//       state.feedLoading = false
//       state.feedError = null
//       state.meetingsData = []
//       state.meetingsLoading = false
//       state.meetingsError = null
//       state.badgesData = []
//       state.badgesLoading = false
//       state.badgesError = null
//       state.likedPosts = []
//       state.likedComments = []
//       state.hasFetched = false
//     },
//     clearCache: (state) => {
//       // Clear cache logic if needed
//     },
//     updateProfileData: (state, action) => {
//       if (state.profileData) {
//         state.profileData = { ...state.profileData, ...action.payload }
//       }
//     }
//   },
//   extraReducers: (builder) => {
//     // Fetch profile
//     builder
//       .addCase(fetchProfile.pending, (state) => {
//         state.profileLoading = true
//         state.profileError = null
//       })
//       .addCase(fetchProfile.fulfilled, (state, action) => {
//         state.profileLoading = false
//         state.profileData = action.payload
//         state.profileError = null
//         state.hasFetched = true
//       })
//       .addCase(fetchProfile.rejected, (state, action) => {
//         state.profileLoading = false
//         state.profileError = action.payload as string
//       })

//     // Fetch summary
//     builder
//       .addCase(fetchSummary.pending, (state) => {
//         state.summaryLoading = true
//         state.summaryError = null
//       })
//       .addCase(fetchSummary.fulfilled, (state, action) => {
//         state.summaryLoading = false
//         state.summaryData = action.payload
//         state.summaryError = null
//         state.hasFetched = true
//       })
//       .addCase(fetchSummary.rejected, (state, action) => {
//         state.summaryLoading = false
//         state.summaryError = action.payload as string
//       })

//     // Fetch feed
//     builder
//       .addCase(fetchFeed.pending, (state) => {
//         state.feedLoading = true
//         state.feedError = null
//       })
//       .addCase(fetchFeed.fulfilled, (state, action) => {
//         state.feedLoading = false
//         // API returns shape: { type, items, total }
//         const { type, items } = action.payload.data || {};
//         const tab = (action.payload.tab || type) as 'posts' | 'replies' | 'tagged';
//         const currentUserId = action.payload.currentUserId;

//         // Normalize into a single object with keys posts/replies/tagged
//         if (!state.feedData) {
//           state.feedData = { posts: [], replies: [], tagged: [] }
//         }
        
//         // Helper function to enrich items with like status
//         const enrichWithLikes = (items: any[]) => {
//           return items.map((item: any) => {
//             // Check if user has liked this post based on the likes array in the API response
//             const isLiked = item.likes?.some((like: any) => like.userId === currentUserId) || false
//             const likeCount = item.likes?.length || 0
            
//             // Debug: Print current user ID and compare with likes
//             if (item.likes && item.likes.length > 0) {
//               // Post like status debug
//             }
            
//             // Add to likedPosts array if user has liked this post
//             if (isLiked && !state.likedPosts.includes(item.id)) {
//               state.likedPosts = [...state.likedPosts, item.id]
//             }
            
//             return {
//               ...item,
//               isLiked,
//               likeCount
//             }
//           })
//         }

//         // Helper function to enrich comments with like status
//         const enrichCommentsWithLikes = (comments: any[]) => {
//           return comments.map((comment: any) => {
//             // Check if user has liked this comment based on the likes array in the API response
//             const isLiked = comment.likes?.some((like: any) => like.userId === currentUserId) || false
//             const likeCount = comment.likes?.length || 0
            
//             // Debug: Print current user ID and compare with comment likes
//             if (comment.likes && comment.likes.length > 0) {
//               // Comment like status debug
//             }
            
//             // Add to likedComments array if user has liked this comment
//             if (isLiked && !state.likedComments.includes(comment.id)) {
//               state.likedComments = [...state.likedComments, comment.id]
//             }
            
//             return {
//               ...comment,
//               isLiked,
//               likeCount
//             }
//           })
//         }

//         // Create new feedData object to avoid mutation
//         const newFeedData = { ...state.feedData }
        
//         if (tab === 'posts') {
//           newFeedData.posts = enrichWithLikes(items || [])
//         } else if (tab === 'replies') {
//           // Support both shapes:
//           // 1) New API: items are posts with `comments` (only current user's comments)
//           // 2) Legacy: items are comments with a nested `post`
//           const isLegacyCommentShape = Array.isArray(items) && items.length > 0 && (items[0] as any)?.post

//           if (!isLegacyCommentShape) {
//             // New API shape: posts with filtered comments (only current user's)
//             const transformedReplies = enrichWithLikes((items || []))
//               .filter((post: any) => Array.isArray(post.comments))
//               .map((post: any) => {
//                 const commentReplies = enrichCommentsWithLikes(post.comments || [])
//                 const firstMyComment = commentReplies[0]
//                 return {
//                   ...post,
//                   // Surface primary comment fields expected by UI list row
//                   commentUser: firstMyComment?.user,
//                   commentContent: firstMyComment?.content,
//                   commentCreatedAt: firstMyComment?.createdAt,
//                   commentId: firstMyComment?.id,
//                   // In replies tab, like button targets YOUR main comment, not the post
//                   isLiked: firstMyComment?.isLiked ?? false,
//                   likeCount: firstMyComment?.likeCount ?? 0,
//                   // Detailed list of your comments below the post
//                   commentReplies,
//                   // Expose total post-level counts for UI (complete counts)
//                   postIsLiked: post.isLiked ?? false,
//                   postLikeCount: post._count?.likes ?? (post.likes?.length || 0),
//                   totalCommentsCount: post._count?.comments ?? 0
//                 }
//               })
//               // Only show posts that actually have at least one of user's comments
//               .filter((post: any) => Array.isArray(post.commentReplies) && post.commentReplies.length > 0)

//             newFeedData.replies = transformedReplies
//           } else {
//             // Legacy shape handling preserved for backward compatibility
//             const transformedReplies = (items || []).map((comment: any) => {
//               if (comment.post) {
//                 const enrichedComment = {
//                   ...comment,
//                   isLiked: comment.likes?.some((like: any) => like.userId === currentUserId) || false,
//                   likeCount: comment.likes?.length || 0
//                 }

//                 if (enrichedComment.isLiked && !state.likedComments.includes(comment.id)) {
//                   state.likedComments = [...state.likedComments, comment.id]
//                 }

//                 const enrichedPostBase = enrichWithLikes([comment.post])[0] || comment.post
//                 return {
//                   ...enrichedPostBase,
//                   commentUser: enrichedComment.user,
//                   commentContent: enrichedComment.content,
//                   commentCreatedAt: enrichedComment.createdAt,
//                   commentId: enrichedComment.id,
//                   commentReplies: enrichCommentsWithLikes(comment.replies || []),
//                   isMyComment: comment.isMyComment,
//                   isOnMyPost: comment.isOnMyPost
//                 }
//               }
//               return comment
//             })
//             newFeedData.replies = transformedReplies
//           }
//         } else if (tab === 'tagged') {
//           // Transform tagged data: extract post data from comment objects (similar to replies)
//           const transformedTagged = (items || []).map((comment: any) => {
//             if (comment.post) {
//               // Enrich the main comment with like status
//               const enrichedComment = {
//                 ...comment,
//                 isLiked: comment.likes?.some((like: any) => like.userId === currentUserId) || false,
//                 likeCount: comment.likes?.length || 0
//               }
              
//               // Add to likedComments array if user has liked this comment
//               if (enrichedComment.isLiked && !state.likedComments.includes(comment.id)) {
//                 state.likedComments = [...state.likedComments, comment.id]
//               }
              
//               // Return the post data with the comment as the main content
//               const enrichedPost = {
//                 ...comment.post,
//                 // Add the comment as the main content for display
//                 commentContent: comment.content,
//                 commentUser: comment.user,
//                 commentCreatedAt: comment.createdAt,
//                 commentId: comment.id,
//                 commentReplies: enrichCommentsWithLikes(comment.replies || []),
//                 isMyComment: comment.isMyComment,
//                 isOnMyPost: comment.isOnMyPost
//               }
//               // Enrich the post with like status (store separately)
//               const postIsLiked = enrichedPost.likes?.some((like: any) => like.userId === currentUserId) || false
//               const postLikeCount = enrichedPost.likes?.length || 0
              
//               // Add to likedPosts array if user has liked this post
//               if (postIsLiked && !state.likedPosts.includes(enrichedPost.id)) {
//                 state.likedPosts = [...state.likedPosts, enrichedPost.id]
//               }
              
//               return {
//                 ...enrichedPost,
//                 // Expose comment metadata at top-level for UI
//                 user: enrichedComment.user,
//                 content: enrichedComment.content,
//                 createdAt: enrichedComment.createdAt,
//                 commentId: enrichedComment.id,
//                 // Primary like UI in tagged tab refers to the main comment
//                 isLiked: enrichedComment.isLiked,
//                 likeCount: enrichedComment.likeCount,
//                 // Also expose post like state if needed by UI
//                 postIsLiked,
//                 postLikeCount
//               }
//             }
//             return comment
//           })
//           newFeedData.tagged = transformedTagged
//         }

//         // Update state with new feedData object
//         state.feedData = newFeedData


//         // Only update activeTab if it actually changed to prevent effect cascades
//         if (state.activeTab !== tab) {
//           state.activeTab = tab
//         }
//         state.feedError = null
//         state.hasFetched = true
//       })
//       .addCase(fetchFeed.rejected, (state, action) => {
//         state.feedLoading = false
//         state.feedError = action.payload as string
//       })

//     // Fetch badges
//     builder
//       .addCase(fetchBadges.pending, (state) => {
//         state.badgesLoading = true
//         state.badgesError = null
//       })
//       .addCase(fetchBadges.fulfilled, (state, action) => {
//         state.badgesLoading = false
//         state.badgesData = action.payload
//         state.badgesError = null
//         state.hasFetched = true
//       })
//       .addCase(fetchBadges.rejected, (state, action) => {
//         state.badgesLoading = false
//         state.badgesError = action.payload as string
//       })

//     // Fetch meetings
//     builder
//       .addCase(fetchMeetings.pending, (state) => {
//         state.meetingsLoading = true
//         state.meetingsError = null
//       })
//       .addCase(fetchMeetings.fulfilled, (state, action) => {
//         state.meetingsLoading = false
//         const { meetingType, items } = action.payload as { meetingType: 'all' | 'created' | 'participated'; items: any[] }
//         const existing: any = Array.isArray(state.meetingsData) ? {} : (state.meetingsData as any)
//         const next: any = { ...existing }
//         if (meetingType === 'all') next.all = items
//         if (meetingType === 'participated') next.participated = items
//         if (meetingType === 'created') next.created = items
//         state.meetingsData = next
//       })
//       .addCase(fetchMeetings.rejected, (state, action) => {
//         state.meetingsLoading = false
//         state.meetingsError = action.payload as string
//       })

//     // Like post
//     builder
//       .addCase(likePost.pending, (state) => {
//         // state.likeLoading = true
//       })
//       .addCase(likePost.fulfilled, (state, action) => {
//         const { postId, liked, likeCount } = action.payload
        
//         if (liked) {
//           if (!state.likedPosts.includes(postId)) {
//             state.likedPosts = [...state.likedPosts, postId]
//           }
//         } else {
//           state.likedPosts = state.likedPosts.filter(id => id !== postId)
//         }
        

//         // Update like status in all feed data (immutable)
//         const updatePostInFeed = (posts: any[]) => {
//           return posts.map(post => {
//             if (post.id === postId) {
//               return {
//                 ...post,
//                 isLiked: liked,
//                 likeCount: likeCount
//               }
//             }
//             return post
//           })
//         }

//         // Update like status in replies/tagged data (which have transformed structure)
//         const updatePostInReplies = (replies: any[]) => {
//           return replies.map(reply => {
//             if (reply.id === postId) {
//               return {
//                 ...reply,
//                 // For replies/tagged, the primary UI may read post-level fields
//                 postIsLiked: liked,
//                 postLikeCount: likeCount,
//                 // Also keep base fields in sync if present
//                 isLiked: liked,
//                 likeCount: likeCount
//               }
//             }
//             return reply
//           })
//         }

//         if (state.feedData) {
//           state.feedData = {
//             ...state.feedData,
//             posts: updatePostInFeed(state.feedData.posts || []),
//             replies: updatePostInReplies(state.feedData.replies || []),
//             tagged: updatePostInReplies(state.feedData.tagged || [])
//           }
//         }
//       })
//       .addCase(likePost.rejected, (state, action) => {
//         // Handle like post rejection
//       })

//     // Like comment
//     builder
//       .addCase(likeComment.fulfilled, (state, action) => {
//         const { commentId, liked, likeCount } = action.payload
        
//         if (liked) {
//           if (!state.likedComments.includes(commentId)) {
//             state.likedComments = [...state.likedComments, commentId]
//           }
//         } else {
//           state.likedComments = state.likedComments.filter(id => id !== commentId)
//         }

//         // Update comment like status in all feed data (immutable)
//         const updateCommentInFeed = (posts: any[]) => {
//           return posts.map(post => {
//             const updatedPost = { ...post }
            
//             // Update main comments
//             if (updatedPost.comments) {
//               updatedPost.comments = updatedPost.comments.map((comment: any) => {
//                 if (comment.id === commentId) {
//                   return {
//                     ...comment,
//                     isLiked: liked,
//                     likeCount: likeCount
//                   }
//                 }
//                 return comment
//               })
//             }
            
//             // Update comment replies
//             if (updatedPost.commentReplies) {
//               updatedPost.commentReplies = updatedPost.commentReplies.map((comment: any) => {
//                 if (comment.id === commentId) {
//                   return {
//                     ...comment,
//                     isLiked: liked,
//                     likeCount: likeCount
//                   }
//                 }
//                 return comment
//               })
//             }
            
//             return updatedPost
//           })
//         }

//         if (state.feedData) {
//           state.feedData = {
//             ...state.feedData,
//             posts: updateCommentInFeed(state.feedData.posts || []),
//             replies: updateCommentInFeed(state.feedData.replies || []),
//             tagged: updateCommentInFeed(state.feedData.tagged || [])
//           }
//         }
//       })
//       .addCase(likeComment.rejected, (state, action) => {
//         // Handle like comment rejection
//       })

//     // Delete comment
//     builder
//       .addCase(deleteComment.fulfilled, (state, action) => {
//         const { commentId } = action.payload
        
//         // Remove comment from likedComments if present
//         state.likedComments = state.likedComments.filter(id => id !== commentId)

//         // Remove comment from all feed data (immutable)
//         const removeCommentFromFeed = (posts: any[]) => {
//           return posts.map(post => {
//             const updatedPost = { ...post }
            
//             // Remove from main comments array
//             if (updatedPost.comments) {
//               updatedPost.comments = updatedPost.comments.filter((comment: any) => comment.id !== commentId)
//               // Also need to remove from nested replies
//               updatedPost.comments = updatedPost.comments.map((comment: any) => {
//                 if (comment.replies) {
//                   return {
//                     ...comment,
//                     replies: comment.replies.filter((reply: any) => reply.id !== commentId)
//                   }
//                 }
//                 return comment
//               })
//             }
            
//             // Remove from comment replies
//             if (updatedPost.commentReplies) {
//               updatedPost.commentReplies = updatedPost.commentReplies.filter((comment: any) => comment.id !== commentId)
//               // Also check nested replies
//               updatedPost.commentReplies = updatedPost.commentReplies.map((comment: any) => {
//                 if (comment.replies) {
//                   return {
//                     ...comment,
//                     replies: comment.replies.filter((reply: any) => reply.id !== commentId)
//                   }
//                 }
//                 return comment
//               })
//             }
            
//             return updatedPost
//           })
//         }

//         if (state.feedData) {
//           state.feedData = {
//             ...state.feedData,
//             posts: removeCommentFromFeed(state.feedData.posts || []),
//             replies: removeCommentFromFeed(state.feedData.replies || []),
//             tagged: removeCommentFromFeed(state.feedData.tagged || [])
//           }
//         }
//       })
//       .addCase(deleteComment.rejected, (state, action) => {
//         // Handle delete comment rejection
//       })


//     // Update profile privacy
//     builder
//       .addCase(updateProfilePrivacy.fulfilled, (state, action) => {
//         const { publicVisibility } = action.payload
        
//         // Update profile data if it exists
//         if (state.profileData && state.profileData.data && state.profileData.data.profile) {
//           state.profileData = {
//             ...state.profileData,
//             data: {
//               ...state.profileData.data,
//               profile: {
//                 ...state.profileData.data.profile,
//                 publicVisibility
//               }
//             }
//           }
//         }
//       })
//       .addCase(updateProfilePrivacy.rejected, (state, action) => {
//         // Handle update profile privacy rejection
//       })

//     // Update tab privacy
//     builder
//       .addCase(updateTabPrivacy.fulfilled, (state, action) => {
//         const { tabType, privacy } = action.payload
        
//         // Update profile data if it exists
//         if (state.profileData && state.profileData.data && state.profileData.data.profile) {
//           const updateField = tabType === 'feed' ? 'feedPrivacy' : 
//                              tabType === 'meetings' ? 'meetingsPrivacy' : 'badgesPrivacy'
          
//           state.profileData = {
//             ...state.profileData,
//             data: {
//               ...state.profileData.data,
//               profile: {
//                 ...state.profileData.data.profile,
//                 [updateField]: privacy
//               }
//             }
//           }
//         }
//       })
//       .addCase(updateTabPrivacy.rejected, (state, action) => {
//         // Handle update tab privacy rejection
//       })

//     // Listen to postSlice like actions to keep mypageSlice synchronized
//     builder
//       .addCase('post/likePost/fulfilled', (state, action: any) => {
//         const { postId, liked, likeCount } = action.payload
        
//         // Update likedPosts array
//         if (liked) {
//           if (!state.likedPosts.includes(postId)) {
//             state.likedPosts = [...state.likedPosts, postId]
//           }
//         } else {
//           state.likedPosts = state.likedPosts.filter(id => id !== postId)
//         }

//         // Update like status in all feed data (immutable)
//         const updatePostInFeed = (posts: any[]): any[] => {
//           return posts.map(post => {
//             if (post.id === postId) {
//               return {
//                 ...post,
//                 isLiked: liked,
//                 likeCount: likeCount
//               }
//             }
//             return post
//           })
//         }

//         // Update like status in replies/tagged data (which have transformed structure)
//         const updatePostInReplies = (replies: any[]): any[] => {
//           return replies.map(reply => {
//             if (reply.id === postId) {
//               return {
//                 ...reply,
//                 // For replies/tagged, the primary UI may read post-level fields
//                 postIsLiked: liked,
//                 postLikeCount: likeCount,
//                 // Also keep base fields in sync if present
//                 isLiked: liked,
//                 likeCount: likeCount
//               }
//             }
//             return reply
//           })
//         }

//         if (state.feedData) {
//           state.feedData = {
//             ...state.feedData,
//             posts: updatePostInFeed(state.feedData.posts || []),
//             replies: updatePostInReplies(state.feedData.replies || []),
//             tagged: updatePostInReplies(state.feedData.tagged || [])
//           }
//         }
//       })
//       .addCase('post/likeComment/fulfilled', (state, action: any) => {
//         const { commentId, liked, likeCount } = action.payload
        
//         // Update comment like status in feed data
//         const updateCommentInFeed = (comments: any[]): any[] => {
//           return comments.map(comment => {
//             if (comment.id === commentId) {
//               return {
//                 ...comment,
//                 isLiked: liked,
//                 likeCount: likeCount
//               }
//             }
//             if (comment.replies) {
//               return {
//                 ...comment,
//                 replies: updateCommentInFeed(comment.replies)
//               }
//             }
//             return comment
//           })
//         }

//         if (state.feedData) {
//           state.feedData = {
//             ...state.feedData,
//             posts: state.feedData.posts?.map(post => ({
//               ...post,
//               comments: post.comments ? updateCommentInFeed(post.comments) : []
//             })) || [],
//             replies: updateCommentInFeed(state.feedData.replies || []),
//             tagged: updateCommentInFeed(state.feedData.tagged || [])
//           }
//         }
//       })
//   }
// })

// export const { 
//   setActiveTab, 
//   clearData, 
//   clearCache, 
//   updateProfileData 
// } = mypageSlice.actions

// export default mypageSlice.reducer
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import HomeApiService from '@/services/homeApi'
import FeedApiService from '@/services/feedApi'
import { meetingsApi } from '@/services/meetingsApi'

// Types
interface MypageState {
  profileData: any | null
  profileLoading: boolean
  profileError: string | null
  summaryData: any | null
  summaryLoading: boolean
  summaryError: string | null
  // Normalized feed container to simplify UI rendering
  feedData: { posts?: any[]; replies?: any[]; tagged?: any[] } | null
  feedLoading: boolean
  feedError: string | null
  activeTab: 'posts' | 'replies' | 'tagged'
  meetingsData: any[]
  meetingsLoading: boolean
  meetingsError: string | null
  badgesData: any[]
  badgesLoading: boolean
  badgesError: string | null
  likedPosts: number[]
  likedComments: number[]
  hasFetched: boolean
}

// Initial state
const initialState: MypageState = {
  profileData: null,
  profileLoading: false,
  profileError: null,
  summaryData: null,
  summaryLoading: false,
  summaryError: null,
  feedData: null,
  feedLoading: false,
  feedError: null,
  activeTab: 'posts',
  meetingsData: [],
  meetingsLoading: false,
  meetingsError: null,
  badgesData: [],
  badgesLoading: false,
  badgesError: null,
  likedPosts: [],
  likedComments: [],
  hasFetched: false
}

// Async thunks following MedQwik pattern
export const fetchProfile = createAsyncThunk(
  'mypage/fetchProfile',
  async (userId: number | undefined, { getState, rejectWithValue }) => {
    try {
      // fetchProfile -> calling API
      const response = await HomeApiService.getProfile(userId)
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch profile')
      }

      return response.data
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const fetchSummary = createAsyncThunk(
  'mypage/fetchSummary',
  async (_, { getState, rejectWithValue }) => {
    try {
      // fetchSummary -> calling API
      const response = await HomeApiService.getSummary()
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch summary')
      }

      return response.data
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const fetchFeed = createAsyncThunk(
  'mypage/fetchFeed',
  async (
    payload: { tab: 'posts' | 'replies' | 'tagged'; userId?: number },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as any
      const response = await FeedApiService.getFeed(payload.tab, payload.userId)
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch feed')
      }

      // response.data is the whole body: { success, data: { type, items, total } }
      // We only need the inner data payload for reducers
      const inner = (response.data as any)?.data
      
      // Get current user ID from auth state
      const currentUserId = state.authReducer?.user?.id || 1 // Fallback to 1 for now
      
      // Redux fetchFeed - Auth state
      
      return { data: inner, tab: payload.tab, currentUserId }
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const fetchBadges = createAsyncThunk(
  'mypage/fetchBadges',
  async (_, { getState, rejectWithValue }) => {
    try {
      // fetchBadges -> calling API
      const response = await HomeApiService.getBadges()
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch badges')
      }

      return response.data
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const fetchMeetings = createAsyncThunk(
  'mypage/fetchMeetings',
  async (
    params: { userId?: number; meetingType?: 'all' | 'created' | 'participated' | 'upcoming' } | undefined,
    { rejectWithValue }
  ) => {
    try {
      const userId = params?.userId
      const meetingType = params?.meetingType || 'all'
      const data = await meetingsApi.getMeetings(userId, meetingType)
      // Empty array is valid (no meetings), only null/undefined is an error
      if (data === null || data === undefined) {
        return rejectWithValue('Failed to fetch meetings')
      }
      return { meetingType, items: data }
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const likePost = createAsyncThunk(
  'mypage/likePost',
  async (postId: number, { rejectWithValue }) => {
    try {
      const response = await FeedApiService.likePost(postId.toString())
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to like post')
      }

      return {
        postId,
        liked: response.data.liked,
        likeCount: response.data.likeCount
      }
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const likeComment = createAsyncThunk(
  'mypage/likeComment',
  async (commentId: number, { rejectWithValue }) => {
    try {
      const response = await FeedApiService.likeComment(commentId.toString())
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to like comment')
      }

      return {
        commentId,
        liked: response.data.liked,
        likeCount: response.data.likeCount
      }
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const deleteComment = createAsyncThunk(
  'mypage/deleteComment',
  async (commentId: number, { rejectWithValue }) => {
    try {
      const response = await FeedApiService.deleteComment(commentId.toString())
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to delete comment')
      }

      return { commentId }
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)


export const updateProfilePrivacy = createAsyncThunk(
  'mypage/updateProfilePrivacy',
  async (publicVisibility: boolean, { rejectWithValue }) => {
    try {
      const { userApi } = await import('@/services/userApi')
      const response = await userApi.updateProfilePrivacy(publicVisibility)
      
      if (!response) {
        return rejectWithValue('Failed to update profile privacy')
      }

      return { publicVisibility }
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const updateTabPrivacy = createAsyncThunk(
  'mypage/updateTabPrivacy',
  async ({ tabType, privacy }: { tabType: 'feed' | 'meetings' | 'badges', privacy: boolean }, { rejectWithValue }) => {
    try {
      const { userApi } = await import('@/services/userApi')
      const response = await userApi.updateTabPrivacy(tabType, privacy)
      
      if (!response) {
        return rejectWithValue('Failed to update tab privacy')
      }

      return { tabType, privacy }
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

// Mypage slice
const mypageSlice = createSlice({
  name: 'mypage',
  initialState,
  reducers: {
    setActiveTab: (state, action) => {
      state.activeTab = action.payload
    },
    clearData: (state) => {
      state.profileData = null
      state.profileLoading = false
      state.profileError = null
      state.summaryData = null
      state.summaryLoading = false
      state.summaryError = null
      state.feedData = null
      state.feedLoading = false
      state.feedError = null
      state.meetingsData = []
      state.meetingsLoading = false
      state.meetingsError = null
      state.badgesData = []
      state.badgesLoading = false
      state.badgesError = null
      state.likedPosts = []
      state.likedComments = []
      state.hasFetched = false
    },
    clearCache: (state) => {
      // Clear cache logic if needed
    },
    updateProfileData: (state, action) => {
      if (state.profileData) {
        state.profileData = { ...state.profileData, ...action.payload }
      }
    }
  },
  extraReducers: (builder) => {
    // Fetch profile
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.profileLoading = true
        state.profileError = null
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.profileLoading = false
        state.profileData = action.payload
        state.profileError = null
        state.hasFetched = true
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.profileLoading = false
        state.profileError = action.payload as string
      })

    // Fetch summary
    builder
      .addCase(fetchSummary.pending, (state) => {
        state.summaryLoading = true
        state.summaryError = null
      })
      .addCase(fetchSummary.fulfilled, (state, action) => {
        state.summaryLoading = false
        state.summaryData = action.payload
        state.summaryError = null
        state.hasFetched = true
      })
      .addCase(fetchSummary.rejected, (state, action) => {
        state.summaryLoading = false
        state.summaryError = action.payload as string
      })

    // Fetch feed
    builder
      .addCase(fetchFeed.pending, (state) => {
        state.feedLoading = true
        state.feedError = null
      })
      .addCase(fetchFeed.fulfilled, (state, action) => {
        state.feedLoading = false
        // API returns shape: { type, items, total }
        const { type, items } = action.payload.data || {};
        const tab = (action.payload.tab || type) as 'posts' | 'replies' | 'tagged';
        const currentUserId = action.payload.currentUserId;

        // Normalize into a single object with keys posts/replies/tagged
        if (!state.feedData) {
          state.feedData = { posts: [], replies: [], tagged: [] }
        }
        
        // Helper function to enrich items with like status
        const enrichWithLikes = (items: any[]) => {
          return items.map((item: any) => {
            // Check if user has liked this post based on the likes array in the API response
            const isLiked = item.likes?.some((like: any) => like.userId === currentUserId) || false
            const likeCount = item.likes?.length || 0
            
            // Debug: Print current user ID and compare with likes
            if (item.likes && item.likes.length > 0) {
              // Post like status debug
            }
            
            // Add to likedPosts array if user has liked this post
            if (isLiked && !state.likedPosts.includes(item.id)) {
              state.likedPosts = [...state.likedPosts, item.id]
            }
            
            return {
              ...item,
              isLiked,
              likeCount
            }
          })
        }

        // Helper function to enrich comments with like status
        const enrichCommentsWithLikes = (comments: any[]) => {
          return comments.map((comment: any) => {
            // Check if user has liked this comment based on the likes array in the API response
            const isLiked = comment.likes?.some((like: any) => like.userId === currentUserId) || false
            const likeCount = comment.likes?.length || 0
            
            // Debug: Print current user ID and compare with comment likes
            if (comment.likes && comment.likes.length > 0) {
              // Comment like status debug
            }
            
            // Add to likedComments array if user has liked this comment
            if (isLiked && !state.likedComments.includes(comment.id)) {
              state.likedComments = [...state.likedComments, comment.id]
            }
            
            return {
              ...comment,
              isLiked,
              likeCount
            }
          })
        }

        // Create new feedData object to avoid mutation
        const newFeedData = { ...state.feedData }
        
        if (tab === 'posts') {
          newFeedData.posts = enrichWithLikes(items || [])
        } else if (tab === 'replies') {
          // Support both shapes:
          // 1) New API: items are posts with `comments` (only current user's comments)
          // 2) Legacy: items are comments with a nested `post`
          const isLegacyCommentShape = Array.isArray(items) && items.length > 0 && (items[0] as any)?.post

          if (!isLegacyCommentShape) {
            // New API shape: posts with filtered comments (only current user's)
            const transformedReplies = enrichWithLikes((items || []))
              .filter((post: any) => Array.isArray(post.comments))
              .map((post: any) => {
                const commentReplies = enrichCommentsWithLikes(post.comments || [])
                const firstMyComment = commentReplies[0]
                return {
                  ...post,
                  // Surface primary comment fields expected by UI list row
                  commentUser: firstMyComment?.user,
                  commentContent: firstMyComment?.content,
                  commentCreatedAt: firstMyComment?.createdAt,
                  commentId: firstMyComment?.id,
                  // In replies tab, like button targets YOUR main comment, not the post
                  isLiked: firstMyComment?.isLiked ?? false,
                  likeCount: firstMyComment?.likeCount ?? 0,
                  // Detailed list of your comments below the post
                  commentReplies,
                  // Expose total post-level counts for UI (complete counts)
                  postIsLiked: post.isLiked ?? false,
                  postLikeCount: post._count?.likes ?? (post.likes?.length || 0),
                  totalCommentsCount: post._count?.comments ?? 0
                }
              })
              // Only show posts that actually have at least one of user's comments
              .filter((post: any) => Array.isArray(post.commentReplies) && post.commentReplies.length > 0)

            newFeedData.replies = transformedReplies
          } else {
            // Legacy shape handling preserved for backward compatibility
            const transformedReplies = (items || []).map((comment: any) => {
              if (comment.post) {
                const enrichedComment = {
                  ...comment,
                  isLiked: comment.likes?.some((like: any) => like.userId === currentUserId) || false,
                  likeCount: comment.likes?.length || 0
                }

                if (enrichedComment.isLiked && !state.likedComments.includes(comment.id)) {
                  state.likedComments = [...state.likedComments, comment.id]
                }

                const enrichedPostBase = enrichWithLikes([comment.post])[0] || comment.post
                return {
                  ...enrichedPostBase,
                  commentUser: enrichedComment.user,
                  commentContent: enrichedComment.content,
                  commentCreatedAt: enrichedComment.createdAt,
                  commentId: enrichedComment.id,
                  commentReplies: enrichCommentsWithLikes(comment.replies || []),
                  isMyComment: comment.isMyComment,
                  isOnMyPost: comment.isOnMyPost
                }
              }
              return comment
            })
            newFeedData.replies = transformedReplies
          }
        } else if (tab === 'tagged') {
          // Transform tagged data: extract post data from comment objects (similar to replies)
          const transformedTagged = (items || []).map((comment: any) => {
            if (comment.post) {
              // Enrich the main comment with like status
              const enrichedComment = {
                ...comment,
                isLiked: comment.likes?.some((like: any) => like.userId === currentUserId) || false,
                likeCount: comment.likes?.length || 0
              }
              
              // Add to likedComments array if user has liked this comment
              if (enrichedComment.isLiked && !state.likedComments.includes(comment.id)) {
                state.likedComments = [...state.likedComments, comment.id]
              }
              
              // Return the post data with the comment as the main content
              const enrichedPost = {
                ...comment.post,
                // Add the comment as the main content for display
                commentContent: comment.content,
                commentUser: comment.user,
                commentCreatedAt: comment.createdAt,
                commentId: comment.id,
                commentReplies: enrichCommentsWithLikes(comment.replies || []),
                isMyComment: comment.isMyComment,
                isOnMyPost: comment.isOnMyPost
              }
              // Enrich the post with like status (store separately)
              const postIsLiked = enrichedPost.likes?.some((like: any) => like.userId === currentUserId) || false
              const postLikeCount = enrichedPost.likes?.length || 0
              
              // Add to likedPosts array if user has liked this post
              if (postIsLiked && !state.likedPosts.includes(enrichedPost.id)) {
                state.likedPosts = [...state.likedPosts, enrichedPost.id]
              }
              
              return {
                ...enrichedPost,
                // Expose comment metadata at top-level for UI
                user: enrichedComment.user,
                content: enrichedComment.content,
                createdAt: enrichedComment.createdAt,
                commentId: enrichedComment.id,
                // Primary like UI in tagged tab refers to the main comment
                isLiked: enrichedComment.isLiked,
                likeCount: enrichedComment.likeCount,
                // Also expose post like state if needed by UI
                postIsLiked,
                postLikeCount
              }
            }
            return comment
          })
          newFeedData.tagged = transformedTagged
        }

        // Update state with new feedData object
        state.feedData = newFeedData


        // Only update activeTab if it actually changed to prevent effect cascades
        if (state.activeTab !== tab) {
          state.activeTab = tab
        }
        state.feedError = null
        state.hasFetched = true
      })
      .addCase(fetchFeed.rejected, (state, action) => {
        state.feedLoading = false
        state.feedError = action.payload as string
      })

    // Fetch badges
    builder
      .addCase(fetchBadges.pending, (state) => {
        state.badgesLoading = true
        state.badgesError = null
      })
      .addCase(fetchBadges.fulfilled, (state, action) => {
        state.badgesLoading = false
        state.badgesData = action.payload
        state.badgesError = null
        state.hasFetched = true
      })
      .addCase(fetchBadges.rejected, (state, action) => {
        state.badgesLoading = false
        state.badgesError = action.payload as string
      })

    // Fetch meetings
    builder
      .addCase(fetchMeetings.pending, (state) => {
        state.meetingsLoading = true
        state.meetingsError = null
      })
      .addCase(fetchMeetings.fulfilled, (state, action) => {
        state.meetingsLoading = false
        const { meetingType, items } = action.payload as { meetingType: 'all' | 'created' | 'participated' | 'upcoming'; items: any[] }
        const existing: any = Array.isArray(state.meetingsData) ? {} : (state.meetingsData as any)
        const next: any = { ...existing }
        if (meetingType === 'all') next.all = items
        if (meetingType === 'participated') next.participated = items
        if (meetingType === 'created') next.created = items
        if (meetingType === 'upcoming') next.upcoming = items
        state.meetingsData = next
      })
      .addCase(fetchMeetings.rejected, (state, action) => {
        state.meetingsLoading = false
        state.meetingsError = action.payload as string
      })

    // Like post
    builder
      .addCase(likePost.pending, (state) => {
        // state.likeLoading = true
      })
      .addCase(likePost.fulfilled, (state, action) => {
        const { postId, liked, likeCount } = action.payload
        
        if (liked) {
          if (!state.likedPosts.includes(postId)) {
            state.likedPosts = [...state.likedPosts, postId]
          }
        } else {
          state.likedPosts = state.likedPosts.filter(id => id !== postId)
        }
        

        // Update like status in all feed data (immutable)
        const updatePostInFeed = (posts: any[]) => {
          return posts.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                isLiked: liked,
                likeCount: likeCount
              }
            }
            return post
          })
        }

        // Update like status in replies/tagged data (which have transformed structure)
        const updatePostInReplies = (replies: any[]) => {
          return replies.map(reply => {
            if (reply.id === postId) {
              return {
                ...reply,
                // For replies/tagged, the primary UI may read post-level fields
                postIsLiked: liked,
                postLikeCount: likeCount,
                // Also keep base fields in sync if present
                isLiked: liked,
                likeCount: likeCount
              }
            }
            return reply
          })
        }

        if (state.feedData) {
          state.feedData = {
            ...state.feedData,
            posts: updatePostInFeed(state.feedData.posts || []),
            replies: updatePostInReplies(state.feedData.replies || []),
            tagged: updatePostInReplies(state.feedData.tagged || [])
          }
        }
      })
      .addCase(likePost.rejected, (state, action) => {
        // Handle like post rejection
      })

    // Like comment
    builder
      .addCase(likeComment.fulfilled, (state, action) => {
        const { commentId, liked, likeCount } = action.payload
        
        if (liked) {
          if (!state.likedComments.includes(commentId)) {
            state.likedComments = [...state.likedComments, commentId]
          }
        } else {
          state.likedComments = state.likedComments.filter(id => id !== commentId)
        }

        // Update comment like status in all feed data (immutable)
        const updateCommentInFeed = (posts: any[]) => {
          return posts.map(post => {
            const updatedPost = { ...post }
            
            // Update main comments
            if (updatedPost.comments) {
              updatedPost.comments = updatedPost.comments.map((comment: any) => {
                if (comment.id === commentId) {
                  return {
                    ...comment,
                    isLiked: liked,
                    likeCount: likeCount
                  }
                }
                return comment
              })
            }
            
            // Update comment replies
            if (updatedPost.commentReplies) {
              updatedPost.commentReplies = updatedPost.commentReplies.map((comment: any) => {
                if (comment.id === commentId) {
                  return {
                    ...comment,
                    isLiked: liked,
                    likeCount: likeCount
                  }
                }
                return comment
              })
            }
            
            return updatedPost
          })
        }

        if (state.feedData) {
          state.feedData = {
            ...state.feedData,
            posts: updateCommentInFeed(state.feedData.posts || []),
            replies: updateCommentInFeed(state.feedData.replies || []),
            tagged: updateCommentInFeed(state.feedData.tagged || [])
          }
        }
      })
      .addCase(likeComment.rejected, (state, action) => {
        // Handle like comment rejection
      })

    // Delete comment
    builder
      .addCase(deleteComment.fulfilled, (state, action) => {
        const { commentId } = action.payload
        
        // Remove comment from likedComments if present
        state.likedComments = state.likedComments.filter(id => id !== commentId)

        // Remove comment from all feed data (immutable)
        const removeCommentFromFeed = (posts: any[]) => {
          return posts.map(post => {
            const updatedPost = { ...post }
            
            // Remove from main comments array
            if (updatedPost.comments) {
              updatedPost.comments = updatedPost.comments.filter((comment: any) => comment.id !== commentId)
              // Also need to remove from nested replies
              updatedPost.comments = updatedPost.comments.map((comment: any) => {
                if (comment.replies) {
                  return {
                    ...comment,
                    replies: comment.replies.filter((reply: any) => reply.id !== commentId)
                  }
                }
                return comment
              })
            }
            
            // Remove from comment replies
            if (updatedPost.commentReplies) {
              updatedPost.commentReplies = updatedPost.commentReplies.filter((comment: any) => comment.id !== commentId)
              // Also check nested replies
              updatedPost.commentReplies = updatedPost.commentReplies.map((comment: any) => {
                if (comment.replies) {
                  return {
                    ...comment,
                    replies: comment.replies.filter((reply: any) => reply.id !== commentId)
                  }
                }
                return comment
              })
            }
            
            return updatedPost
          })
        }

        if (state.feedData) {
          state.feedData = {
            ...state.feedData,
            posts: removeCommentFromFeed(state.feedData.posts || []),
            replies: removeCommentFromFeed(state.feedData.replies || []),
            tagged: removeCommentFromFeed(state.feedData.tagged || [])
          }
        }
      })
      .addCase(deleteComment.rejected, (state, action) => {
        // Handle delete comment rejection
      })


    // Update profile privacy
    builder
      .addCase(updateProfilePrivacy.fulfilled, (state, action) => {
        const { publicVisibility } = action.payload
        
        // Update profile data if it exists
        if (state.profileData && state.profileData.data && state.profileData.data.profile) {
          state.profileData = {
            ...state.profileData,
            data: {
              ...state.profileData.data,
              profile: {
                ...state.profileData.data.profile,
                publicVisibility
              }
            }
          }
        }
      })
      .addCase(updateProfilePrivacy.rejected, (state, action) => {
        // Handle update profile privacy rejection
      })

    // Update tab privacy
    builder
      .addCase(updateTabPrivacy.fulfilled, (state, action) => {
        const { tabType, privacy } = action.payload
        
        // Update profile data if it exists
        if (state.profileData && state.profileData.data && state.profileData.data.profile) {
          const updateField = tabType === 'feed' ? 'feedPrivacy' : 
                             tabType === 'meetings' ? 'meetingsPrivacy' : 'badgesPrivacy'
          
          state.profileData = {
            ...state.profileData,
            data: {
              ...state.profileData.data,
              profile: {
                ...state.profileData.data.profile,
                [updateField]: privacy
              }
            }
          }
        }
      })
      .addCase(updateTabPrivacy.rejected, (state, action) => {
        // Handle update tab privacy rejection
      })

    // Listen to postSlice like actions to keep mypageSlice synchronized
    builder
      .addCase('post/likePost/fulfilled', (state, action: any) => {
        const { postId, liked, likeCount } = action.payload
        
        // Update likedPosts array
        if (liked) {
          if (!state.likedPosts.includes(postId)) {
            state.likedPosts = [...state.likedPosts, postId]
          }
        } else {
          state.likedPosts = state.likedPosts.filter(id => id !== postId)
        }

        // Update like status in all feed data (immutable)
        const updatePostInFeed = (posts: any[]): any[] => {
          return posts.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                isLiked: liked,
                likeCount: likeCount
              }
            }
            return post
          })
        }

        // Update like status in replies/tagged data (which have transformed structure)
        const updatePostInReplies = (replies: any[]): any[] => {
          return replies.map(reply => {
            if (reply.id === postId) {
              return {
                ...reply,
                // For replies/tagged, the primary UI may read post-level fields
                postIsLiked: liked,
                postLikeCount: likeCount,
                // Also keep base fields in sync if present
                isLiked: liked,
                likeCount: likeCount
              }
            }
            return reply
          })
        }

        if (state.feedData) {
          state.feedData = {
            ...state.feedData,
            posts: updatePostInFeed(state.feedData.posts || []),
            replies: updatePostInReplies(state.feedData.replies || []),
            tagged: updatePostInReplies(state.feedData.tagged || [])
          }
        }
      })
      .addCase('post/likeComment/fulfilled', (state, action: any) => {
        const { commentId, liked, likeCount } = action.payload
        
        // Update comment like status in feed data
        const updateCommentInFeed = (comments: any[]): any[] => {
          return comments.map(comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                isLiked: liked,
                likeCount: likeCount
              }
            }
            if (comment.replies) {
              return {
                ...comment,
                replies: updateCommentInFeed(comment.replies)
              }
            }
            return comment
          })
        }

        if (state.feedData) {
          state.feedData = {
            ...state.feedData,
            posts: state.feedData.posts?.map(post => ({
              ...post,
              comments: post.comments ? updateCommentInFeed(post.comments) : []
            })) || [],
            replies: updateCommentInFeed(state.feedData.replies || []),
            tagged: updateCommentInFeed(state.feedData.tagged || [])
          }
        }
      })
  }
})

export const { 
  setActiveTab, 
  clearData, 
  clearCache, 
  updateProfileData 
} = mypageSlice.actions

export default mypageSlice.reducer
