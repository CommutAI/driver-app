-- ============================================================
-- Debug Authentication Issues
-- Run this to verify user setup
-- ============================================================

-- Check all staff_users
SELECT
  id,
  email,
  full_name,
  role,
  is_active,
  bus_id
FROM staff_users
ORDER BY created_at DESC;

-- Check the specific user
SELECT
  su.id as staff_id,
  su.email as staff_email,
  su.is_active,
  su.role,
  b.plate_number,
  b.assigned_driver_id,
  b.assigned_conductor_id
FROM staff_users su
LEFT JOIN buses b ON su.bus_id = b.id
WHERE su.email = 'driver@commutai.local';

-- Check RLS policies on staff_users
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'staff_users';
