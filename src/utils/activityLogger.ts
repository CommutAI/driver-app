// ─────────────────────────────────────────────────────────────
//  activityLogger — writes to audit_logs (shared schema)
// ─────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase'

interface LogOptions {
  username: string        // staff_users.email
  action:   string        // 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'VIEW' | 'EXPORT'
  module?:  string        // e.g. 'driver_app_trip'
  details?: string        // human-readable description
}

/**
 * Fire-and-forget audit log entry.
 * Never throws — logging must never break the UI.
 */
export async function logActivity(opts: LogOptions): Promise<void> {
  const { username, action, module, details } = opts

  const { error } = await (supabase.from('audit_logs') as any).insert({
    username,
    action,
    module:  module  ?? null,
    details: details ?? null,
  })

  if (error) {
    console.warn('[activityLogger] Failed:', (error as any).message)
  }
}
