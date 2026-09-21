import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { StaffUser } from '../types'

// ─────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  session: Session | null
  supabaseUser: SupabaseUser | null
  /** The authenticated staff_users row */
  user: StaffUser | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signInAsDemoDriver: () => void
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

// ─────────────────────────────────────────────────────────────
//  Context
// ─────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ─────────────────────────────────────────────────────────────
//  Provider
// ─────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session,      setSession]      = useState<Session | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [user,         setUser]         = useState<StaffUser | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  // ── Fetch profile from staff_users ───────────────────────

  const fetchProfile = useCallback(async (uid: string) => {
    const { data, error: err } = await (supabase
      .from('staff_users') as any)
      .select('*')
      .eq('id', uid)
      .maybeSingle() as { data: StaffUser | null; error: unknown }

    if (err || !data) {
      setError('Could not load your profile. Contact your administrator.')
      return
    }

    if (!data.is_active) {
      setError('Your account is inactive. Contact your administrator.')
      await supabase.auth.signOut()
      return
    }

    setUser(data)
    setError(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (supabaseUser) await fetchProfile(supabaseUser.id)
  }, [supabaseUser, fetchProfile])

  // ── Bootstrap session on mount ────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s)
      setSupabaseUser(s?.user ?? null)
      if (s?.user) await fetchProfile(s.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s)
        setSupabaseUser(s?.user ?? null)
        if (s?.user) {
          await fetchProfile(s.user.id)
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  // ── Sign in ───────────────────────────────────────────────

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)

    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (signInErr) {
      setError(signInErr.message)
      setLoading(false)
      return
    }

    if (data.user) await fetchProfile(data.user.id)
    setLoading(false)
  }, [fetchProfile])

  // ── Sign out ──────────────────────────────────────────────

  const signOut = useCallback(async () => {
    // Log to audit_logs non-blocking
    if (user) {
      ;(supabase.from('audit_logs') as any)
        .insert({ username: user.email, action: 'LOGOUT', module: 'driver_app' })
        .then(() => {/* silent */})
        .catch(() => {/* silent */})
    }

    await supabase.auth.signOut()
    setSession(null)
    setSupabaseUser(null)
    setUser(null)
    setError(null)
  }, [user])

  const signInAsDemoDriver = useCallback(() => {
    const demoUser: StaffUser = {
      id: 'demo-driver-uuid',
      full_name: 'Juan Dela Cruz (Driver)',
      email: 'driver@commutai.com',
      role: 'conductor',
      is_active: true,
      bus_id: 'bus-omanfortsco-001',
      created_at: new Date().toISOString(),
    }
    const demoSession = {
      user: { id: 'demo-driver-uuid', email: 'driver@commutai.com' },
      access_token: 'demo-token',
    } as any

    setSession(demoSession)
    setSupabaseUser(demoSession.user)
    setUser(demoUser)
    setError(null)
    setLoading(false)
  }, [])

  // ─────────────────────────────────────────────────────────

  const value: AuthContextValue = {
    session, supabaseUser, user,
    loading, error,
    signIn, signInAsDemoDriver, signOut, refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─────────────────────────────────────────────────────────────
//  Hook
// ─────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
