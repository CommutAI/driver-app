// ─────────────────────────────────────────────────────────────
//  useActiveTrip — active in_progress trip for this conductor
//  Uses shared schema: trips joined with buses + staff_users
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { supabase }    from '../lib/supabase'
import { useAuth }     from '../contexts/AuthContext'
import { useRealtime } from '../contexts/RealtimeContext'
import type { Trip } from '../types'

interface State {
  trip: Trip | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useActiveTrip(): State {
  const { user }       = useAuth()
  const { latestTrip } = useRealtime()
  const [trip,    setTrip]    = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return }

    setLoading(true)
    setError(null)

    if (user.id === 'demo-driver-uuid') {
      setTrip({
        id: 'trip-demo-001',
        bus_id: 'bus-omanfortsco-001',
        conductor_id: user.id,
        driver_id: user.id,
        starting_point: 'Manolo Fortich Terminal',
        end_point: 'Agora Terminal',
        status: 'in_progress',
        started_at: new Date().toISOString(),
        ended_at: null,
        current_lat: 8.3663088,
        current_lng: 124.865008,
        gps_updated_at: new Date().toISOString(),
        bus: {
          id: 'bus-omanfortsco-001',
          plate_number: 'OMANFORTSCO-01',
          bus_number: 1,
          route: 'Manolo Fortich → Agora Terminal, CDO',
          seat_capacity: 31,
          status: 'active',
          created_at: new Date().toISOString(),
        },
      })
      setLoading(false)
      return
    }

    // In the shared schema, trips are owned by conductor_id.
    // The driver sees their own active trip.
    const { data, error: err } = await (supabase
      .from('trips') as any)
      .select(`
        *,
        bus:buses(*),
        conductor:staff_users!trips_conductor_id_fkey(*)
      `)
      .or(`conductor_id.eq.${user.id},driver_id.eq.${user.id}`)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle() as { data: Trip | null; error: unknown }

    if (err) {
      setError((err as any).message ?? 'Failed to load trip')
    } else {
      setTrip(data)
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  // Merge realtime trip updates
  useEffect(() => {
    if (!latestTrip || !trip) return
    if ((latestTrip as any).id !== (trip as any).id) return
    setTrip(prev => prev ? { ...prev, ...(latestTrip as any) } : (latestTrip as Trip))
  }, [latestTrip]) // eslint-disable-line react-hooks/exhaustive-deps

  return { trip, loading, error, refetch: fetch }
}
