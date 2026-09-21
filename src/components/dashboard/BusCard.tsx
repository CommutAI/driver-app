import { Bus, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import SoftCard    from '../ui/SoftCard'
import StatusBadge from '../ui/StatusBadge'
import { SkeletonLine } from '../ui/Skeleton'
import { useAuth } from '../../contexts/AuthContext'
import type { Bus as BusType } from '../../types'

interface Props { bus: BusType | null; loading: boolean }

function busVariant(s: BusType['status']): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (s) {
    case 'active':      return 'success'
    case 'maintenance': return 'warning'
    case 'inactive':    return 'danger'
    default:            return 'neutral'
  }
}

function busLabel(s: BusType['status']) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function BusCard({ bus, loading }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <SoftCard onClick={() => navigate('/bus-status')} padding={0} aria-label="View bus status">
        <div style={{ padding: 18 }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'var(--color-primary-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Bus size={22} color="var(--color-primary)" strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Assigned Bus
              </p>
              {loading
                ? <SkeletonLine width="120px" height={14} />
                : <p style={{ margin: '2px 0 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                    {bus?.bus_number ?? '—'}
                  </p>}
            </div>
            {!loading && bus && (
              <StatusBadge variant={busVariant(bus.status)}>{busLabel(bus.status)}</StatusBadge>
            )}
            <ChevronRight size={16} color="var(--text-tertiary)" />
          </div>

          {/* Detail grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
            {[
              { label: 'Plate', value: bus?.plate_number ?? '—' },
              { label: 'Driver', value: user?.full_name?.split(' ')[0] ?? '—' },
              { label: 'Capacity', value: bus ? `${bus.seat_capacity} seats` : '—' },
              { label: 'Route', value: bus?.route ? bus.route.split(/[↔→\-–]/)[0]?.trim() + '…' : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {label}
                </p>
                {loading
                  ? <SkeletonLine width="80px" height={12} />
                  : <p style={{ margin: '2px 0 0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {value}
                    </p>}
              </div>
            ))}
          </div>

          {!loading && !bus && (
            <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              No bus assigned yet.
            </p>
          )}
        </div>
      </SoftCard>
    </motion.div>
  )
}
