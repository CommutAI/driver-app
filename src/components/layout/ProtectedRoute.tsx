import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Loader2 } from 'lucide-react'
import InteractiveBackground from './InteractiveBackground'
import Logo from '../Logo'

export default function ProtectedRoute() {
  const { session, loading, user } = useAuth()

  if (loading) {
    return (
      <>
        <InteractiveBackground />
        <div
          style={{
            position: 'relative', zIndex: 1,
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          <Logo size="lg" style={{ marginBottom: 8 }} />
          <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            CommutAI
          </p>
          <Loader2 size={28} color="var(--color-primary)" style={{ animation: 'spin 0.8s linear infinite' }} />
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
            Loading your session…
          </p>
        </div>
      </>
    )
  }

  if (!session || !user) return <Navigate to="/login" replace />
  // Any active staff member can use the driver app
  if (!user.is_active) return <Navigate to="/login" replace />

  return <Outlet />
}
