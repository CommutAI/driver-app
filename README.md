# CommutAI — Driver Side

**Driver Portal for the OMANFORTSCO Manolo Fortich → Cagayan de Oro route.**

Built with React 19 + TypeScript, Tailwind CSS v4, Supabase, and Leaflet.

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Framework    | React 19 + Vite 6                   |
| Language     | TypeScript (strict)                 |
| Styling      | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Backend/DB   | Supabase (PostgreSQL + Auth + Realtime) |
| Map          | Leaflet + react-leaflet             |
| Routing      | React Router v7                     |
| Icons        | Lucide React                        |
| Date utils   | date-fns                            |

---

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url>
cd driver-app
npm install
```

### 2. Configure Supabase

Copy `.env.example` to `.env.local` and fill in your project credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Set up the database

Run `src/db/schema.sql` in your Supabase project's **SQL Editor**.  
This creates all tables, types, RLS policies, triggers, and seed data.

### 4. Create a driver user

In Supabase **Authentication → Users**, create a user, then run:

```sql
-- After the user signs up, set their role and create a driver profile
update public.users set role = 'driver' where email = 'driver@example.com';

insert into public.drivers (user_id, driver_id_number, license_number, license_expiry)
values (
  '<user-uuid>',
  'DRV-001',
  'LIC-123456',
  '2027-12-31'
);

-- Assign the driver to the bus
update public.buses
set current_driver_id = (select id from public.drivers where driver_id_number = 'DRV-001')
where bus_number = 'OMANFORTSCO-001';
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Project Structure

```
src/
├── components/
│   ├── dashboard/     # BusCard, TripStatusCard, GpsCard, OccupancyCard, QuickActions
│   ├── emergency/     # EmergencyFab (pulsing FAB), EmergencyModal (3-step flow)
│   ├── gps/           # GpsStatusPanel
│   ├── layout/        # AppShell, TopBar, BottomNav, ProtectedRoute
│   ├── route/         # RouteMap (Leaflet), StopList
│   ├── trip/          # ConfirmModal, ConductorInfoCard, TripDetailRow
│   └── ui/            # Card, StatusBadge, SectionHeader, Skeleton
├── contexts/
│   ├── AuthContext.tsx     # Supabase auth + driver-role guard
│   └── RealtimeContext.tsx # All Supabase Realtime channel subscriptions
├── db/
│   └── schema.sql     # Full PostgreSQL schema with RLS policies
├── hooks/
│   ├── useActiveTrip.ts
│   ├── useAssignedBus.ts
│   ├── useGpsLocation.ts  # Polling + Realtime merge
│   ├── useOccupancy.ts    # Polling + Realtime merge
│   ├── useRouteStops.ts
│   └── useUnreadCounts.ts
├── lib/
│   └── supabase.ts    # Typed Supabase client
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── TripPage.tsx        # START/END trip flow
│   ├── RoutePage.tsx       # Leaflet map + stop timeline
│   ├── OccupancyPage.tsx   # Radial gauge + breakdown
│   ├── NotificationsPage.tsx
│   ├── AnnouncementsPage.tsx
│   ├── BusStatusPage.tsx
│   ├── IncidentPage.tsx
│   ├── HistoryPage.tsx
│   └── ProfilePage.tsx
├── types/
│   ├── index.ts       # All domain types and enums
│   └── database.ts    # Supabase row/insert/update shapes
└── utils/
    └── activityLogger.ts  # Fire-and-forget activity log helper
```

---

## Features

### Authentication
- Supabase email/password login
- Driver-role guard (only `role = 'driver'` accounts can log in)
- Auto session persistence

### Dashboard
- Assigned bus info (bus number, plate, status)
- Current trip status (route, trip code, departure time)
- Live GPS status (lat/lng/speed/accuracy/satellites)
- Passenger occupancy (AI count + QR validations, 31-pax capacity)
- Quick-action tiles with unread badges
- Auto-refresh every 30 seconds + manual refresh

### Trip Management
- View full trip details (route, conductor, departure, status)
- **START TRIP** — confirmation modal (bus, route, GPS check, conductor), records start time + GPS
- **END TRIP** — confirmation modal with passenger count, records end time + GPS + final pax count
- Activity logged for both actions

### Route Monitoring
- Leaflet map with OpenStreetMap tiles
- Orange bus marker (auto-recenters on GPS updates)
- Orange polyline along all route stops
- Green origin / red destination / grey intermediate stops
- Route stop timeline with "HERE" badge on nearest stop
- ETA calculated from actual start time + route duration

