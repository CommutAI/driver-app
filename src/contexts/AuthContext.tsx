import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import bcrypt from 'bcryptjs'
import { supabase } from '../lib/supabase'
import type { StaffUser } from '../types'

// ─────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** The authenticated staff_users row */
  user: StaffUser | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
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
  const [user,         setUser]         = useState<StaffUser | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  // ── Fetch profile from staff_users by email ─────────────────

  const fetchProfileByEmail = useCallback(async (email: string) => {
    const { data, error: err } = await (supabase
      .from('staff_users') as any)
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle() as { data: StaffUser | null; error: unknown }

    if (err || !data) {
      setError('Invalid email or password')
      return null
    }

    if (!data.is_active) {
      setError('Your account is inactive. Contact your administrator.')
      return null
    }

    // Only drivers can access the driver app
    if (data.role !== 'driver') {
      setError('Access denied. Only drivers can access this application.')
      return null
    }

    return data
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      const refreshed = await fetchProfileByEmail(user.email)
      if (refreshed) setUser(refreshed)
    }
  }, [user, fetchProfileByEmail])

  // ── Check for existing session on mount ───────────────────

  useEffect(() => {
    const savedUser = localStorage.getItem('driver_app_user')
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        // Verify user is still active in database
        fetchProfileByEmail(parsedUser.email).then((profile) => {
          if (profile) {
            setUser(profile)
          } else {
            localStorage.removeItem('driver_app_user')
          }
          setLoading(false)
        })
      } catch {
        localStorage.removeItem('driver_app_user')
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [fetchProfileByEmail])

  // ── Sign in with custom bcrypt authentication ─────────────

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)

    const profile = await fetchProfileByEmail(email)
    if (!profile) {
      setLoading(false)
      return
    }

    // Verify password using bcrypt
    if (!profile.password) {
      setError('Account not properly configured. Contact administrator.')
      setLoading(false)
      return
    }

    const passwordMatch = await bcrypt.compare(password, profile.password)
    if (!passwordMatch) {
      setError('Invalid email or password')
      setLoading(false)
      return
    }

    // Success - save to state and localStorage
    setUser(profile)
    localStorage.setItem('driver_app_user', JSON.stringify(profile))
    setError(null)
    setLoading(false)
  }, [fetchProfileByEmail])

  // ── Sign out ──────────────────────────────────────────────

  const signOut = useCallback(async () => {
    // Log to audit_logs non-blocking
    if (user) {
      ;(supabase.from('audit_logs') as any)
        .insert({ username: user.email, action: 'LOGOUT', module: 'driver_app' })
        .then(() => {/* silent */})
        .catch(() => {/* silent */})
    }

    setUser(null)
    localStorage.removeItem('driver_app_user')
    setError(null)
  }, [user])

  // ─────────────────────────────────────────────────────────

  const value: AuthContextValue = {
    user,
    loading, error,
    signIn, signOut, refreshProfile,
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
