-- ============================================================
--  CommutAI Driver App — Database Notes
--
--  The driver app uses the SHARED CommutAI PostgreSQL schema.
--  Run the main CommutAI schema SQL in Supabase first, then
--  apply the RLS additions below.
--
--  Tables used by the driver app (READ):
--    • staff_users        — driver/conductor profile & bus assignment
--    • buses              — assigned bus details (plate, route, capacity)
--    • trips              — active and past trips (conductor_id = user.id)
--    • passenger_counts   — AI + manual headcount snapshots
--    • boarded_passengers — scan-validated on-board count
--    • gps_locations      — live GPS stream (trip_id scoped)
--    • notifications      — system-wide alerts and messages
--
--  Tables used by the driver app (WRITE):
--    • trips              — update status, ended_at, current GPS
--    • emergency_alerts   — insert new alerts (conductor_id = user.id)
--    • notifications      — insert incident reports as alert-type rows
--    • audit_logs         — insert driver actions
--
--  Tables NOT used by the driver app:
--    • qr_cards, temporary_tickets, transactions — conductor/CS only
--    • fare_matrix, baggage_fee_matrix           — conductor/CS only
--    • fare_irregularities                       — conductor/admin only
--    • bus_schedules, trip_schedules             — admin/operator only
--    • sms_logs, gps_logs, hardware_status       — admin monitoring only
--    • customer_service_logs                     — cs_desk only
--    • video_recordings, gcash_transactions      — admin only
-- ============================================================


-- ── RLS: staff_users ──────────────────────────────────────────────────────────
-- Each authenticated staff member can read their own row.
-- (The shared schema already has: trips_conductor_rw, buses_read_all, etc.)

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'staff_users'
      AND policyname = 'staff_users_self_read_driver'
  ) THEN
    CREATE POLICY "staff_users_self_read_driver"
      ON staff_users FOR SELECT
      USING (id = auth.uid());
  END IF;
END $$;


-- ── RLS: gps_locations ────────────────────────────────────────────────────────
-- Driver can read GPS for their active trip; insert is done by Raspberry Pi.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gps_locations'
      AND policyname = 'gps_locations_read_trip_member'
  ) THEN
    CREATE POLICY "gps_locations_read_trip_member"
      ON gps_locations FOR SELECT
      USING (
        trip_id IN (
          SELECT id FROM trips WHERE conductor_id = auth.uid()
        )
        OR current_user_role() IN ('admin')
      );
  END IF;
END $$;


-- ── RLS: passenger_counts ─────────────────────────────────────────────────────
-- Driver can read counts for their trips (read-only).

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'passenger_counts'
      AND policyname = 'passenger_counts_read_driver'
  ) THEN
    CREATE POLICY "passenger_counts_read_driver"
      ON passenger_counts FOR SELECT
      USING (
        trip_id IN (
          SELECT id FROM trips WHERE conductor_id = auth.uid()
        )
        OR current_user_role() IN ('admin')
      );
  END IF;
END $$;


-- ── RLS: boarded_passengers ───────────────────────────────────────────────────
-- Driver reads on-board count for their active trip (read-only).

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'boarded_passengers'
      AND policyname = 'boarded_passengers_read_driver'
  ) THEN
    CREATE POLICY "boarded_passengers_read_driver"
      ON boarded_passengers FOR SELECT
      USING (
        trip_id IN (
          SELECT id FROM trips WHERE conductor_id = auth.uid()
        )
        OR current_user_role() IN ('admin')
      );
  END IF;
END $$;


-- ── RLS: emergency_alerts (driver insert) ─────────────────────────────────────
-- The shared schema already has emergency_alerts_rw_authenticated.
-- No additional policy needed if that exists.


-- ── RLS: notifications (driver insert for incident reports) ───────────────────
-- Driver inserts notifications as incident reports (type='alert').
-- The shared schema already has notifications_rw_authenticated.
-- No additional policy needed if that exists.


-- ── Seed: Assign bus to a driver account ─────────────────────────────────────
-- After creating your driver account in Supabase Auth and confirming their
-- staff_users row exists, run:
--
--   UPDATE staff_users
--   SET bus_id = (SELECT id FROM buses WHERE plate_number = 'BUS-001')
--   WHERE email = 'driver@omanfortsco.com';
--
-- The driver app will then load that bus and show active trips.
-- ============================================================
