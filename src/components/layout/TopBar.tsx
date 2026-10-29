import { Wifi, WifiOff, AlertTriangle, LocateFixed, LocateOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth }     from '../../contexts/AuthContext'
import { useActiveTrip } from '../../hooks/useActiveTrip'
import { useGpsLocation } from '../../hooks/useGpsLocation'
import { format }      from 'date-fns'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Logo from '../Logo'
import EmergencyModal from '../emergency/EmergencyModal'

export default function TopBar() {
  const navigate = useNavigate()
  const { user }         = useAuth()
  const { trip }         = useActiveTrip()
  const { gpsStatus }    = useGpsLocation(trip?.id)
  const [time,   setTime]   = useState(new Date())
  const [online, setOnline] = useState(navigator.onLine)
  const [emergencyOpen, setEmergencyOpen] = useState(false)

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000)
    const up   = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online',  up)
    window.addEventListener('offline', down)
    return () => {
      clearInterval(tick)
      window.removeEventListener('online',  up)
      window.removeEventListener('offline', down)
    }
  }, [])

  return (
    <>
    <header className="page-header">
      <div
        style={{
          width: '100%',
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '0 16px',
        }}
      >
        {/* ── Brand ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Logo size="xs" style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: '0.95rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              CommutAI
            </p>
            <p style={{ margin: 0, fontSize: '0.62rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Driver Portal
            </p>
          </div>
        </div>

        {/* ── Right cluster ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

          {/* Staff name — hidden on very small screens */}
          {user && (
            <div
              className="glass-chip"
              style={{
                display: 'none',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
            >
              {user.full_name.split(' ')[0]}
            </div>
          )}

          {/* Emergency button */}
          <button
            type="button"
            onClick={() => setEmergencyOpen(true)}
            aria-label="Emergency"
            style={{
              position: 'relative',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-danger)',
              display: 'flex',
              alignItems: 'center',
              padding: 4,
              borderRadius: 8,
              transition: 'color var(--transition-fast)',
            }}
          >
            <AlertTriangle size={20} />
          </button>

          {/* GPS connectivity indicator */}
          <div
            title={`GPS: ${gpsStatus === 'connected' ? 'Connected' : gpsStatus === 'poor' ? 'Weak' : 'Disconnected'}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: trip ? 'pointer' : 'default',
              padding: 2,
            }}
            onClick={() => trip && navigate('/navigation')}
          >
            {gpsStatus === 'connected' ? (
              <LocateFixed size={18} color="var(--color-success)" aria-label="GPS Live" />
            ) : gpsStatus === 'poor' ? (
              <LocateFixed size={18} color="var(--color-warning)" aria-label="GPS Weak" />
            ) : (
              <LocateOff size={18} color="var(--color-danger)" aria-label="GPS Disconnected" />
            )}
          </div>

          {/* Network indicator */}
          {online
            ? <Wifi    size={18} color="var(--color-success)" aria-label="Online" />
            : <WifiOff size={18} color="var(--color-danger)"  aria-label="Offline" />}

          {/* Clock (12-hour format) */}
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
            }}
          >
            {format(time, 'h:mm a')}
          </span>
        </div>
      </div>
    </header>

    {/* Emergency Modal - rendered outside header via portal */}
    {emergencyOpen && createPortal(
      <EmergencyModal open={emergencyOpen} onClose={() => setEmergencyOpen(false)} />,
      document.body
    )}
  </>
  )
}
