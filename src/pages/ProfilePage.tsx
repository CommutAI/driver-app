import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogOut, Bell, AlertTriangle, MapPin, Shield } from 'lucide-react'

import { useAuth }        from '../contexts/AuthContext'
import { useAssignedBus } from '../hooks/useAssignedBus'
import SectionHeader from '../components/ui/SectionHeader'
import SoftCard      from '../components/ui/SoftCard'
import StatusBadge   from '../components/ui/StatusBadge'
import ConfirmModal  from '../components/trip/ConfirmModal'
import EmergencyModal from '../components/emergency/EmergencyModal'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { bus }           = useAssignedBus()

  const [showLogout,    setShowLogout]    = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [showEmergency, setShowEmergency] = useState(false)

  const initials = user?.full_name
    ?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '?'

  async function handleLogout() {
    setLogoutLoading(true)
    await signOut()
    navigate('/login', { replace: true })
  }

  // Role display — 'conductor' is the closest shared-schema role;
  // this app is used by the driver side of conductor accounts
  const roleLabel = user?.role
    ? user.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Staff'

  const infoRows = [
    { label: 'Full Name', value: user?.full_name ?? '—' },
    { label: 'Email',     value: user?.email     ?? '—' },
    { label: 'Staff ID',  value: user?.id.slice(0, 14) + '…', mono: true },
    { label: 'Role',      value: roleLabel },
    { label: 'Assigned Bus', value: bus ? `${bus.bus_number ? `Bus ${bus.bus_number} · ` : ''}${bus.plate_number}` : 'None' },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeader title="My Profile" subtitle="Account details & driver assignment" light />

      {/* ── User card with enhanced design ── */}
      <SoftCard padding={24}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 70, height: 70, borderRadius: '50%',
            background: 'var(--color-primary-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', fontWeight: 900, color: '#fff',
            boxShadow: '0 8px 24px rgba(249,115,22,0.4)',
            flexShrink: 0,
            position: 'relative',
          }}>
            {initials}
            <div style={{
              position: 'absolute', bottom: 2, right: 2,
              width: 14, height: 14, borderRadius: '50%',
              background: '#22C55E', border: '2px solid #0F1117'
            }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.full_name ?? 'Driver'}
            </h2>
            <p style={{ margin: '4px 0 8px', fontSize: '0.85rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <StatusBadge variant="info">{roleLabel}</StatusBadge>
              <StatusBadge variant={user?.is_active ? 'success' : 'danger'}>
                {user?.is_active ? 'Active' : 'Inactive'}
              </StatusBadge>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Bus', value: bus?.bus_number || '—', icon: MapPin },
            { label: 'Status', value: user?.is_active ? 'Active' : 'Inactive', icon: Shield },
            { label: 'Role', value: roleLabel.split(' ')[0], icon: Bell },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} style={{
              padding: '12px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center'
            }}>
              <Icon size={16} style={{ color: 'var(--color-primary)', marginBottom: 6 }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Info rows */}
        {infoRows.map(({ label, value, mono }) => (
          <div key={label} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', width: 110, flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: mono ? 'monospace' : undefined }}>
              {value}
            </span>
          </div>
        ))}
      </SoftCard>

      {/* ── Emergency SOS Section ── */}
      <SoftCard padding={20}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(239,68,68,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle size={20} color="#EF4444" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Emergency SOS
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Send emergency alert to dispatch
              </p>
            </div>
          </div>
        </div>
        <motion.button
          type="button"
          onClick={() => setShowEmergency(true)}
          whileTap={{ scale: 0.97 }}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
            border: '2px solid rgba(255,255,255,0.2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.9rem',
            letterSpacing: '0.04em',
            boxShadow: '0 4px 16px rgba(239,68,68,0.4)',
            animation: 'emergency-pulse 2s ease-in-out infinite',
          }}
        >
          <AlertTriangle size={20} strokeWidth={2.5} />
          SEND EMERGENCY ALERT
        </motion.button>
      </SoftCard>

      {/* ── Sign out ── */}
      <motion.button
        type="button"
        onClick={() => setShowLogout(true)}
        whileTap={{ scale: 0.98 }}
        className="emergency-btn"
        style={{ justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em', color: '#F87171' }}
      >
        <LogOut size={20} />
        Sign Out
      </motion.button>

      <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-tertiary)', paddingBottom: 8 }}>
        Role and permissions are managed by the System Administrator.
      </p>

      <ConfirmModal
        open={showLogout} title="Sign Out"
        confirmLabel="Sign Out" confirmVariant="danger"
        loading={logoutLoading}
        onConfirm={handleLogout}
        onCancel={() => setShowLogout(false)}
      >
        <p>You will be returned to the login screen.</p>
      </ConfirmModal>

      <EmergencyModal open={showEmergency} onClose={() => setShowEmergency(false)} />
    </motion.div>
  )
}
