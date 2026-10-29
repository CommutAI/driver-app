-- Migration: Add SMS Queue and Emergency Contacts tables
-- This migration adds the database-driven SMS queue system for emergency alerts

-- Add new enum types
CREATE TYPE IF NOT EXISTS sms_status AS ENUM ('pending', 'sent', 'failed', 'retrying', 'permanently_failed');
CREATE TYPE IF NOT EXISTS sms_type AS ENUM ('emergency', 'card_reserved', 'card_approved', 'card_claimed', 'topup');

-- Create emergency_contacts table
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  relationship TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sms_queue table (matches existing format)
CREATE TABLE IF NOT EXISTS sms_queue (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_is_active ON emergency_contacts(is_active);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_priority ON emergency_contacts(priority);

CREATE INDEX IF NOT EXISTS idx_sms_queue_status ON sms_queue(status);
CREATE INDEX IF NOT EXISTS idx_sms_queue_priority ON sms_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_sms_queue_sms_type ON sms_queue(sms_type);
CREATE INDEX IF NOT EXISTS idx_sms_queue_trip_id ON sms_queue(trip_id);

-- Enable RLS
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for emergency_contacts
CREATE POLICY IF NOT EXISTS "emergency_contacts_read_all"
  ON emergency_contacts FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "emergency_contacts_write_admin"
  ON emergency_contacts FOR ALL
  USING (current_user_role() = 'admin');

-- RLS policies for sms_queue
CREATE POLICY IF NOT EXISTS "sms_queue_read_own"
  ON sms_queue FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE conductor_id = auth.uid() OR driver_id = auth.uid()
    )
    OR current_user_role() = 'admin'
  );

CREATE POLICY IF NOT EXISTS "sms_queue_insert_own"
  ON sms_queue FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE conductor_id = auth.uid() OR driver_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "sms_queue_update_service"
  ON sms_queue FOR UPDATE
  USING (current_user_role() = 'admin');

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_emergency_contacts_updated_at
  BEFORE UPDATE ON emergency_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_sms_queue_updated_at
  BEFORE UPDATE ON sms_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample emergency contacts (optional)
INSERT INTO emergency_contacts (name, phone, role, is_active, priority) VALUES
  ('Emergency Dispatch', '09171234567', 'Dispatch', true, 10),
  ('Security Team', '09187654321', 'Security', true, 8),
  ('Medical Emergency', '09191234567', 'Medical', true, 9)
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON emergency_contacts TO anon, authenticated;
GRANT ALL ON sms_queue TO anon, authenticated;
GRANT ALL ON SEQUENCE emergency_contacts_id_seq TO anon, authenticated;
GRANT ALL ON SEQUENCE sms_queue_id_seq TO anon, authenticated;
