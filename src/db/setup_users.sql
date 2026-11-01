-- ============================================================
-- Setup Driver and Conductor Users
-- Run this AFTER creating users in Supabase Auth
-- ============================================================

-- Insert or update the bus with assignment columns
INSERT INTO buses (plate_number, route_code, route_name, capacity, assigned_driver_id, assigned_conductor_id)
VALUES ('BUS-001', 'R001', 'Manolo Fortich → Agora', 45, 'aabfd23e-6721-4840-a3ad-4a649efd8f55', 'cd008646-8abe-43aa-b1ad-9707070a5377')
ON CONFLICT (plate_number) DO UPDATE SET
  assigned_driver_id = EXCLUDED.assigned_driver_id,
  assigned_conductor_id = EXCLUDED.assigned_conductor_id;

-- Insert driver into staff_users (if not exists)
INSERT INTO staff_users (id, email, full_name, phone, role, bus_id, is_active)
VALUES (
  'aabfd23e-6721-4840-a3ad-4a649efd8f55',
  'driver@omanfortsco.com',
  'John Driver',
  '+1234567890',
  'driver',
  (SELECT id FROM buses WHERE plate_number = 'BUS-001'),
  true
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  bus_id = EXCLUDED.bus_id,
  is_active = true;

-- Insert conductor into staff_users (if not exists)
INSERT INTO staff_users (id, email, full_name, phone, role, bus_id, is_active)
VALUES (
  'cd008646-8abe-43aa-b1ad-9707070a5377',
  'conductor@omanfortsco.com',
  'Jane Conductor',
  '+0987654321',
  'conductor',
  (SELECT id FROM buses WHERE plate_number = 'BUS-001'),
  true
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  bus_id = EXCLUDED.bus_id,
  is_active = true;

-- Verify the setup
SELECT
  b.plate_number,
  b.route_name,
  d.full_name as driver_name,
  d.email as driver_email,
  c.full_name as conductor_name,
  c.email as conductor_email
FROM buses b
LEFT JOIN staff_users d ON b.assigned_driver_id = d.id
LEFT JOIN staff_users c ON b.assigned_conductor_id = c.id
WHERE b.plate_number = 'BUS-001';