### GPS Status
- Connected / Poor / Disconnected states with color coding
- Lat, Lng, Speed, Accuracy, Satellites, Last Update
- Warning banners for poor/disconnected signal
- Read-only — driver cannot modify GPS coordinates

### Passenger Occupancy
- SVG radial gauge with animated fill
- AI count + QR validation breakdown
- Near-capacity (≥90%) and At-capacity warnings
- 20-second auto-refresh + Realtime push updates
- Capacity: **25 seats + 6 standing = 31 total**

### Emergency System
- Always-visible pulsing red FAB (bottom-right)
- 3-step flow: select type → confirm (with context + optional note) → sent
- Types: Medical Emergency, Accident, Vehicle Problem, Passenger Incident, Security/Safety, Other
- Records to `emergency_alerts` with driver/bus/trip/GPS/timestamp

### Incident Reporting
- 7 incident types
- Auto-fills GPS, trip ID, bus, timestamp
- 500-character description
- Success state with "Report Another" option

### Announcements & Notifications
- Realtime push of new announcements and notifications
- Priority-colored left border (info/warning/emergency)
- Mark individual or all as read
- Unread badge in TopBar bell icon

### Bus Status
- Bus identity (number, plate, capacity breakdown)
- Device status grid: GPS, Raspberry Pi, Camera/AI, Internet
- 30-second auto-refresh

### Trip History
- Summary stats: total trips, completed count, total passengers
- Accordion rows with expand/collapse
- Shows trip code, route, times, duration, passengers

### Driver Profile
- Avatar with initials, full account info
- Change password (supabase.auth.updateUser)
- Confirmed sign-out

### Realtime Subscriptions
All live data flows through `RealtimeContext`:
- `bus_locations` → GPS updates
- `ai_passenger_counts` → occupancy updates  
- `trips` → trip status changes
- `notifications` → push to bell badge
- `announcements` → push to badge
- `buses` → hardware status changes

---

## Role Boundaries

| Action                       | Driver | Conductor | Operator | Admin |
|------------------------------|:------:|:---------:|:--------:|:-----:|
| Start / End trip             | ✅     | —         | —        | ✅    |
| View GPS                     | ✅     | —         | ✅       | ✅    |
| View occupancy               | ✅     | —         | ✅       | ✅    |
| Send emergency alert         | ✅     | —         | —        | —     |
| Report incident              | ✅     | —         | —        | —     |
| QR scan / fare collection    | ❌     | ✅        | —        | ✅    |
| Modify passenger balances    | ❌     | ✅        | —        | ✅    |
| Manage users                 | ❌     | ❌        | —        | ✅    |
| System configuration         | ❌     | ❌        | —        | ✅    |
| Modify historical records    | ❌     | ❌        | —        | ✅    |

Row Level Security in Supabase enforces these boundaries at the database level.

---

## Database Schema Summary

See `src/db/schema.sql` for the complete schema.

Key tables:
- `users` — mirrors `auth.users`, stores role
- `drivers` / `conductors` — role-specific profiles
- `buses` — bus identity, capacity, device statuses
- `routes` + `route_stops` — Manolo Fortich → CDO route
- `trips` — trip lifecycle with start/end GPS
- `bus_locations` — append-only GPS stream (Raspberry Pi)
- `ai_passenger_counts` — append-only from camera AI
- `emergency_alerts` — driver emergency submissions
- `incident_reports` — driver incident submissions
- `announcements` + `announcement_reads` — operator messages
- `notifications` — per-user system notifications
- `activity_logs` — immutable audit trail

---

## Design System

| Token          | Value     |
|----------------|-----------|
| Primary orange | `#F97316` |
| Light orange   | `#FB923C` |
| Background     | `#FFF7ED` |
| Text primary   | `#1F2937` |
| Success        | `#22C55E` |
| Warning        | `#F59E0B` |
| Danger         | `#EF4444` |
| Info           | `#3B82F6` |
| Heading font   | Poppins   |
| Body font      | Inter     |

---

## Safety Design Principles

- All destructive actions (start trip, end trip, emergency, sign out) require explicit confirmation
- Driver cannot access conductor, operator, or admin functions
- GPS coordinates are read-only — never editable by the driver
- AI passenger counts are read-only — view only
- Activity logging for all significant driver actions
- Emergency FAB is always visible but requires two deliberate taps to send

---

*CommutAI v1.0 — OMANFORTSCO · Manolo Fortich–Cagayan de Oro Route*
# driver-app
