-- ============================================================
-- Fix User Setup - Remove password from staff_users
-- Supabase Auth handles passwords, NOT the database
-- ============================================================

-- Step 1: Remove password column if it exists (it shouldn't be there)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_users' AND column_name = 'password'
  ) THEN
    ALTER TABLE staff_users DROP COLUMN password;
    RAISE NOTICE 'Dropped password column from staff_users';
  END IF;
END $$;

-- Step 2: Insert or update the user WITHOUT password
-- IMPORTANT: The UUID must match the Supabase Auth user ID
INSERT INTO staff_users (id, full_name, email, phone, employee_id, is_active, bus_id, license_number, license_expiry, emergency_contact, emergency_phone, role, branch)
VALUES (
  'aabfd23e-6721-4840-a3ad-4a649efd8f55',  -- Must match Supabase Auth user ID
  'Driver',
  'driver@commutai.local',
  '09927268704',
  null,
  true,
  'aa1515ef-bc37-4f71-b848-5233eda470e9',
  null,
  null,
  null,
  null,
  'driver',
  null
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  bus_id = EXCLUDED.bus_id,
  is_active = EXCLUDED.is_active,
  role = EXCLUDED.role;

-- Step 3: Verify the user
SELECT id, email, full_name, role, is_active, bus_id
FROM staff_users
WHERE email = 'driver@commutai.local';
