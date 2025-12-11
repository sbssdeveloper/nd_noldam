-- Add meeting status and parent_meeting fields
-- Migration: Add meeting status management

-- Add new columns
ALTER TABLE "meetings" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE "meetings" ADD COLUMN "parent_meeting" INTEGER;

-- Create indexes for new fields
CREATE INDEX "meetings_status_idx" ON "meetings"("status");
CREATE INDEX "meetings_parent_meeting_idx" ON "meetings"("parent_meeting");

-- Add foreign key constraint for parent_meeting
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_parent_meeting_fkey" 
FOREIGN KEY ("parent_meeting") REFERENCES "meetings"("id") ON DELETE SET NULL;
