-- Performance Optimization Indexes
-- These indexes significantly improve query performance for the most common queries

-- 1. Post queries (userId + createdAt for ordered user posts)
CREATE INDEX IF NOT EXISTS "idx_posts_userId_createdAt" ON "posts"("userId", "createdAt" DESC);

-- 2. PostComment queries (postId for comments on a post, userId for user's comments)
CREATE INDEX IF NOT EXISTS "idx_postComments_postId" ON "post_comments"("postId");
CREATE INDEX IF NOT EXISTS "idx_postComments_userId" ON "post_comments"("userId");
CREATE INDEX IF NOT EXISTS "idx_postComments_parentCommentId" ON "post_comments"("parentCommentId");

-- 3. PostLikes queries (userId + postId for checking likes, postId for counting)
CREATE INDEX IF NOT EXISTS "idx_postLikes_postId" ON "post_likes"("postId");
CREATE INDEX IF NOT EXISTS "idx_postLikes_userId_postId" ON "post_likes"("userId", "postId");

-- 4. CommentLikes queries
CREATE INDEX IF NOT EXISTS "idx_commentLikes_commentId" ON "comment_likes"("commentId");
CREATE INDEX IF NOT EXISTS "idx_commentLikes_userId_commentId" ON "comment_likes"("userId", "commentId");

-- 5. Follower queries (userId for following list, following for followers list)
CREATE INDEX IF NOT EXISTS "idx_followers_userId" ON "followers"("userId");
CREATE INDEX IF NOT EXISTS "idx_followers_following" ON "followers"("following");

-- 6. MeetingParticipant queries (userId for user's meetings, meetingId for participants)
CREATE INDEX IF NOT EXISTS "idx_meetingParticipants_userId" ON "meeting_participants"("userId");
CREATE INDEX IF NOT EXISTS "idx_meetingParticipants_meetingId" ON "meeting_participants"("meetingId");
CREATE INDEX IF NOT EXISTS "idx_meetingParticipants_userId_joinedOn" ON "meeting_participants"("userId", "joinedOn" DESC);

-- 7. Meeting queries (userId for created meetings, meetingTime for time-based queries)
CREATE INDEX IF NOT EXISTS "idx_meetings_userId_createdAt" ON "meetings"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_meetings_meetingTime" ON "meetings"("meetingTime");

-- 8. UserBadge queries (userId for user's badges)
CREATE INDEX IF NOT EXISTS "idx_userBadges_userId_earnedAt" ON "user_badges"("userId", "earnedAt" DESC);

-- 9. UserNotification queries (userId for user's notifications)
CREATE INDEX IF NOT EXISTS "idx_userNotifications_userId_createdAt" ON "user_notifications"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_userNotifications_userId_isRead" ON "user_notifications"("userId", "isRead");

-- 10. UserMention queries (postId and mentionedUserId)
CREATE INDEX IF NOT EXISTS "idx_userMentions_mentionedUserId" ON "user_mentions"("mentionedUserId");
CREATE INDEX IF NOT EXISTS "idx_userMentions_postId" ON "user_mentions"("postId");

-- 11. Profile queries (userId is already unique, but add for foreign key performance)
CREATE INDEX IF NOT EXISTS "idx_profiles_userId" ON "profiles"("userId");

