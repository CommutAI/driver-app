-- ============================================================
--  CommutAI Driver App — Standalone Database Schema
--
--  This schema contains all tables needed for the driver application.
--  It focuses on driver/conductor workflows including:
--    • Driver profile and bus assignment
--    • Trip management (start, end, status tracking)
--    • Passenger counting (AI + manual)
--    • GPS location tracking
--    • Emergency alerts and incident reporting
--    • Notifications and audit logging
-- ============================================================

-- Enable UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
--  ENUMS
-- ============================================================

CREATE TYPE trip_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'delayed');
CREATE TYPE alert_type AS ENUM ('medical', 'accident', 'breakdown', 'security', 'other');
CREATE TYPE notification_type AS ENUM ('alert', 'info', 'warning', 'incident_report');
CREATE TYPE staff_role AS ENUM ('driver', 'conductor', 'admin', 'operator');
CREATE TYPE sms_status AS ENUM ('pending', 'sent', 'failed', 'retrying', 'permanently_failed');
CREATE TYPE sms_type AS ENUM ('emergency', 'card_reserved', 'card_approved', 'card_claimed', 'topup');

-- ============================================================
--  TABLES
-- ============================================================

-- ── staff_users ─────────────────────────────────────────────────────────────────
-- Driver/conductor profile and bus assignment
CREATE TABLE staff_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role staff_role NOT NULL DEFAULT 'driver',
  bus_id UUID REFERENCES buses(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── buses ───────────────────────────────────────────────────────────────────────
-- Bus details (plate, route, capacity, staff assignments)
CREATE TABLE buses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plate_number TEXT UNIQUE NOT NULL,
  route_code TEXT NOT NULL,
  route_name TEXT,
  capacity INTEGER NOT NULL,
  assigned_driver_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  assigned_conductor_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── trips ───────────────────────────────────────────────────────────────────────
-- Active and past trips (linked to conductor/driver)
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID,
  bus_id UUID REFERENCES buses(id) ON DELETE RESTRICT,
  route_id UUID,
  trip_number INTEGER,
  conductor_id UUID REFERENCES staff_users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES staff_users(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  shift_id UUID,
  status trip_status NOT NULL DEFAULT 'scheduled',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  current_lat DECIMAL(10, 8),
  current_lng DECIMAL(11, 8),
  gps_updated_at TIMESTAMPTZ,
  current_stop_id UUID,
  starting_point TEXT,
  end_point TEXT,
  total_passengers INTEGER DEFAULT 0,
  total_fares DECIMAL(10, 2) DEFAULT 0,
  incidents INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── passenger_counts ─────────────────────────────────────────────────────────────
-- AI + manual headcount snapshots
CREATE TABLE passenger_counts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  count INTEGER NOT NULL,
  source TEXT NOT NULL, -- 'ai', 'manual', 'scan'
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── boarded_passengers ───────────────────────────────────────────────────────────
-- Scan-validated on-board count
CREATE TABLE boarded_passengers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  passenger_identifier TEXT, -- QR code or other identifier
  boarded_at TIMESTAMPTZ DEFAULT NOW(),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8)
);

-- ── gps_locations ───────────────────────────────────────────────────────────────
-- Live GPS stream (trip_id scoped)
CREATE TABLE gps_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  speed DECIMAL(6, 2),
  heading DECIMAL(5, 2),
  accuracy DECIMAL(6, 2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── emergency_alerts ────────────────────────────────────────────────────────────
-- Emergency alerts triggered by driver or conductor
CREATE TABLE emergency_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  conductor_id UUID REFERENCES staff_users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES staff_users(id) ON DELETE CASCADE,
  alert_type alert_type NOT NULL,
  description TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── emergency_contacts ───────────────────────────────────────────────────────────
-- Additional emergency contacts beyond staff users
CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  relationship TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── sms_queue ───────────────────────────────────────────────────────────────────
-- Queue for SMS messages to be sent (processed by Edge Function)
CREATE TABLE sms_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  sms_type sms_type NOT NULL DEFAULT 'emergency',
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  status sms_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  metadata JSONB,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  approval_deadline TIMESTAMPTZ,
  auto_approve_after_hours INTEGER DEFAULT 48,
  priority INTEGER DEFAULT 5,
  related_id UUID,
  max_retries INTEGER DEFAULT 3
);

-- ── notifications ────────────────────────────────────────────────────────────────
-- System-wide alerts and messages, plus driver incident reports
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type notification_type NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  sender_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── audit_logs ───────────────────────────────────────────────────────────────────
-- Driver action logging
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  INDEXES
-- ============================================================

