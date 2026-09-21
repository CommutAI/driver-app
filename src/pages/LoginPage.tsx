import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import InteractiveBackground from '../components/layout/InteractiveBackground'
import Logo          from '../components/Logo'
import ModernInput   from '../components/ui/ModernInput'
import PrimaryButton from '../components/ui/PrimaryButton'

export default function LoginPage() {
  const { signIn, session, loading, error } = useAuth()

  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (session && !loading) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    await signIn(email, password)
    setSubmitting(false)
  }

  const busy = loading || submitting

  return (
    <>
      <InteractiveBackground />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 20px',
        }}
      >
        {/* ── Brand mark ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{ textAlign: 'center', marginBottom: 32 }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <Logo size="xl" style={{ filter: 'drop-shadow(0 8px 24px rgba(249,115,22,0.4))' }} />
          </div>

          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 900,
              margin: '0 0 4px',
              color: '#ffffff',
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}
          >
            CommutAI
          </h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>
            Driver Portal
          </p>
        </motion.div>

        {/* ── Login card ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          style={{ width: '100%', maxWidth: 400 }}
        >
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--card-radius)',
              padding: '28px 24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
          >
            <h2
              style={{
                margin: '0 0 4px',
                fontSize: '1.3rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              Welcome back
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Sign in to start your shift
            </p>

            {/* Error banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'var(--color-danger-subtle)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  marginBottom: 20,
                  color: '#F87171',
                  fontSize: '0.88rem',
                  fontWeight: 500,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <ModernInput
                label="Email Address"
                type="email"
                icon={Mail}
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                disabled={busy}
              />
              <ModernInput
                label="Password"
                type="password"
                icon={Lock}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={busy}
              />

              <PrimaryButton
                type="submit"
                variant="primary"
                fullWidth
                loading={busy}
                disabled={!email || !password}
              >
                {busy ? 'Signing in…' : 'Sign In'}
              </PrimaryButton>
            </form>

            <p
              style={{
                textAlign: 'center',
                marginTop: 20,
                fontSize: '0.7rem',
                color: 'var(--text-tertiary)',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              OMANFORTSCO · Authorized Drivers Only
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <p style={{ marginTop: 24, fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>
          © {new Date().getFullYear()} OMANFORTSCO · CommutAI v1.0
        </p>
      </div>
    </>
  )
}
