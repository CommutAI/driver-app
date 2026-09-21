import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Navigation, MapPin, Users, Bell, Bus, FileText, Megaphone } from 'lucide-react'

interface Action {
  to: string; icon: React.ReactNode; label: string
  badge?: number; color: string; bg: string
}

interface Props { unreadNotifications: number; unreadAnnouncements: number }

export default function QuickActions({ unreadNotifications, unreadAnnouncements }: Props) {
  const navigate = useNavigate()

  const actions: Action[] = [
    { to: '/trip',          icon: <Navigation size={22} />, label: 'Trip',       color: '#60A5FA', bg: 'rgba(59,130,246,0.15)' },
    { to: '/route',         icon: <MapPin     size={22} />, label: 'Route',      color: '#4ADE80', bg: 'rgba(34,197,94,0.15)'  },
    { to: '/occupancy',     icon: <Users      size={22} />, label: 'Pax',        color: '#c084fc', bg: 'rgba(168,85,247,0.15)' },
    { to: '/notifications', icon: <Bell       size={22} />, label: 'Alerts',     color: '#FB923C', bg: 'var(--color-primary-subtle)', badge: unreadNotifications },
    { to: '/bus-status',    icon: <Bus        size={22} />, label: 'Bus',        color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.07)' },
    { to: '/announcements', icon: <Megaphone  size={22} />, label: 'Notices',    color: '#FDE047', bg: 'rgba(250,204,21,0.12)', badge: unreadAnnouncements },
    { to: '/incident',      icon: <FileText   size={22} />, label: 'Report',     color: '#F87171', bg: 'rgba(239,68,68,0.12)'  },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {actions.map(({ to, icon, label, badge, color, bg }, i) => (
        <motion.button
          key={to}
          type="button"
          onClick={() => navigate(to)}
          aria-label={label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.04 }}
          whileTap={{ scale: 0.93 }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}
        >
          <div style={{
            position: 'relative',
            width: 56, height: 56,
            borderRadius: 18,
            background: bg,
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}>
            {icon}
            {badge != null && badge > 0 && (
              <span
                aria-label={`${badge} unread`}
                style={{
                  position: 'absolute', top: -6, right: -6,
                  minWidth: 18, height: 18, paddingInline: 4,
                  background: 'var(--color-danger)',
                  color: '#fff', fontSize: '0.6rem', fontWeight: 800,
                  borderRadius: 99,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </div>
          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.2 }}>
            {label}
          </span>
        </motion.button>
      ))}
    </div>
  )
}
