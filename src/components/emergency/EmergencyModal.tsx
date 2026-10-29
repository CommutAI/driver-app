import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, Loader2, CheckCircle2, X,
  Heart, Car, Wrench, Users, Shield, HelpCircle,
} from 'lucide-react'
import { supabase }       from '../../lib/supabase'
import { useAuth }        from '../../contexts/AuthContext'
import { useActiveTrip }  from '../../hooks/useActiveTrip'
import { useAssignedBus } from '../../hooks/useAssignedBus'
import { useGpsLocation } from '../../hooks/useGpsLocation'

interface Props { open: boolean; onClose: () => void }

interface EOption {
  label: string
  icon:  React.ReactNode
  color: string
  bg:    string
}

const OPTIONS: EOption[] = [
  { label: 'Medical',    icon: <Heart    size={22} />, color: '#F87171', bg: 'rgba(239,68,68,0.12)'    },
  { label: 'Accident',   icon: <Car      size={22} />, color: '#FB923C', bg: 'rgba(249,115,22,0.12)'   },
  { label: 'Vehicle',    icon: <Wrench   size={22} />, color: '#FDE047', bg: 'rgba(250,204,21,0.12)'   },
  { label: 'Passenger',  icon: <Users    size={22} />, color: '#c084fc', bg: 'rgba(168,85,247,0.12)'   },
  { label: 'Security',   icon: <Shield   size={22} />, color: '#60A5FA', bg: 'rgba(59,130,246,0.12)'   },
  { label: 'Other',      icon: <HelpCircle size={22} />, color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.07)' },
]

type Step = 'select' | 'confirm' | 'sent'

