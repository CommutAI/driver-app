-- ============================================================
-- Fix Stuck Trip - Clear conductor's active trip
-- Run this if you see "duplicate key value violates unique constraint 'idx_trips_conductor_one_active'"
-- ============================================================
--
-- Conductor ID: cd008646-8abe-43aa-b1ad-9707070a5377
-- Driver ID: aabfd23e-6721-4840-a3ad-4a649efd8f55
-- Stuck Trip ID: 0fd7a298-3be4-4787-ad08-e751d3dd4998
-- ============================================================

-- Step 1: Find any active trips for the conductor
SELECT
  id,
  conductor_id,
  driver_id,
  bus_id,
  status,
  started_at,
  ended_at
FROM trips
WHERE conductor_id = 'cd008646-8abe-43aa-b1ad-9707070a5377'
  AND status = 'in_progress'
ORDER BY started_at DESC;

-- Step 2: End the stuck trip
UPDATE trips
SET
  status = 'completed',
  ended_at = NOW()
WHERE id = '0fd7a298-3be4-4787-ad08-e751d3dd4998';

-- Alternative: If there are multiple stuck trips, end all active trips for this conductor
-- UPDATE trips
-- SET status = 'completed', ended_at = NOW()
-- WHERE conductor_id = 'cd008646-8abe-43aa-b1ad-9707070a5377'
--   AND status = 'in_progress';

-- Step 3: Verify the fix
SELECT
  id,
  conductor_id,
  driver_id,
  bus_id,
  status,
  started_at,
  ended_at
FROM trips
WHERE conductor_id = 'cd008646-8abe-43aa-b1ad-9707070a5377'
ORDER BY started_at DESC;
