import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, UserCheck, Brain, AlertTriangle, RefreshCw, Info } from 'lucide-react'

import { useActiveTrip } from '../hooks/useActiveTrip'
import { useOccupancy }  from '../hooks/useOccupancy'
import SectionHeader from '../components/ui/SectionHeader'
import SoftCard      from '../components/ui/SoftCard'

const CAPACITY_SEATS    = 25
const CAPACITY_STANDING = 6
const CAPACITY_TOTAL    = 31

function gaugeColor(pct: number) {
  if (pct >= 100) return '#EF4444'
  if (pct >= 90)  return '#FACC15'
  return '#22C55E'
}

export default function OccupancyPage() {
  const { trip }  = useActiveTrip()
  const { occupancy, loading, refetch } = useOccupancy(trip?.id)

  useEffect(() => {
    const id = setInterval(refetch, 20_000)
    return () => clearInterval(id)
  }, [refetch])

  const { ai_count, scan_count, total_capacity, available_capacity, occupancy_percentage, status } = occupancy

  const radius = 52
  const circ   = 2 * Math.PI * radius
  const offset = circ - (circ * Math.min(occupancy_percentage, 100)) / 100
  const color  = gaugeColor(occupancy_percentage)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <SectionHeader
        title="Passenger Occupancy"
        subtitle="AI-monitored · read only"
        light
        action={
          <button
            type="button"
            onClick={refetch}
            aria-label="Refresh"
            style={{ width: 36, height: 36, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        }
      />

      {/* ── Hero gauge card ── */}
      <SoftCard variant="default" padding={28}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {/* SVG radial */}
          <div style={{ position: 'relative', width: 144, height: 144 }}>
            <svg width={144} height={144} viewBox="0 0 144 144" aria-hidden>
              <circle cx={72} cy={72} r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={12} />
              <motion.circle
                cx={72} cy={72} r={radius}
                fill="none" stroke={color} strokeWidth={12} strokeLinecap="round"
                strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1, ease: 'easeOut' }}
                transform="rotate(-90 72 72)"
                style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{ fontSize: '2rem', fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.04em' }}
              >
                {occupancy_percentage}%
              </motion.span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Occupied
              </span>
            </div>
          </div>

          {/* Big count */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '3rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.05em', lineHeight: 1 }}
              aria-label={`${ai_count} of ${total_capacity} passengers`}>
              {ai_count}
              <span style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-tertiary)' }}> / {total_capacity}</span>
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Passengers on board</p>
          </div>

          {/* Status banners */}
          {status === 'at_capacity' && (
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-danger-subtle)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: '#F87171', fontWeight: 800, fontSize: '0.9rem' }}>
              <AlertTriangle size={18} /> ⚠ BUS AT CAPACITY
            </motion.div>
          )}
          {status === 'near_capacity' && (
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-warning-subtle)', border: '1px solid rgba(250,204,21,0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: '#FDE047', fontWeight: 800, fontSize: '0.9rem' }}>
              <AlertTriangle size={18} /> ⚠ Near Capacity
            </motion.div>
          )}
        </div>
      </SoftCard>

      {/* ── Breakdown tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { icon: <Brain size={22} color="#c084fc" />, bg: 'rgba(168,85,247,0.12)', value: ai_count, label: 'AI Count' },
          { icon: <UserCheck size={22} color="var(--color-info)" />, bg: 'var(--color-info-subtle)', value: scan_count, label: 'Scan Count' },
          { icon: <Users size={22} color="var(--color-success)" />, bg: 'var(--color-success-subtle)', value: available_capacity, label: 'Available' },
          { icon: <Users size={22} color="var(--color-primary)" />, bg: 'var(--color-primary-subtle)', value: total_capacity, label: 'Total Capacity' },
        ].map(({ icon, bg, value, label }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <SoftCard padding={16}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  {icon}
                </div>
                <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.68rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
              </div>
            </SoftCard>
          </motion.div>
        ))}
      </div>

      {/* ── Capacity breakdown ── */}
      <SoftCard padding={18}>
        <p style={{ margin: '0 0 14px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Capacity Breakdown
        </p>
        {[
          { label: 'Seated', value: `${CAPACITY_SEATS} seats` },
          { label: 'Standing', value: `${CAPACITY_STANDING} approx.` },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{label}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0 0' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>Total Maximum</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-primary)' }}>{CAPACITY_TOTAL} passengers</span>
        </div>
      </SoftCard>

      {/* ── Info note ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--color-info-subtle)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: '#60A5FA', fontSize: '0.82rem', fontWeight: 500 }}>
        <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        Passenger count is monitored automatically by the AI camera system and QR validations. This information is for operational awareness only.
      </div>
    </motion.div>
  )
}
