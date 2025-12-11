-- Alter home_page_settings: remove redirectUrl, target; add scope, meetings, categories
-- Note: Adjust defaults and existing data as needed

ALTER TABLE "home_page_settings"
  DROP COLUMN IF EXISTS "redirectUrl",
  DROP COLUMN IF EXISTS "target",
  ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS "meetings" INTEGER[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "categories" INTEGER[] NOT NULL DEFAULT '{}';

-- status column already exists; ensure it remains

