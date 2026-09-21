// ─────────────────────────────────────────────────────────────
//  CommutAI Driver Side — Domain Types (shared schema)
// ─────────────────────────────────────────────────────────────

// ── Enums ─────────────────────────────────────────────────────

export type StaffRole = 'admin' | 'conductor' | 'cs_desk'

export type BusStatus = 'active' | 'maintenance' | 'inactive'

export type TripStatus = 'in_progress' | 'completed' | 'cancelled'

export type GpsStatus = 'connected' | 'disconnected' | 'poor'

export type NotificationType = 'alert' | 'success' | 'info'

export type DeviceStatus = 'online' | 'offline' | 'warning'

// ── Staff User ────────────────────────────────────────────────
// Drivers are staff_users with a bus_id assigned

export interface StaffUser {
  id: string
  full_name: string
  email: string
  role: StaffRole
  is_active: boolean
  bus_id: string | null
  created_at: string
}

// ── Bus ───────────────────────────────────────────────────────

export interface Bus {
  id: string
  plate_number: string
  bus_number: number | null
  route: string
  seat_capacity: number
  status: BusStatus
  created_at: string
}

// ── Trip ─────────────────────────────────────────────────────

export interface Trip {
  id: string
  bus_id: string
  conductor_id: string
  driver_id?: string | null
  starting_point?: string | null
  end_point?: string | null
  started_at: string
  ended_at: string | null
  status: TripStatus
  current_lat: number | null
  current_lng: number | null
  gps_updated_at: string | null
  // Joined
  bus?: Bus
  conductor?: StaffUser
}

// ── GPS / Location ────────────────────────────────────────────

export interface GpsLocation {
  id: string
  latitude: number
  longitude: number
  altitude: number | null
  speed: number | null
  accuracy: number | null
  source: string
  trip_id: string | null
  satellite_count: number | null
  fix_quality: number | null
  recorded_at: string
  created_at: string
}

// ── Passenger Count ───────────────────────────────────────────

export interface PassengerCount {
  id: string
  trip_id: string
  count: number
  recorded_at: string
  ai_count: number | null
  source: string
}

export interface OccupancySummary {
  ai_count: number
  scan_count: number           // boarded_passengers count
  total_capacity: number
  available_capacity: number
  occupancy_percentage: number
  status: 'normal' | 'near_capacity' | 'at_capacity'
}

// ── Emergency Alert ───────────────────────────────────────────

export interface EmergencyAlert {
  id: string
  trip_id: string
  conductor_id: string
  bus_id: string | null
  lat: number | null
  lng: number | null
  status: string            // 'active' | 'acknowledged' | 'resolved'
  notes: string | null
  created_at: string
  acknowledged_at: string | null
  resolved_at: string | null
  triggered_at: string
  location_lat: number | null
  location_lng: number | null
  location_source: string | null
  location_accuracy: number | null
}

// ── Notification ──────────────────────────────────────────────

export interface Notification {
  id: number
  message: string
  type: NotificationType
  read: boolean
  created_at: string
}

// ── Audit Log ─────────────────────────────────────────────────

export interface AuditLog {
  id: number
  username: string
  action: string
  module: string | null
  details: string | null
  ip_address: string | null
  created_at: string
}

// ── UI Helpers ────────────────────────────────────────────────

export interface LoadingState {
  loading: boolean
  error: string | null
}

export interface Coordinates {
  latitude: number
  longitude: number
}

export type StatusColor = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

// ── Navigation Types ────────────────────────────────────────────────

export type ManeuverType = 
  | 'TURN_LEFT' 
  | 'TURN_RIGHT' 
  | 'SLIGHT_LEFT' 
  | 'SLIGHT_RIGHT' 
  | 'U_TURN' 
  | 'STRAIGHT' 
  | 'MERGE' 
  | 'ROUNDABOUT' 
  | 'EXIT' 
  | 'ARRIVE'

export interface NavigationStep {
  id: string
  maneuver: ManeuverType
  distance: number // in meters
  instruction: string
  road_name: string
  coordinates: [number, number]
}

export interface NavigationRoute {
  id: string
  distance: number // total distance in meters
  duration: number // estimated duration in seconds
  geometry: [number, number][] // route coordinates
  steps: NavigationStep[]
}

export interface RouteProgress {
  distance_traveled: number
  distance_remaining: number
  progress_percentage: number
  current_step_index: number
  next_step: NavigationStep | null
  estimated_time_remaining: number
}

export interface NavigationState {
  route: NavigationRoute | null
  progress: RouteProgress | null
  is_navigating: boolean
  is_off_route: boolean
  is_recalculating: boolean
}
