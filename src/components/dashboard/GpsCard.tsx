import { Satellite, MapPin, Gauge, AlertTriangle, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import SoftCard    from '../ui/SoftCard'
import StatusBadge from '../ui/StatusBadge'
import { SkeletonLine } from '../ui/Skeleton'
import type { GpsLocation, GpsStatus } from '../../types'

interface Props {
  location: GpsLocation | null
  gpsStatus: GpsStatus
  lastUpdate: Date | null
  loading: boolean
}

function gpsVariant(s: GpsStatus): 'success' | 'warning' | 'danger' {
  if (s === 'connected') return 'success'
  if (s === 'poor')      return 'warning'
  return 'danger'
}

function gpsLabel(s: GpsStatus) {
  if (s === 'connected') return 'Live'
  if (s === 'poor')      return 'Weak'
  return 'Offline'
}

export default function GpsCard({ location, gpsStatus, lastUpdate, loading }: Props) {
  const navigate = useNavigate()

  const cardVariant = gpsStatus === 'disconnected' ? 'accent-danger' : gpsStatus === 'poor' ? 'accent-warning' : 'default'

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
      <SoftCard variant={cardVariant} onClick={() => navigate('/route')} padding={0} aria-label="GPS status">
        <div style={{ padding: 18 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'var(--color-success-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Satellite size={22} color="var(--color-success)" strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                GPS Status
              </p>
              {loading
                ? <SkeletonLine width="110px" height={14} />
                : <p style={{ margin: '2px 0 0', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {gpsStatus === 'connected' ? 'GPS Connected' : gpsStatus === 'poor' ? 'Weak Signal' : 'GPS Offline'}
                  </p>}
            </div>
            {!loading && <StatusBadge variant={gpsVariant(gpsStatus)}>{gpsLabel(gpsStatus)}</StatusBadge>}
            <ChevronRight size={16} color="var(--text-tertiary)" />
          </div>

          {/* Data */}
          {loading
            ? <><SkeletonLine /><SkeletonLine width="60%" /></>
            : location
              ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={13} color="var(--text-tertiary)" />
                    <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {Number(location.latitude).toFixed(5)}, {Number(location.longitude).toFixed(5)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      <Gauge size={13} color="var(--text-tertiary)" />
                      {Number(location.speed ?? 0).toFixed(1)} km/h
                    </span>
                    {location.satellite_count != null && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <Satellite size={13} color="var(--text-tertiary)" />
                        {location.satellite_count} sats
                      </span>
                    )}
                    {lastUpdate && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                        {formatDistanceToNow(lastUpdate, { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              )
              : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={15} color="var(--color-warning)" />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    GPS signal unavailable
                  </span>
                </div>
              )
          }
        </div>
      </SoftCard>
    </motion.div>
  )
}