CREATE INDEX idx_trips_conductor_id ON trips(conductor_id);
CREATE INDEX idx_trips_driver_id ON trips(driver_id);
CREATE INDEX idx_trips_bus_id ON trips(bus_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_started_at ON trips(started_at);
CREATE INDEX idx_trips_route_id ON trips(route_id);
CREATE INDEX idx_trips_schedule_id ON trips(schedule_id);

CREATE INDEX idx_passenger_counts_trip_id ON passenger_counts(trip_id);
CREATE INDEX idx_passenger_counts_recorded_at ON passenger_counts(recorded_at);

CREATE INDEX idx_boarded_passengers_trip_id ON boarded_passengers(trip_id);
CREATE INDEX idx_boarded_passengers_boarded_at ON boarded_passengers(boarded_at);

CREATE INDEX idx_gps_locations_trip_id ON gps_locations(trip_id);
CREATE INDEX idx_gps_locations_recorded_at ON gps_locations(recorded_at);

CREATE INDEX idx_emergency_alerts_trip_id ON emergency_alerts(trip_id);
CREATE INDEX idx_emergency_alerts_conductor_id ON emergency_alerts(conductor_id);
CREATE INDEX idx_emergency_alerts_driver_id ON emergency_alerts(driver_id);
CREATE INDEX idx_emergency_alerts_is_resolved ON emergency_alerts(is_resolved);

CREATE INDEX idx_emergency_contacts_is_active ON emergency_contacts(is_active);

CREATE INDEX idx_sms_queue_status ON sms_queue(status);
CREATE INDEX idx_sms_queue_priority ON sms_queue(priority, created_at);
CREATE INDEX idx_sms_queue_sms_type ON sms_queue(sms_type);
CREATE INDEX idx_sms_queue_trip_id ON sms_queue(trip_id);

CREATE INDEX idx_notifications_trip_id ON notifications(trip_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_trip_id ON audit_logs(trip_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================
--  ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE passenger_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE boarded_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;


-- ── RLS: staff_users ──────────────────────────────────────────────────────────
-- Drivers can read their own profile; admins can read all
CREATE POLICY "staff_users_self_read"
  ON staff_users FOR SELECT
  USING (id = auth.uid() OR role = 'admin');

CREATE POLICY "staff_users_self_update"
  ON staff_users FOR UPDATE
  USING (id = auth.uid());

-- ── RLS: buses ────────────────────────────────────────────────────────────────
-- All authenticated staff can read buses (for route info)
CREATE POLICY "buses_read_all"
  ON buses FOR SELECT
  USING (true);

-- ── RLS: trips ─────────────────────────────────────────────────────────────────
-- Both conductors and drivers can read their own trips; admins can read all
CREATE POLICY "trips_read_own"
  ON trips FOR SELECT
  USING (
    conductor_id = auth.uid()
    OR driver_id = auth.uid()
    OR current_user_role() = 'admin'
  );

CREATE POLICY "trips_insert_own"
  ON trips FOR INSERT
  WITH CHECK (
    conductor_id = auth.uid()
    OR driver_id = auth.uid()
    OR current_user_role() = 'admin'
  );

CREATE POLICY "trips_update_own"
  ON trips FOR UPDATE
  USING (
    conductor_id = auth.uid()
    OR driver_id = auth.uid()
    OR current_user_role() = 'admin'
  );

-- ── RLS: passenger_counts ─────────────────────────────────────────────────────
-- Both conductors and drivers can read counts for their trips; admins can read all
CREATE POLICY "passenger_counts_read_own"
  ON passenger_counts FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE conductor_id = auth.uid() OR driver_id = auth.uid()
    )
    OR current_user_role() = 'admin'
  );

CREATE POLICY "passenger_counts_insert_own"
  ON passenger_counts FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE conductor_id = auth.uid() OR driver_id = auth.uid()
    )
  );

-- ── RLS: boarded_passengers ───────────────────────────────────────────────────
-- Both conductors and drivers can read boarded passengers for their trips; admins can read all
CREATE POLICY "boarded_passengers_read_own"
  ON boarded_passengers FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE conductor_id = auth.uid() OR driver_id = auth.uid()
    )
    OR current_user_role() = 'admin'
  );

CREATE POLICY "boarded_passengers_insert_own"
  ON boarded_passengers FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE conductor_id = auth.uid() OR driver_id = auth.uid()
    )
  );

-- ── RLS: gps_locations ────────────────────────────────────────────────────────
-- Both conductors and drivers can read GPS for their trips; admins can read all
CREATE POLICY "gps_locations_read_own"
  ON gps_locations FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE conductor_id = auth.uid() OR driver_id = auth.uid()
    )
    OR current_user_role() = 'admin'
  );

