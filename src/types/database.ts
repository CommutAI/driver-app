// ─────────────────────────────────────────────────────────────
//  CommutAI — Supabase Database Types (shared schema)
// ─────────────────────────────────────────────────────────────

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      staff_users: {
        Row: {
          id: string
          full_name: string
          email: string
          phone?: string | null
          role: string
          is_active: boolean
          bus_id: string | null
          created_at: string
          employee_id: string | null
          license_number: string | null
          license_expiry: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          last_login_at: string | null
          updated_at: string
          branch: string | null
        }
        Insert: {
          id: string
          full_name: string
          email: string
          phone?: string | null
          role?: string
          is_active?: boolean
          bus_id?: string | null
          created_at?: string
          employee_id?: string | null
          license_number?: string | null
          license_expiry?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          last_login_at?: string | null
          updated_at?: string
          branch?: string | null
        }
        Update: {
          full_name?: string
          email?: string
          phone?: string | null
          role?: string
          is_active?: boolean
          bus_id?: string | null
          employee_id?: string | null
          license_number?: string | null
          license_expiry?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          last_login_at?: string | null
          updated_at?: string
          branch?: string | null
        }
      }

      buses: {
        Row: {
          id: string
          plate_number: string
          bus_number: number | null
          route: string
          seat_capacity: number
          status: string
          created_at: string
          assigned_driver_id: string | null
          assigned_conductor_id: string | null
        }
        Insert: {
          id?: string
          plate_number: string
          bus_number?: number | null
          route: string
          seat_capacity?: number
          status?: string
          created_at?: string
          assigned_driver_id?: string | null
          assigned_conductor_id?: string | null
        }
        Update: {
          plate_number?: string
          bus_number?: number | null
          route?: string
          seat_capacity?: number
          status?: string
          assigned_driver_id?: string | null
          assigned_conductor_id?: string | null
        }
      }

      trips: {
        Row: {
          id: string
          bus_id: string
          conductor_id: string
          driver_id: string | null
          started_at: string
          ended_at: string | null
          status: string
          current_lat: number | null
          current_lng: number | null
          gps_updated_at: string | null
        }
        Insert: {
          id?: string
          bus_id: string
          conductor_id: string | null
          driver_id: string | null
          started_at?: string
          ended_at?: string | null
          status?: string
          current_lat?: number | null
          current_lng?: number | null
          gps_updated_at?: string | null
        }
        Update: {
          ended_at?: string | null
          status?: string
          current_lat?: number | null
          current_lng?: number | null
          gps_updated_at?: string | null
        }
      }

      passenger_counts: {
        Row: {
          id: string
          trip_id: string
          count: number
          recorded_at: string
          ai_count: number | null
          source: string
        }
        Insert: {
          id?: string
          trip_id: string
          count: number
          recorded_at?: string
          ai_count?: number | null
          source?: string
        }
        Update: never
      }

      boarded_passengers: {
        Row: {
          id: string
          trip_id: string
          passenger_id: string | null
          card_id: string | null
          temp_ticket_id: string | null
          boarded_at: string
          alighted_at: string | null
        }
        Insert: {
          id?: string
          trip_id: string
          passenger_id?: string | null
          card_id?: string | null
          temp_ticket_id?: string | null
          boarded_at?: string
          alighted_at?: string | null
        }
        Update: {
          alighted_at?: string | null
        }
      }

      gps_locations: {
        Row: {
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
        Insert: {
          id?: string
          latitude: number
          longitude: number
          altitude?: number | null
          speed?: number | null
          accuracy?: number | null
          source: string
          trip_id?: string | null
          satellite_count?: number | null
          fix_quality?: number | null
          recorded_at?: string
          created_at?: string
        }
        Update: never
      }

      emergency_alerts: {
        Row: {
          id: string
          trip_id: string
          conductor_id: string
          driver_id: string | null
          bus_id: string | null
          lat: number | null
          lng: number | null
          status: string
          notes: string | null
          created_at: string
          acknowledged_at: string | null
          resolved_at: string | null
          triggered_at: string
          location_lat: number | null
          location_lng: number | null
          location_source: string | null
          location_accuracy: number | null
          alert_type: string
        }
        Insert: {
          id?: string
          trip_id: string
          conductor_id: string
          driver_id?: string | null
          bus_id?: string | null
          lat?: number | null
          lng?: number | null
          status?: string
          notes?: string | null
          created_at?: string
          triggered_at?: string
          location_lat?: number | null
          location_lng?: number | null
          location_source?: string | null
          location_accuracy?: number | null
          alert_type?: string
        }
        Update: {
          status?: string
          acknowledged_at?: string | null
          resolved_at?: string | null
          notes?: string | null
        }
      }

      notifications: {
        Row: {
          id: number
          message: string
          type: string
          read: boolean
          created_at: string
        }
        Insert: {
          message: string
          type?: string
          read?: boolean
          created_at?: string
        }
        Update: {
          read?: boolean
        }
      }

      audit_logs: {
        Row: {
          id: number
          username: string
          action: string
          module: string | null
          details: string | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          username: string
          action: string
          module?: string | null
          details?: string | null
          ip_address?: string | null
          created_at?: string
        }
        Update: never
      }
    }

    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
