-- Migration: Add password column to staff_users for custom authentication
-- This enables custom bcrypt-based authentication instead of Supabase Auth

-- Add password column if it doesn't exist
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS password TEXT;

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'staff_users'
ORDER BY ordinal_position;

-- Expected columns should now include: password
