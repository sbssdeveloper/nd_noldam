-- AlterTable: Add onDelete: Cascade to meetings.userId
ALTER TABLE "meetings" DROP CONSTRAINT "meetings_userId_fkey";
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add onDelete: Cascade to post_comments.userId
ALTER TABLE "post_comments" DROP CONSTRAINT "post_comments_userId_fkey";
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add onDelete: Cascade to post_likes.userId
ALTER TABLE "post_likes" DROP CONSTRAINT "post_likes_userId_fkey";
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add onDelete: Cascade to posts.userId
ALTER TABLE "posts" DROP CONSTRAINT "posts_userId_fkey";
ALTER TABLE "posts" ADD CONSTRAINT "posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add onDelete: Cascade to user_badges.userId
ALTER TABLE "user_badges" DROP CONSTRAINT "user_badges_userId_fkey";
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add onDelete: Cascade to community_ratings.userId
ALTER TABLE "community_ratings" DROP CONSTRAINT "community_ratings_userId_fkey";
ALTER TABLE "community_ratings" ADD CONSTRAINT "community_ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
