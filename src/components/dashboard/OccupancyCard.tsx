import { Users, AlertTriangle, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import SoftCard from '../ui/SoftCard'
import { SkeletonLine } from '../ui/Skeleton'
import type { OccupancySummary } from '../../types'

interface Props { occupancy: OccupancySummary; loading: boolean }

function barColor(pct: number) {
  if (pct >= 100) return 'var(--color-danger)'
  if (pct >= 90)  return 'var(--color-warning)'
  return 'var(--color-success)'
}

export default function OccupancyCard({ occupancy, loading }: Props) {
  const navigate = useNavigate()
  const { ai_count, total_capacity, occupancy_percentage, status } = occupancy

  const cardVariant = status === 'at_capacity' ? 'accent-danger' : status === 'near_capacity' ? 'accent-warning' : 'default'

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }}>
      <SoftCard variant={cardVariant} onClick={() => navigate('/occupancy')} padding={0} aria-label="Passenger occupancy">
        <div style={{ padding: 18 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'rgba(168,85,247,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Users size={22} color="#c084fc" strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Passengers
              </p>
              {loading
                ? <SkeletonLine width="90px" height={22} />
                : (
                  <p style={{ margin: '2px 0 0', fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                    {ai_count}
                    <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-tertiary)' }}> / {total_capacity}</span>
                  </p>
                )}
            </div>
            {!loading && status !== 'normal' && (
              <AlertTriangle size={18} color={status === 'at_capacity' ? 'var(--color-danger)' : 'var(--color-warning)'} />
            )}
            <ChevronRight size={16} color="var(--text-tertiary)" />
          </div>

          {/* Progress bar */}
          {loading
            ? <SkeletonLine height={8} />
            : (
              <>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, occupancy_percentage)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: 99, background: barColor(occupancy_percentage) }}
                    role="progressbar"
                    aria-valuenow={ai_count}
                    aria-valuemin={0}
                    aria-valuemax={total_capacity}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: barColor(occupancy_percentage) }}>
                    {occupancy_percentage}% Occupied
                  </span>
                  {status === 'at_capacity' && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-danger)' }}>⚠ BUS FULL</span>
                  )}
                  {status === 'near_capacity' && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-warning)' }}>⚠ NEAR FULL</span>
                  )}
                </div>
              </>
            )
          }
        </div>
      </SoftCard>
    </motion.div>
  )
}
