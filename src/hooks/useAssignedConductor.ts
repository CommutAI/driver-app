// ─────────────────────────────────────────────────────────────
//  useAssignedConductor — fetches the conductor assigned to the bus
//  Queries staff_users with role='conductor' and bus_id matching the bus
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAssignedBus } from './useAssignedBus'
import type { StaffUser } from '../types'

interface State {
  conductor: StaffUser | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAssignedConductor(): State {
  const { bus } = useAssignedBus()
  const [conductor, setConductor] = useState<StaffUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!bus?.id) { setLoading(false); return }

    setLoading(true)
    setError(null)

    const { data, error: err } = await (supabase
      .from('staff_users') as any)
      .select('*')
      .eq('role', 'conductor')
      .eq('bus_id', bus.id)
      .eq('is_active', true)
      .maybeSingle() as { data: StaffUser | null; error: unknown }

    if (err) {
      setError((err as any).message ?? 'Failed to load conductor')
    } else {
      setConductor(data)
    }
    setLoading(false)
  }, [bus?.id])

  useEffect(() => { fetch() }, [fetch])

  return { conductor, loading, error, refetch: fetch }
}
