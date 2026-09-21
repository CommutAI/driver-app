// ─────────────────────────────────────────────────────────────
//  useUnreadCounts — unread notifications badge count
//  Uses the shared notifications table (no user_id column)
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Counts {
  notifications: number
  announcements: number   // kept for API compat, always 0 (no announcements table)
  total: number
}

export function useUnreadCounts(): Counts & { refetch: () => void } {
  const [counts, setCounts] = useState<Counts>({ notifications: 0, announcements: 0, total: 0 })

  const fetch = useCallback(async () => {
    const { count } = await (supabase
      .from('notifications') as any)
      .select('id', { count: 'exact', head: true })
      .eq('read', false) as { count: number | null }

    const n = count ?? 0
    setCounts({ notifications: n, announcements: 0, total: n })
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { ...counts, refetch: fetch }
}
