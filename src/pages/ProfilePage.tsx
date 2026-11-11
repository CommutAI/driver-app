import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Bell, AlertTriangle, MapPin, Shield, ChevronDown, ChevronUp, Lock, FileText, UserCheck } from 'lucide-react'

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
  const [privacyOpen,   setPrivacyOpen]   = useState(false)
  const [roleOpen,      setRoleOpen]      = useState(false)
  const [policyOpen,    setPolicyOpen]    = useState(false)

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
    { label: 'Phone',     value: user?.phone     ?? '—' },
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

      {/* ── Emergency Section ── */}
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
                Emergency
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

      {/* ── Data Privacy, Role & Policy ── */}
      {[
        {
          key: 'privacy',
          open: privacyOpen,
          toggle: () => setPrivacyOpen(o => !o),
          icon: Lock,
          iconColor: '#60A5FA',
          iconBg: 'rgba(59,130,246,0.15)',
          title: 'Data Privacy',
          subtitle: 'How your personal data is collected and used',
          content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <p style={{ margin: 0 }}>
                CommutAI collects and processes your personal information — including name, email, phone number, GPS location, and trip activity — solely for the purpose of operating the driver portal and ensuring safe transit operations.
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Data collected:</strong> Account details, real-time GPS coordinates during active trips, trip history, passenger counts, and incident reports.
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Data retention:</strong> Trip and location data is retained for operational auditing and may be accessed by authorized administrators. Personal data is never sold to third parties.
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Your rights:</strong> You may request a copy or deletion of your personal data by contacting your System Administrator.
              </p>
            </div>
          ),
        },
        {
          key: 'role',
          open: roleOpen,
          toggle: () => setRoleOpen(o => !o),
          icon: UserCheck,
          iconColor: '#4ADE80',
          iconBg: 'rgba(74,222,128,0.15)',
          title: 'Role & Permissions',
          subtitle: `Your assigned role: ${roleLabel}`,
          content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(74,222,128,0.07)',
                border: '1px solid rgba(74,222,128,0.2)',
              }}>
                <UserCheck size={16} color="#4ADE80" />
                <span style={{ fontWeight: 700, color: '#4ADE80', fontSize: '0.88rem' }}>{roleLabel}</span>
              </div>
              <p style={{ margin: 0 }}>As a <strong style={{ color: 'var(--text-primary)' }}>Driver</strong>, you have access to:</p>
              {[
                'View and manage your active trip',
                'Real-time GPS navigation',
                'Passenger occupancy monitoring',
                'Incident reporting',
                'Trip history and journey logs',
                'Emergency alert dispatch',
                'Announcements and notifications',
              ].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F97316', flexShrink: 0 }} />
                  <span>{item}</span>
                </div>
              ))}
              <p style={{ margin: 0, marginTop: 4 }}>
                Role changes must be requested through your System Administrator. You cannot modify your own role or permissions.
              </p>
            </div>
          ),
        },
        {
          key: 'policy',
          open: policyOpen,
          toggle: () => setPolicyOpen(o => !o),
          icon: FileText,
          iconColor: '#F97316',
          iconBg: 'rgba(249,115,22,0.15)',
          title: 'Terms & Usage Policy',
          subtitle: 'Acceptable use and conduct guidelines',
          content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <p style={{ margin: 0 }}>
                By using the CommutAI Driver Portal, you agree to the following terms:
              </p>
              {[
                'Use this application only during authorized working hours and assigned duties.',
                'Do not share your login credentials with any other person.',
                'All GPS tracking and trip data is logged and monitored for safety compliance.',
                'Falsifying trip data, passenger counts, or incident reports is strictly prohibited.',
                'The Emergency Alert feature is for genuine emergencies only. Misuse will be subject to disciplinary action.',
                'You are responsible for ensuring your device is charged and functional before starting a trip.',
                'Report any technical issues to your supervisor or System Administrator promptly.',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <span style={{ color: '#F97316', fontWeight: 800, flexShrink: 0, fontSize: '0.78rem', marginTop: 2 }}>{i + 1}.</span>
                  <span>{item}</span>
                </div>
              ))}
              <p style={{ margin: 0, marginTop: 4, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Violations of this policy may result in suspension or termination of system access. For questions, contact your System Administrator.
              </p>
            </div>
          ),
        },
      ].map(({ key, open, toggle, icon: Icon, iconColor, iconBg, title, subtitle, content }) => (
        <SoftCard key={key} padding={0}>
          <button
            type="button"
            onClick={toggle}
            style={{
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={iconColor} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>{title}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{subtitle}</p>
              </div>
            </div>
            <div style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
              {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ paddingTop: 14 }}>{content}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SoftCard>
      ))}

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
        CommutAI Driver Portal · Role and permissions managed by System Administrator.
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
