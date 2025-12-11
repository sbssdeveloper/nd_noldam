/*
  Warnings:

  - You are about to drop the column `adminApproval` on the `meetings` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "idx_commentLikes_commentId";

-- DropIndex
DROP INDEX "idx_commentLikes_userId_commentId";

-- DropIndex
DROP INDEX "idx_followers_following";

-- DropIndex
DROP INDEX "idx_followers_userId";

-- DropIndex
DROP INDEX "idx_meetingParticipants_meetingId";

-- DropIndex
DROP INDEX "idx_meetingParticipants_userId";

-- DropIndex
DROP INDEX "idx_meetingParticipants_userId_joinedOn";

-- DropIndex (removed adminApproval references)

-- DropIndex
DROP INDEX "idx_postComments_parentCommentId";

-- DropIndex
DROP INDEX "idx_postComments_postId";

-- DropIndex
DROP INDEX "idx_postComments_userId";

-- DropIndex
DROP INDEX "idx_postLikes_postId";

-- DropIndex
DROP INDEX "idx_postLikes_userId_postId";

-- DropIndex
DROP INDEX "idx_posts_userId_createdAt";

-- DropIndex
DROP INDEX "idx_profiles_userId";

-- DropIndex
DROP INDEX "idx_userBadges_userId_earnedAt";

-- DropIndex
DROP INDEX "idx_userMentions_mentionedUserId";

-- DropIndex
DROP INDEX "idx_userMentions_postId";

-- DropIndex
DROP INDEX "idx_userNotifications_userId_createdAt";

-- DropIndex
DROP INDEX "idx_userNotifications_userId_isRead";

-- AlterTable (adminApproval column already removed)

-- CreateTable
CREATE TABLE "genres" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "meetings" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);
