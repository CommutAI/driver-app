import { useCallback, useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { BellOff, CheckCheck, ShieldAlert, Info, Loader2 } from 'lucide-react'

import { useRealtime } from '../contexts/RealtimeContext'
import { supabase }    from '../lib/supabase'
import SectionHeader from '../components/ui/SectionHeader'
import SoftCard      from '../components/ui/SoftCard'
import StatusBadge   from '../components/ui/StatusBadge'
import type { Notification } from '../types'

// Map notification type to display config
function typeConfig(t: string) {
  if (t === 'alert') return {
    icon: <ShieldAlert size={18} color="#F87171" />,
    variant: 'danger'  as const,
    accent: '#EF4444',
  }
  if (t === 'success') return {
    icon: <CheckCheck  size={18} color="#4ADE80" />,
    variant: 'success' as const,
    accent: '#22C55E',
  }
  return {
    icon: <Info        size={18} color="#60A5FA" />,
    variant: 'info'    as const,
    accent: '#3B82F6',
  }
}

export default function NotificationsPage() {
  const { resetUnreadCount } = useRealtime()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    const { data } = await (supabase
      .from('notifications') as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50) as { data: Notification[] | null }

    setNotifications(data ?? [])
    setLoading(false)
    resetUnreadCount()
  }, [resetUnreadCount])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  async function markRead(id: number) {
    await (supabase.from('notifications') as any)
      .update({ read: true })
      .eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    await (supabase.from('notifications') as any)
      .update({ read: true })
      .eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const unread = notifications.filter(n => !n.read).length

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <SectionHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
        light
        action={
          unread > 0
            ? (
              <button type="button" onClick={markAllRead}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700, padding: 0 }}>
                <CheckCheck size={14} /> Mark all read
              </button>
            ) : undefined
        }
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <Loader2 size={30} color="var(--color-primary)" style={{ animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : notifications.length === 0 ? (
        <SoftCard padding={48}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <BellOff size={28} color="var(--color-primary)" strokeWidth={1.5} />
            </div>
            <p style={{ margin: '0 0 4px', fontWeight: 700, color: 'var(--text-primary)' }}>No notifications</p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              System messages and alerts will appear here.
            </p>
          </div>
        </SoftCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence>
            {notifications.map((notif, i) => {
              const { icon, variant, accent } = typeConfig(notif.type)
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: notif.read ? 0.55 : 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderLeft: `4px solid ${accent}`,
                    borderRadius: 'var(--card-radius)',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: 16, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flexShrink: 0, marginTop: 2 }}>{icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1 }}>
                          {notif.message}
                        </p>
                        {!notif.read && (
                          <span style={{ flexShrink: 0, width: 7, height: 7, borderRadius: '50%', background: 'var(--color-primary)', marginTop: 5, boxShadow: '0 0 6px rgba(249,115,22,0.6)' }} />
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <StatusBadge variant={variant}>
                            {notif.type.charAt(0).toUpperCase() + notif.type.slice(1)}
                          </StatusBadge>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {!notif.read && (
                          <button type="button" onClick={() => markRead(notif.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
                            <CheckCheck size={12} /> Read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Legend */}
      <SoftCard padding={16}>
        <p style={{ margin: '0 0 10px', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Notification Types
        </p>
        {[
          { color: '#3B82F6', label: 'Info',    desc: 'General updates and system messages' },
          { color: '#22C55E', label: 'Success', desc: 'Confirmations and completed actions' },
          { color: '#EF4444', label: 'Alert',   desc: 'Urgent notices and emergency events' },
        ].map(({ color, label, desc }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 3 }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{label}</strong> — {desc}
            </span>
          </div>
        ))}
      </SoftCard>

    </motion.div>
  )
}
