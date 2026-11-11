-- Migration: Remove password column from staff_users
-- Passwords are handled by Supabase Auth, storing them here is redundant and insecure

-- Step 1: Drop the password column if it exists
ALTER TABLE staff_users DROP COLUMN IF EXISTS password;

-- Step 2: Verify the column is gone
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'staff_users'
ORDER BY ordinal_position;

-- The result should NOT show a 'password' column
-- Expected columns: id, email, full_name, phone, role, bus_id, is_active, created_at, updated_at
