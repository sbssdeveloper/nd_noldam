-- AlterTable: Add role column to users if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT '유저';
    END IF;
END $$;

-- AlterTable: Add columns to meeting_reviews if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meeting_reviews' AND column_name = 'isAnonymous') THEN
        ALTER TABLE "meeting_reviews" ADD COLUMN "isAnonymous" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meeting_reviews' AND column_name = 'isVerified') THEN
        ALTER TABLE "meeting_reviews" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- AlterTable: Add restriction_until to posts if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'restriction_until') THEN
        ALTER TABLE "posts" ADD COLUMN "restriction_until" TIMESTAMP(6);
    END IF;
END $$;

-- AlterTable: Add restriction_until to post_comments if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'post_comments' AND column_name = 'restriction_until') THEN
        ALTER TABLE "post_comments" ADD COLUMN "restriction_until" TIMESTAMP(6);
    END IF;
END $$;
