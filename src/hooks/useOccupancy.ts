// ─────────────────────────────────────────────────────────────
//  useOccupancy — latest passenger_counts + boarded_passengers
//  Uses the shared schema tables
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { supabase }    from '../lib/supabase'
import { useRealtime } from '../contexts/RealtimeContext'
import type { OccupancySummary } from '../types'

interface State {
  occupancy: OccupancySummary
  loading: boolean
  refetch: () => void
}

// Capacity comes from the bus; we pass it in or default to 35
const DEFAULT_CAPACITY = 35

function computeSummary(
  aiCount: number,
  scanCount: number,
  capacity: number,
): OccupancySummary {
  const pct = Math.round((aiCount / capacity) * 100)
  return {
    ai_count:             aiCount,
    scan_count:           scanCount,
    total_capacity:       capacity,
    available_capacity:   Math.max(0, capacity - aiCount),
    occupancy_percentage: Math.min(100, pct),
    status:
      aiCount >= capacity         ? 'at_capacity'
      : aiCount >= capacity * 0.9 ? 'near_capacity'
      : 'normal',
  }
}

export function useOccupancy(
  tripId: string | null | undefined,
  capacity = DEFAULT_CAPACITY,
): State {
  const { latestCount } = useRealtime()
  const [aiCount,   setAiCount]   = useState(0)
  const [scanCount, setScanCount] = useState(0)
  const [loading,   setLoading]   = useState(false)

  const fetch = useCallback(async () => {
    if (!tripId) return
    setLoading(true)

    if (tripId === 'trip-demo-001') {
      setAiCount(18)
      setScanCount(18)
      setLoading(false)
      return
    }

    // Latest AI count from passenger_counts
    const { data: countRow } = await (supabase
      .from('passenger_counts') as any)
      .select('count, ai_count')
      .eq('trip_id', tripId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle() as { data: { count: number; ai_count: number | null } | null }

    // Current on-board count (not yet alighted) from boarded_passengers
    const { count: boardedCount } = await (supabase
      .from('boarded_passengers') as any)
      .select('id', { count: 'exact', head: true })
      .eq('trip_id', tripId)
      .is('alighted_at', null) as { count: number | null }

    setAiCount(countRow?.ai_count ?? countRow?.count ?? 0)
    setScanCount(boardedCount ?? 0)
    setLoading(false)
  }, [tripId])

  useEffect(() => { fetch() }, [fetch])

  // Merge realtime passenger_counts pushes
  useEffect(() => {
    if (!latestCount) return
    const row = latestCount as any
    if (row.trip_id !== tripId) return
    setAiCount(row.ai_count ?? row.count ?? 0)
  }, [latestCount, tripId])

  return {
    occupancy: computeSummary(aiCount, scanCount, capacity),
    loading,
    refetch: fetch,
  }
}
