import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bus, Satellite, Wifi, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Info } from 'lucide-react'

import { useAssignedBus } from '../hooks/useAssignedBus'
import { useActiveTrip }  from '../hooks/useActiveTrip'
import { useGpsLocation } from '../hooks/useGpsLocation'
import SectionHeader from '../components/ui/SectionHeader'
import SoftCard      from '../components/ui/SoftCard'
import StatusBadge   from '../components/ui/StatusBadge'
import type { DeviceStatus } from '../types'

function deviceConfig(s: DeviceStatus) {
  if (s === 'online')  return { icon: <CheckCircle2  size={18} color="#4ADE80" />, variant: 'success' as const, label: 'Online'  }
  if (s === 'warning') return { icon: <AlertTriangle size={18} color="#FDE047" />, variant: 'warning' as const, label: 'Warning' }
  return                      { icon: <XCircle       size={18} color="#F87171" />, variant: 'danger'  as const, label: 'Offline' }
}

interface StatusRowProps { icon: React.ReactNode; label: string; status: DeviceStatus; detail?: string }

function StatusRow({ icon, label, status, detail }: StatusRowProps) {
  const { icon: stIcon, variant, label: stLabel } = deviceConfig(status)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-secondary)' }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{label}</p>
        {detail && <p style={{ margin: '1px 0 0', fontSize: '0.72rem', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {stIcon}
        <StatusBadge variant={variant}>{stLabel}</StatusBadge>
      </div>
    </div>
  )
}

export default function BusStatusPage() {
  const { bus, loading, refetch }  = useAssignedBus()
  const { trip }                   = useActiveTrip()
  const { location, gpsStatus, refetch: refetchGps } = useGpsLocation(trip?.id)

  useEffect(() => {
    const id = setInterval(() => { refetch(); refetchGps() }, 30_000)
    return () => clearInterval(id)
  }, [refetch, refetchGps])

  const gpsDeviceStatus: DeviceStatus =
    gpsStatus === 'connected' ? 'online' : gpsStatus === 'poor' ? 'warning' : 'offline'

  const internetStatus: DeviceStatus = navigator.onLine ? 'online' : 'offline'

  // bus.status maps: 'active'→online, 'maintenance'→warning, 'inactive'→offline
  const busStatusVariant = bus?.status === 'active' ? 'success' : bus?.status === 'maintenance' ? 'warning' : 'neutral'

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <SectionHeader
        title="Bus Status"
        subtitle="System health overview"
        light
        action={
          <button type="button" onClick={() => { refetch(); refetchGps() }} aria-label="Refresh"
            style={{ width: 36, height: 36, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        }
      />

      {/* Bus identity hero */}
      <SoftCard variant="hero" padding={20}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bus size={28} color="#ffffff" strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {bus?.plate_number ?? '—'}
            </p>
            {bus?.bus_number && (
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>
                Bus #{bus.bus_number}
              </p>
            )}
          </div>
          <StatusBadge variant={busStatusVariant}>
            {bus?.status?.replace(/_/g, ' ') ?? 'Unknown'}
          </StatusBadge>
        </div>

        {/* Route + capacity */}
        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Route</p>
          <p style={{ margin: '2px 0 0', fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>
            {bus?.route ?? '—'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 0', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {bus?.seat_capacity ?? '—'}
            </p>
            <p style={{ margin: '3px 0 0', fontSize: '0.62rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Seats
            </p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '10px 0', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {bus?.status === 'active' ? 'Active' : bus?.status ?? '—'}
            </p>
            <p style={{ margin: '3px 0 0', fontSize: '0.62rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Status
            </p>
          </div>
        </div>
      </SoftCard>

      {/* System status rows */}
      <SoftCard padding={18}>
        <p style={{ margin: '0 0 14px', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          System Status
        </p>
        <StatusRow
          icon={<Satellite size={18} />}
          label="GPS"
          status={gpsDeviceStatus}
          detail={location
            ? `${Number(location.latitude).toFixed(4)}, ${Number(location.longitude).toFixed(4)}`
            : 'No signal — checking via trip'}
        />
        <StatusRow
          icon={<Wifi size={18} />}
          label="Internet"
          status={internetStatus}
          detail="Data connectivity"
        />
      </SoftCard>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--color-info-subtle)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: '#60A5FA', fontSize: '0.82rem', fontWeight: 500 }}>
        <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        Hardware configuration and Raspberry Pi status are monitored by the System Administrator.
      </div>
    </motion.div>
  )
}
