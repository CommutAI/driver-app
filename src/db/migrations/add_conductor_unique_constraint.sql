-- Migration: Add partial unique index to ensure one active trip per conductor
-- This prevents a conductor from having multiple trips with status 'in_progress'
-- The constraint 'idx_trips_conductor_one_active' enforces business logic

-- Create the partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_conductor_one_active
  ON trips (conductor_id)
  WHERE status = 'in_progress';

-- This index ensures:
-- 1. A conductor can have at most ONE trip with status = 'in_progress'
-- 2. Multiple completed/cancelled trips for the same conductor are allowed
-- 3. When a trip ends (status changes to 'completed'), the constraint is automatically satisfied
