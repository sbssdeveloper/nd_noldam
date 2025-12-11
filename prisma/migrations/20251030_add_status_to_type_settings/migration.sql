-- Add status column to type_settings
ALTER TABLE "type_settings"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';

