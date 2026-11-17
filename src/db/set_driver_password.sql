-- Set password for driver account
-- Run this in Supabase SQL Editor to enable login
-- Password: driver123

UPDATE staff_users
SET password = '$2b$10$Il4qa2/Xg3TLu431Js17BecEZtfTPx0YfZrvfQO/Zx0bBMLUapt8G'
WHERE email = 'driver@commutai.local';

-- Verify the password was set
SELECT id, email, full_name, role, is_active,
       CASE WHEN password IS NOT NULL THEN 'Password set' ELSE 'No password' END as password_status
FROM staff_users
WHERE email = 'driver@commutai.local';
