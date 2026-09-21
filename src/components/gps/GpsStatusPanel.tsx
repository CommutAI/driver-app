import { Satellite, MapPin, Gauge, Wifi, WifiOff, AlertTriangle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import SoftCard    from '../ui/SoftCard'
import StatusBadge from '../ui/StatusBadge'
import type { GpsLocation, GpsStatus } from '../../types'

interface Props { location: GpsLocation | null; gpsStatus: GpsStatus; lastUpdate: Date | null; loading?: boolean }

export default function GpsStatusPanel({ location, gpsStatus, lastUpdate }: Props) {
  const variant = gpsStatus === 'connected' ? 'success' : gpsStatus === 'poor' ? 'warning' : 'danger'

  return (
    <SoftCard variant={gpsStatus === 'disconnected' ? 'accent-danger' : gpsStatus === 'poor' ? 'accent-warning' : 'default'} padding={18}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'var(--color-success-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {gpsStatus === 'disconnected'
              ? <WifiOff size={22} color="var(--color-danger)" />
              : <Satellite size={22} color="var(--color-success)" />}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GPS Status</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {gpsStatus === 'connected' ? 'GPS Connected' : gpsStatus === 'poor' ? 'Poor Signal' : 'GPS Disconnected'}
            </p>
          </div>
        </div>
        <StatusBadge variant={variant}>{gpsStatus === 'connected' ? 'Live' : gpsStatus === 'poor' ? 'Weak' : 'Offline'}</StatusBadge>
      </div>

      {/* Warning */}
      {gpsStatus !== 'connected' && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 14, color: '#F87171', fontSize: '0.82rem', fontWeight: 500 }}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          GPS signal unavailable. Location tracking may be temporarily inaccurate.
        </div>
      )}

      {/* Data grid */}
      {location && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: <MapPin size={14} />, label: 'Latitude',   value: Number(location.latitude).toFixed(6),  mono: true },
            { icon: <MapPin size={14} />, label: 'Longitude',  value: Number(location.longitude).toFixed(6), mono: true },
            { icon: <Gauge  size={14} />, label: 'Speed',      value: `${Number(location.speed ?? 0).toFixed(1)} km/h` },
            { icon: <Wifi   size={14} />, label: 'Accuracy',   value: location.accuracy != null ? `±${Number(location.accuracy).toFixed(0)} m` : '—' },
            ...(location.satellite_count != null ? [{ icon: <Satellite size={14} />, label: 'Satellites', value: `${location.satellite_count}` }] : []),
            ...(lastUpdate ? [{ icon: <Clock size={14} />, label: 'Updated', value: formatDistanceToNow(lastUpdate, { addSuffix: true }) }] : []),
          ].map(({ icon, label, value, mono }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                {icon}
                <span style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: mono ? 'monospace' : undefined }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      <p style={{ margin: '12px 0 0', fontSize: '0.68rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
        GPS data is provided by the Raspberry Pi on-board system · Read only
      </p>
    </SoftCard>
  )
}
