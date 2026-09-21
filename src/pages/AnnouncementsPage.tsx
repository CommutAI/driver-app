/**
 * AnnouncementsPage
 * The shared schema has no separate announcements table.
 * We surface alert-type notifications here as "announcements".
 */
import { useCallback, useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { Megaphone, CheckCheck, AlertTriangle, Loader2 } from 'lucide-react'

import { supabase } from '../lib/supabase'
import SectionHeader from '../components/ui/SectionHeader'
import SoftCard      from '../components/ui/SoftCard'
import type { Notification } from '../types'

export default function AnnouncementsPage() {
  const [items,   setItems]   = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data } = await (supabase
      .from('notifications') as any)
      .select('*')
      .eq('type', 'alert')
      .order('created_at', { ascending: false })
      .limit(30) as { data: Notification[] | null }

    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function markRead(id: number) {
    await (supabase.from('notifications') as any)
      .update({ read: true })
      .eq('id', id)
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const unread = items.filter(n => !n.read).length

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <SectionHeader
        title="Announcements"
        subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
        light
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <Loader2 size={30} color="var(--color-primary)" style={{ animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : items.length === 0 ? (
        <SoftCard padding={48}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Megaphone size={28} color="var(--color-primary)" strokeWidth={1.5} />
            </div>
            <p style={{ margin: '0 0 4px', fontWeight: 700, color: 'var(--text-primary)' }}>No announcements</p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Operator messages will appear here.
            </p>
          </div>
        </SoftCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence>
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: item.read ? 0.6 : 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderLeft: '4px solid #EF4444',
                  borderRadius: 'var(--card-radius)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: 18 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <AlertTriangle size={16} color="#F87171" />
                      <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: '#F87171', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Alert
                      </p>
                    </div>
                    {!item.read && (
                      <span style={{ flexShrink: 0, width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', marginTop: 2, boxShadow: '0 0 8px rgba(249,115,22,0.6)' }} aria-label="Unread" />
                    )}
                  </div>

                  {/* Message */}
                  <p style={{ margin: '0 0 14px', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    {item.message}
                  </p>

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                    {!item.read ? (
                      <button type="button" onClick={() => markRead(item.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700, padding: 0 }}>
                        <CheckCheck size={14} /> Mark read
                      </button>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                        <CheckCheck size={13} /> Read
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
