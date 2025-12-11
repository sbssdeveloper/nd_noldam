-- Update existing users to set default role for users without role
-- Convert Korean role values to English keys
UPDATE "users" 
SET "role" = 'user' 
WHERE "role" IS NULL 
   OR "role" = '' 
   OR COALESCE(TRIM("role"), '') = ''
   OR "role" = '유저';

-- Convert any existing '관리자' to 'manager'
UPDATE "users" 
SET "role" = 'manager' 
WHERE "role" = '관리자';

