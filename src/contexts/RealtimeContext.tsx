/**
 * RealtimeContext — Supabase Realtime subscriptions (shared schema)
 *
 * Channels:
 *  • gps_locations      → live GPS for the active trip
 *  • passenger_counts   → live occupancy for the active trip
 *  • trips              → trip status changes for this conductor
 *  • notifications      → new global notifications (no user_id filter)
 *  • buses              → bus status changes for assigned bus
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useAuth }  from './AuthContext'
import type { GpsLocation, Notification, Bus, Trip } from '../types'

// ─────────────────────────────────────────────────────────────
//  Context value
// ─────────────────────────────────────────────────────────────

interface RealtimeContextValue {
  latestLocation:     GpsLocation | null
  /** Latest passenger_counts or boarded_passengers row */
  latestCount:        Record<string, unknown> | null
  latestNotification: Notification | null
  latestBus:          Bus | null
  latestTrip:         Trip | null
  unreadCount:        number
  resetUnreadCount:   () => void
}

const RealtimeContext = createContext<RealtimeContextValue>({
  latestLocation:     null,
  latestCount:        null,
  latestNotification: null,
  latestBus:          null,
  latestTrip:         null,
  unreadCount:        0,
  resetUnreadCount:   () => {},
})

// ─────────────────────────────────────────────────────────────
//  Provider
// ─────────────────────────────────────────────────────────────

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  const [latestLocation,     setLatestLocation]     = useState<GpsLocation | null>(null)
  const [latestCount,        setLatestCount]        = useState<Record<string, unknown> | null>(null)
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null)
  const [latestBus,          setLatestBus]          = useState<Bus | null>(null)
  const [latestTrip,         setLatestTrip]         = useState<Trip | null>(null)
  const [unreadCount,        setUnreadCount]        = useState(0)

  const [activeTripId, setActiveTripId] = useState<string | null>(null)

  const channelsRef = useRef<RealtimeChannel[]>([])
  const resetUnreadCount = useCallback(() => setUnreadCount(0), [])

  // ── Resolve active trip ID ────────────────────────────────

  useEffect(() => {
    if (!user) return

    ;(supabase.from('trips') as any)
      .select('id')
      .eq('conductor_id', user.id)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: { data: { id: string } | null }) => {
        setActiveTripId(data?.id ?? null)
      })
  }, [user])

  // ── Subscribe ─────────────────────────────────────────────

  useEffect(() => {
    if (!user) return

    // Tear down previous channels
    channelsRef.current.forEach(ch => supabase.removeChannel(ch))
    channelsRef.current = []

    const channels: RealtimeChannel[] = []

    // 1. GPS locations — scoped to active trip
    if (activeTripId) {
      const gpsCh = supabase
        .channel(`gps:${activeTripId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'gps_locations',
          filter: `trip_id=eq.${activeTripId}`,
        }, payload => setLatestLocation(payload.new as GpsLocation))
        .subscribe()
      channels.push(gpsCh)

      // 2. Passenger counts — scoped to active trip
      const countCh = supabase
        .channel(`counts:${activeTripId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'passenger_counts',
          filter: `trip_id=eq.${activeTripId}`,
        }, payload => setLatestCount(payload.new as Record<string, unknown>))
        .subscribe()
      channels.push(countCh)

      // 3. Boarded passengers — scoped to active trip
      const boardedCh = supabase
        .channel(`boarded:${activeTripId}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'boarded_passengers',
          filter: `trip_id=eq.${activeTripId}`,
        }, payload => setLatestCount(payload.new as Record<string, unknown>))
        .subscribe()
      channels.push(boardedCh)

      // 4. Trip status changes
      const tripCh = supabase
        .channel(`trip:${activeTripId}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'trips',
          filter: `id=eq.${activeTripId}`,
        }, payload => {
          if (payload.new) setLatestTrip(payload.new as Trip)
        })
        .subscribe()
      channels.push(tripCh)
    }

    // 5. Bus status — scoped to assigned bus
    if (user.bus_id) {
      const busCh = supabase
        .channel(`bus:${user.bus_id}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'buses',
          filter: `id=eq.${user.bus_id}`,
        }, payload => setLatestBus(payload.new as Bus))
        .subscribe()
      channels.push(busCh)
    }

    // 6. Notifications — global (shared schema has no user_id column)
    const notifCh = supabase
      .channel('notifications:global')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
      }, payload => {
        const notif = payload.new as Notification
        setLatestNotification(notif)
        setUnreadCount(c => c + 1)
      })
      .subscribe()
    channels.push(notifCh)

    channelsRef.current = channels

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch))
      channelsRef.current = []
    }
  }, [user, activeTripId])

  // ── Clear activeTripId when trip completes ────────────────

  useEffect(() => {
    if (!latestTrip) return
    if ((latestTrip as any).status === 'completed' || (latestTrip as any).status === 'cancelled') {
      setActiveTripId(null)
    }
  }, [latestTrip])

  const value: RealtimeContextValue = {
    latestLocation,
    latestCount,
    latestNotification,
    latestBus,
    latestTrip,
    unreadCount,
    resetUnreadCount,
  }

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  )
}

// ─────────────────────────────────────────────────────────────
//  Hook
// ─────────────────────────────────────────────────────────────

export function useRealtime(): RealtimeContextValue {
  return useContext(RealtimeContext)
}