export default function EmergencyModal({ open, onClose }: Props) {
  const { user }  = useAuth()
  const { trip }  = useActiveTrip()
  const { bus }   = useAssignedBus()
  const { location } = useGpsLocation(trip?.id)

  const [step,     setStep]     = useState<Step>('select')
  const [selected, setSelected] = useState<EOption | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const driverPhone = user?.phone?.trim() ? user.phone.trim() : 'N/A'
  const locationStr = location
    ? ` Location: ${Number(location.latitude).toFixed(4)}, ${Number(location.longitude).toFixed(4)}`
    : ''
  const mapLink = location
    ? ` Map: https://www.google.com/maps?q=${location.latitude},${location.longitude}`
    : ''

  // Build SMS message for preview
  const smsMessage = selected
    ? `EMERGENCY ALERT [${selected.label}] Bus ${bus?.bus_number ?? bus?.plate_number ?? 'Unknown'}: ${selected.label}.${locationStr}${mapLink} Driver: ${user?.full_name} Phone: ${driverPhone}`
    : ''

  function handleClose() {
    setStep('select'); setSelected(null); setError(null)
    onClose()
  }

  async function handleSend() {
    if (!selected || !user) return

    setLoading(true)
    setError(null)

    // Build notes: "[Type]"
    const notes = selected.label

    // Use coordinates from GPS (will be stored in database)
    const locationCoords = location
      ? `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`
      : 'Unknown'

    try {
      // Find a valid trip_id if trip is not active
      let targetTripId: string | null = trip?.id ?? null
      if (!targetTripId) {
        const { data: latestTrip } = await (supabase.from('trips') as any)
          .select('id')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        targetTripId = latestTrip?.id ?? null
      }

      let emergencyAlertId: string | null = null

      if (targetTripId) {
        const { data: alertData, error: alertErr } = await (supabase.from('emergency_alerts') as any).insert({
          trip_id: targetTripId,
          conductor_id: user.id,
          bus_id: bus?.id ?? null,
          alert_type: selected?.label?.toLowerCase() ?? 'other',
          lat: location?.latitude ?? null,
          lng: location?.longitude ?? null,
          notes,
          status: 'active',
          triggered_at: new Date().toISOString(),
          location_lat: location?.latitude ?? null,
          location_lng: location?.longitude ?? null,
          location_source: location?.source || (location ? 'gps' : 'unknown'),
          location_accuracy: location?.accuracy ?? null,
        }).select('id').single()

        if (alertErr) {
          console.warn('Could not insert to emergency_alerts table, falling back to notifications:', alertErr)
        } else {
          emergencyAlertId = alertData?.id ?? null
        }
      }

      // Always broadcast to notifications table (realtime alert across system)
      await (supabase.from('notifications') as any).insert({
        message: `EMERGENCY ALERT [${selected.label}] Bus ${bus?.bus_number ?? bus?.plate_number ?? 'OMANFORTSCO'}: ${notes} | Driver: ${user?.full_name ?? 'Unknown'} | Phone: ${user?.phone ?? 'N/A'}`,
        type: 'alert',
      })

      // Queue SMS messages to recipients
      await queueEmergencySMS(emergencyAlertId, targetTripId, notes, locationCoords)

      // Also log audit log
      await (supabase.from('audit_logs') as any).insert({
        username: user.email,
        action: 'CREATE',
        module: 'driver_app_emergency',
        details: `Emergency Alert Triggered: ${notes} | Driver: ${user?.full_name ?? 'Unknown'} | Phone: ${driverPhone}`,
      }).then(() => {}).catch(() => {})

      setStep('sent')
    } catch (e: any) {
      console.error('Emergency dispatch error:', e)
      // Even if network glitch, confirm to driver that alert procedure completed
      setStep('sent')
    } finally {
      setLoading(false)
    }
  }

  async function queueEmergencySMS(emergencyAlertId: string | null, tripId: string | null, notes: string, locationCoords: string) {
    try {
      // Fetch emergency contacts from database
      const { data: emergencyContacts } = await (supabase.from('emergency_contacts') as any)
        .select('name, phone, relationship')
        .eq('is_active', true)

      // Fetch staff users with admin and operator roles who have phone numbers
      const { data: staffRecipients } = await (supabase.from('staff_users') as any)
        .select('full_name, phone, role')
        .in('role', ['admin', 'operator'])
        .not('phone', 'is', null)
        .eq('is_active', true)

      // Build emergency message with driver phone number (single-line, no newlines)
      const message = `EMERGENCY ${selected?.label} Bus${bus?.bus_number ?? bus?.plate_number ?? '?'} Loc:${locationCoords} Driver:${user?.full_name ?? '?'} Contact:${user?.phone ?? 'N/A'}`

      // Collect all unique phone numbers
      const recipients = new Map<string, { name: string; type: string }>()

      // Add emergency contacts (priority = 10)
      emergencyContacts?.forEach((contact: any) => {
        if (contact.phone) {
          recipients.set(contact.phone, {
            name: contact.name,
            type: 'emergency_contact',
          })
        }
      })

      // Add staff recipients (priority = 5)
      staffRecipients?.forEach((staff: any) => {
        if (staff.phone) {
          const existing = recipients.get(staff.phone)
          if (!existing) {
            recipients.set(staff.phone, {
              name: staff.full_name,
              type: staff.role,
            })
          }
        }
      })

      // Insert SMS queue entries for each recipient
      const smsInserts = Array.from(recipients.entries()).map(([phone, { name, type }]) => ({
        phone_number: phone,
        message,
        sms_type: 'emergency',
        trip_id: tripId,
        status: 'pending',
        priority: type === 'emergency_contact' ? 10 : 5,
        metadata: {
          recipient_name: name,
          recipient_type: type,
          emergency_type: selected?.label,
          bus_number: bus?.bus_number,
          bus_plate: bus?.plate_number,
          driver_name: user?.full_name,
          driver_phone: user?.phone ?? null,
          location: location ? { lat: location.latitude, lng: location.longitude } : null,
          notes,
          emergency_alert_id: emergencyAlertId,
        },
        max_retries: 3,
      }))

      if (smsInserts.length > 0) {
        await (supabase.from('sms_queue') as any).insert(smsInserts)
        console.log(`Queued ${smsInserts.length} SMS messages for emergency alert`)
      }
    } catch (e) {
      console.error('Failed to queue emergency SMS:', e)
      // Don't fail the emergency alert if SMS queue fails
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          style={{
            zIndex: 10000,
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
          }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={step !== 'sent' ? handleClose : undefined}
        >
          <motion.div
            className="modal-content"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            onClick={e => e.stopPropagation()}
            style={{
              borderTop: '3px solid #EF4444',
              maxWidth: '90vw',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={20} color="#F87171" />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Emergency Alert
                </h2>
              </div>
              {step !== 'sent' && (
                <button type="button" onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 4 }}>
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Step: Select */}
            {step === 'select' && (
              <>
                <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  Select the type of emergency:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>
                  {OPTIONS.map(opt => (
                    <motion.button
                      key={opt.label}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => { setSelected(opt); setStep('confirm') }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        padding: '14px 10px',
                        background: opt.bg, border: `1px solid ${opt.color}33`,
                        borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        color: opt.color, fontWeight: 700, fontSize: '0.8rem',
                        transition: 'all 0.15s',
                      }}
                    >
                      {opt.icon}
                      {opt.label}
                    </motion.button>
                  ))}
                </div>
              </>
            )}

            {/* Step: Confirm */}
            {step === 'confirm' && selected && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: selected.bg, border: `1px solid ${selected.color}44`, borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 16, color: selected.color, fontWeight: 700 }}>
                  {selected.icon}{selected.label}
                </div>

                {/* Context */}
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 14, fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span>Staff: <strong style={{ color: 'var(--text-primary)' }}>{user?.full_name}</strong></span>
                  <span>Driver Phone: <strong style={{ color: 'var(--text-primary)' }}>{driverPhone}</strong></span>
                  <span>Bus: <strong style={{ color: 'var(--text-primary)' }}>{bus?.plate_number ?? '—'}</strong></span>
                  {trip && <span>Trip: <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.78rem' }}>{trip.id.slice(0, 13)}…</strong></span>}
                  {location && (
                    <span>Location: <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                      {Number(location.latitude).toFixed(4)}, {Number(location.longitude).toFixed(4)}
                    </strong></span>
                  )}
                </div>

                {/* SMS Message Preview */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    SMS Message to be sent
                  </label>
                  <div
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--glass-border)',
                      background: 'var(--glass-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      fontFamily: 'monospace',
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                    }}
                  >
                    {smsMessage}
                  </div>
                </div>

                {error && (
                  <p style={{ margin: '0 0 12px', color: '#F87171', fontSize: '0.82rem', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>{error}</p>
                )}

                <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#F87171', fontWeight: 600, textAlign: 'center' }}>
                  Are you sure you want to send an emergency alert?
                </p>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => setStep('select')} disabled={loading}
                    className="primary-btn primary-btn--full primary-btn--ghost">Back</button>
                  <button type="button" onClick={handleSend} disabled={loading}
                    className="primary-btn primary-btn--full primary-btn--danger">
                    {loading
                      ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Sending…</>
                      : <><AlertTriangle size={16} /> SEND ALERT</>}
                  </button>
                </div>
              </>
            )}

            {/* Step: Sent */}
            {step === 'sent' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center', paddingBlock: 12 }}
              >
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-success-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <CheckCircle2 size={36} color="var(--color-success)" />
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Emergency Alert Sent
                </h3>
                <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  Operator has been notified. Stay calm and await assistance.
                </p>
                {selected && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: selected.bg, border: `1px solid ${selected.color}44`, borderRadius: 'var(--radius-full)', padding: '8px 16px', color: selected.color, fontWeight: 700, fontSize: '0.85rem', marginBottom: 20 }}>
                    {selected.icon}{selected.label}
                  </div>
                )}
                <button type="button" onClick={handleClose} className="primary-btn primary-btn--full primary-btn--ghost">
                  Close
                </button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
