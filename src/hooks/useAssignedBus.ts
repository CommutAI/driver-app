// ─────────────────────────────────────────────────────────────
//  useAssignedBus — fetches the bus assigned to this driver
//  bus_id is stored directly on the staff_users row
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../contexts/AuthContext'
import type { Bus } from '../types'

interface State {
  bus: Bus | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAssignedBus(): State {
  const { user }    = useAuth()
  const [bus,     setBus]     = useState<Bus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!user?.bus_id) { setLoading(false); return }

    setLoading(true)
    setError(null)

    if (user.bus_id === 'bus-omanfortsco-001') {
      setBus({
        id: 'bus-omanfortsco-001',
        plate_number: 'OMANFORTSCO-01',
        bus_number: 1,
        route: 'Manolo Fortich → Agora Terminal, CDO',
        seat_capacity: 31,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      setLoading(false)
      return
    }

    const { data, error: err } = await (supabase
      .from('buses') as any)
      .select('*')
      .eq('id', user.bus_id)
      .maybeSingle() as { data: Bus | null; error: unknown }

    if (err) {
      setError((err as any).message ?? 'Failed to load bus')
    } else {
      setBus(data)
    }
    setLoading(false)
  }, [user?.bus_id])

  useEffect(() => { fetch() }, [fetch])

  return { bus, loading, error, refetch: fetch }
}