CREATE POLICY "gps_locations_insert_own"
  ON gps_locations FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE conductor_id = auth.uid() OR driver_id = auth.uid()
    )
  );

-- ── RLS: emergency_alerts ───────────────────────────────────────────────────────
-- Both conductors and drivers can read their own alerts; admins can read all
CREATE POLICY "emergency_alerts_read_own"
  ON emergency_alerts FOR SELECT
  USING (
    conductor_id = auth.uid()
    OR driver_id = auth.uid()
    OR current_user_role() = 'admin'
  );

CREATE POLICY "emergency_alerts_insert_own"
  ON emergency_alerts FOR INSERT
  WITH CHECK (
    conductor_id = auth.uid()
    OR driver_id = auth.uid()
  );

CREATE POLICY "emergency_alerts_update_own"
  ON emergency_alerts FOR UPDATE
  USING (
    conductor_id = auth.uid()
    OR driver_id = auth.uid()
    OR current_user_role() = 'admin'
  );

-- ── RLS: emergency_contacts ─────────────────────────────────────────────────────
-- Admins can read/write; others can read only
CREATE POLICY "emergency_contacts_read_all"
  ON emergency_contacts FOR SELECT
  USING (true);

CREATE POLICY "emergency_contacts_write_admin"
  ON emergency_contacts FOR ALL
  USING (current_user_role() = 'admin');

-- ── RLS: sms_queue ───────────────────────────────────────────────────────────────
-- Edge Function service role needs full access; regular users can read their own
CREATE POLICY "sms_queue_read_own"
  ON sms_queue FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE conductor_id = auth.uid() OR driver_id = auth.uid()
    )
    OR current_user_role() = 'admin'
  );

CREATE POLICY "sms_queue_insert_own"
  ON sms_queue FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE conductor_id = auth.uid() OR driver_id = auth.uid()
    )
  );

CREATE POLICY "sms_queue_update_service"
  ON sms_queue FOR UPDATE
  USING (current_user_role() = 'admin');

-- ── RLS: notifications ───────────────────────────────────────────────────────────
-- Both conductors and drivers can read notifications for their trips; admins can read all
CREATE POLICY "notifications_read_own"
  ON notifications FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE conductor_id = auth.uid() OR driver_id = auth.uid()
    )
    OR sender_id = auth.uid()
    OR current_user_role() = 'admin'
  );

CREATE POLICY "notifications_insert_own"
  ON notifications FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (sender_id = auth.uid());

-- ── RLS: audit_logs ─────────────────────────────────────────────────────────────
-- Drivers can read their own logs; admins can read all
CREATE POLICY "audit_logs_read_own"
  ON audit_logs FOR SELECT
  USING (
    user_id = auth.uid() OR current_user_role() = 'admin'
  );

CREATE POLICY "audit_logs_insert_own"
  ON audit_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================
--  FUNCTIONS
-- ============================================================

-- Function to get current user role (from staff_users)
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS staff_role AS $$
  SELECT role FROM staff_users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-assign conductor and driver from bus assignment
CREATE OR REPLACE FUNCTION auto_assign_staff_from_bus()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-assign conductor from bus's assigned_conductor_id if not provided
  IF NEW.conductor_id IS NULL THEN
    SELECT assigned_conductor_id INTO NEW.conductor_id
    FROM buses
    WHERE id = NEW.bus_id;
  END IF;

  -- Auto-assign driver from bus's assigned_driver_id if not provided
  IF NEW.driver_id IS NULL THEN
    SELECT assigned_driver_id INTO NEW.driver_id
    FROM buses
    WHERE id = NEW.bus_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
--  TRIGGERS
-- ============================================================

CREATE TRIGGER update_staff_users_updated_at
  BEFORE UPDATE ON staff_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buses_updated_at
  BEFORE UPDATE ON buses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emergency_contacts_updated_at
  BEFORE UPDATE ON emergency_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sms_queue_updated_at
  BEFORE UPDATE ON sms_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_auto_assign_staff_from_bus
  BEFORE INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_staff_from_bus();

-- ============================================================
--  SETUP INSTRUCTIONS
-- ============================================================
-- 1. Run this schema in Supabase SQL Editor to create all tables
-- 2. Run setup_users.sql to create driver and conductor users with bus assignments
-- 3. Create users in Supabase Auth with the emails specified in setup_users.sql
-- 4. The driver/conductor app will now authenticate and load the assigned bus
-- ============================================================
