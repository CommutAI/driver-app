-- ============================================================
-- Check Auth User Mapping
-- This helps debug why trips aren't showing up
-- ============================================================

-- 1. Check all staff_users (passwords are NOT stored here - handled by Supabase Auth)
SELECT
  id as staff_id,
  email,
  full_name,
  role,
  is_active,
  bus_id
FROM staff_users
ORDER BY role, full_name;

-- 2. Check all trips with their conductor/driver
SELECT
  t.id as trip_id,
  t.status,
  t.started_at,
  t.ended_at,
  t.conductor_id,
  t.driver_id,
  c.full_name as conductor_name,
  d.full_name as driver_name
FROM trips t
LEFT JOIN staff_users c ON t.conductor_id = c.id
LEFT JOIN staff_users d ON t.driver_id = d.id
ORDER BY t.started_at DESC;

-- 3. To fix auth mapping, you need to:
--    a. Log in to Supabase Dashboard
--    b. Go to Authentication > Users
--    c. Find the user with email 'driver@commutai.local'
--    d. Copy their UUID from Supabase Auth
--    e. Update staff_users.id to match that UUID:
--
-- UPDATE staff_users
-- SET id = 'SUPABASE_AUTH_UUID_HERE'
-- WHERE email = 'driver@commutai.local';
--
-- OR create the user in Supabase Auth with the existing staff_users UUID:
-- This must be done via Supabase Dashboard > Authentication > Users > Add User
-- and manually set the UUID to match staff_users.id
-- NOTE: When creating users in Supabase Auth, set a secure password there
-- Passwords are NOT stored in the staff_users table
