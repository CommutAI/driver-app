import { Navigation, Clock, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import SoftCard    from '../ui/SoftCard'
import StatusBadge from '../ui/StatusBadge'
import { SkeletonLine } from '../ui/Skeleton'
import type { Trip } from '../../types'

interface Props { trip: Trip | null; loading: boolean }

function tripVariant(s: Trip['status']): 'success' | 'info' | 'neutral' | 'danger' {
  if (s === 'in_progress') return 'success'
  if (s === 'cancelled')   return 'danger'
  return 'neutral'
}

function tripLabel(s: Trip['status']) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function routeSummary(trip: Trip): string {
  const bus = trip.bus as any
  const route: string = bus?.route ?? ''
  if (!route) return '—'
  const parts = route.split(/[↔→\-–]/).map((s: string) => s.trim()).filter(Boolean)
  if (parts.length >= 2) return `${parts[0]} → ${parts[parts.length - 1]}`
  return route
}

export default function TripStatusCard({ trip, loading }: Props) {
  const navigate = useNavigate()

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
      <SoftCard
        variant={trip?.status === 'in_progress' ? 'accent-success' : 'default'}
        onClick={() => navigate('/trip')}
        padding={0}
        aria-label="View current trip"
      >
        <div style={{ padding: 18 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'var(--color-info-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Navigation size={22} color="var(--color-info)" strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Current Trip
              </p>
              {loading
                ? <SkeletonLine width="140px" height={14} />
                : <p style={{ margin: '2px 0 0', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {trip ? routeSummary(trip) : 'No active trip'}
                  </p>}
            </div>
            {!loading && trip && (
              <StatusBadge variant={tripVariant(trip.status)} pulse={trip.status === 'in_progress'}>
                {tripLabel(trip.status)}
              </StatusBadge>
            )}
            <ChevronRight size={16} color="var(--text-tertiary)" />
          </div>

          {/* Details */}
          {loading
            ? <><SkeletonLine /><SkeletonLine width="75%" /></>
            : trip
              ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trip ID</p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {trip.id.slice(0, 13)}…
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Started</p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> {format(new Date(trip.started_at), 'h:mm a')}
                    </p>
                  </div>
                </div>
              )
              : <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No active trip.</p>
          }
        </div>
      </SoftCard>
    </motion.div>
  )
}
