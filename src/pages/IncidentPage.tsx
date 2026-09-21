/**
 * IncidentPage
 * The shared schema has no incident_reports table.
 * Driver incident reports are inserted as notification records
 * (type='alert') so the operator/admin can see them in the
 * notifications feed, and logged to audit_logs.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, CheckCircle2, XCircle, MapPin } from 'lucide-react'

import { useAuth }        from '../contexts/AuthContext'
import { useActiveTrip }  from '../hooks/useActiveTrip'
import { useAssignedBus } from '../hooks/useAssignedBus'
import { useGpsLocation } from '../hooks/useGpsLocation'
import { supabase }       from '../lib/supabase'
import SectionHeader from '../components/ui/SectionHeader'
import SoftCard      from '../components/ui/SoftCard'
import PrimaryButton from '../components/ui/PrimaryButton'

const INCIDENT_TYPES = [
  'Vehicle Problem',
  'Road Obstruction',
  'Accident',
  'Passenger Issue',
  'GPS Problem',
  'System Problem',
  'Other',
]

export default function IncidentPage() {
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const { trip }  = useActiveTrip()
  const { bus }   = useAssignedBus()
  const { location } = useGpsLocation(trip?.id)

  const [incType,     setIncType]     = useState('')
  const [description, setDescription] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [success,     setSuccess]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!incType || !description.trim() || !user) return
    setLoading(true); setError(null)

    const gpsText = location
      ? ` GPS: ${Number(location.latitude).toFixed(4)},${Number(location.longitude).toFixed(4)}.`
      : ''
    const busText  = bus?.plate_number  ? ` Bus: ${bus.plate_number}.` : ''
    const tripText = trip?.id           ? ` Trip: ${trip.id.slice(0,8)}…` : ''
    const message  = `[DRIVER REPORT] ${incType} — ${description.trim()}.${busText}${tripText}${gpsText}`

    // Insert into notifications so it surfaces in the shared feed
    const { error: err } = await (supabase.from('notifications') as any).insert({
      message,
      type: 'alert',
      read: false,
    })

    if (err) {
      setError((err as any).message)
    } else {
      // Audit log
      ;(supabase.from('audit_logs') as any)
        .insert({
          username: user.email,
          action:   'CREATE',
          module:   'driver_app_incident',
          details:  message,
        }).then(() => {}).catch(() => {})
      setSuccess(true)
      setIncType('')
      setDescription('')
    }
    setLoading(false)
  }

  // ── Success screen ───────────────────────────────────────────────────────
  if (success) return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader title="Report Incident" light />
      <SoftCard padding={40}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-success-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle2 size={36} color="var(--color-success)" />
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Incident Reported
          </h3>
          <p style={{ margin: '0 0 24px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Your report has been submitted and will be reviewed by the operator.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => setSuccess(false)} className="primary-btn primary-btn--full primary-btn--ghost">
              Report Another
            </button>
            <button type="button" onClick={() => navigate('/')} className="primary-btn primary-btn--full primary-btn--primary">
              Dashboard
            </button>
          </div>
        </div>
      </SoftCard>
    </motion.div>
  )

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader title="Report Incident" subtitle="Complete this when safely stopped" light />

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-danger-subtle)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-md)', padding: '12px 14px', color: '#F87171', fontSize: '0.88rem', fontWeight: 600 }}>
              <XCircle size={16} />{error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Incident type */}
        <SoftCard padding={18}>
          <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Incident Type <span style={{ color: '#F87171' }}>*</span>
          </label>
          <select
            value={incType}
            onChange={e => setIncType(e.target.value)}
            required
            style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-md)' }}
          >
            <option value="" disabled>Select incident type…</option>
            {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </SoftCard>

        {/* Description */}
        <SoftCard padding={18}>
          <label htmlFor="incident-desc"
            style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Description <span style={{ color: '#F87171' }}>*</span>
          </label>
          <textarea
            id="incident-desc"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required rows={4} maxLength={500}
            placeholder="Brief description of what happened…"
            style={{ width: '100%', padding: '10px 12px', resize: 'none', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'var(--font-family)' }}
          />
          <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>
            {description.length}/500
          </p>
        </SoftCard>

        {/* Auto-filled info */}
        <SoftCard padding={18}>
          <p style={{ margin: '0 0 12px', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Auto-filled Information
          </p>
          {[
            { label: 'Date / Time', value: new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) },
            { label: 'Bus',  value: bus?.plate_number ?? '—' },
            { label: 'Trip', value: trip ? trip.id.slice(0, 13) + '…' : '—', mono: true },
            ...(location ? [{ label: 'GPS', value: `${Number(location.latitude).toFixed(4)}, ${Number(location.longitude).toFixed(4)}`, mono: true, icon: true }] : []),
          ].map(({ label, value, mono, icon }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                {icon && <MapPin size={12} />}{label}
              </span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: mono ? 'monospace' : undefined }}>
                {value}
              </span>
            </div>
          ))}
        </SoftCard>

        <PrimaryButton type="submit" variant="primary" fullWidth loading={loading} disabled={!incType || !description.trim()}>
          <FileText size={18} />
          Submit Report
        </PrimaryButton>

      </form>
    </motion.div>
  )
}
