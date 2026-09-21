import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  StopCircle,
  Clock,
  User,
  Bus,
  Satellite,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ArrowRight,
  Gauge,
  Copy,
  Check,
  RefreshCw,
  Compass,
  Radio,
} from 'lucide-react'

import { useAuth } from '../contexts/AuthContext'
import { useActiveTrip } from '../hooks/useActiveTrip'
import { useAssignedBus } from '../hooks/useAssignedBus'
import { useDriverGPS } from '../hooks/useDriverGPS'
import { useOccupancy } from '../hooks/useOccupancy'
import { supabase } from '../lib/supabase'
import SectionHeader from '../components/ui/SectionHeader'
import ConfirmModal from '../components/trip/ConfirmModal'

// ─── Helpers ─────────────────────────────────────────────────

function tripLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function routeParts(route: string | undefined): { origin: string; destination: string } {
  if (!route) return { origin: 'Manolo Fortich Terminal', destination: 'Agora Terminal, CDO' }
  const parts = route.split(/[↔→\-–]/).map((s) => s.trim()).filter(Boolean)
  if (parts.length >= 2) return { origin: parts[0], destination: parts[parts.length - 1] }
  return { origin: route, destination: route }
}

function formatElapsed(startedAt?: string | null, _now?: number): string {
  if (!startedAt) return '—'
  try {
    const diff = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000))
    if (diff < 60) return `${diff} min`
    const hours = Math.floor(diff / 60)
    const mins = diff % 60
    return `${hours}h ${mins}m`
  } catch {
    return '—'
  }
}

// ─── Component ───────────────────────────────────────────────

export default function TripPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { trip, loading, error, refetch } = useActiveTrip()
  const { bus } = useAssignedBus()

  // High-accuracy live driver GPS (hardware geolocation, speed, heading, accuracy)
  const {
    location,
    speed,
    accuracy,
    gpsStatus,
    source,
    refetch: refetchGps,
  } = useDriverGPS(trip?.id)

  const busCapacity = bus?.seat_capacity ?? 35
  const { occupancy } = useOccupancy(trip?.id, busCapacity)

  const [showEnd, setShowEnd] = useState(false)
  const [acting, setActing] = useState(false)
  const [actErr, setActErr] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState(false)
  const [copiedGps, setCopiedGps] = useState(false)
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  // Ticker for live duration counter
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(timer)
  }, [])

  // Manual refresh handler
  const handleManualRefresh = async () => {
    setIsManualRefreshing(true)
    try {
      await Promise.all([refetch(), refetchGps()])
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 500)
    }
  }

  // Copy helper
  const handleCopy = (text: string, type: 'id' | 'gps') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      if (type === 'id') {
        setCopiedId(true)
        setTimeout(() => setCopiedId(false), 2000)
      } else {
        setCopiedGps(true)
        setTimeout(() => setCopiedGps(false), 2000)
      }
    }
  }

  // End trip action
  async function handleEndTrip() {
    if (!trip || !user) return
    setActing(true)
    setActErr(null)

    const timestamp = new Date().toISOString()
    const { error: err } = await (supabase.from('trips') as any)
      .update({
        status: 'completed',
        ended_at: timestamp,
        current_lat: location?.latitude ?? null,
        current_lng: location?.longitude ?? null,
        gps_updated_at: location ? timestamp : null,
      })
      .eq('id', trip.id)

    if (err) {
      setActErr((err as any).message)
    } else {
      ;(supabase.from('audit_logs') as any)
        .insert({
          username: user.email,
          action: 'UPDATE',
          module: 'driver_app_trip',
          details: `Trip ended: ${trip.id}, final pax: ${occupancy.ai_count || occupancy.scan_count || 0}`,
        })
        .then(() => {})
        .catch(() => {})

      setSuccessMsg('Trip completed successfully!')
      refetch()
    }
    setActing(false)
    setShowEnd(false)
  }

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(249, 115, 22, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid rgba(249, 115, 22, 0.3)',
          }}
        >
          <Loader2 size={28} color="var(--color-primary)" style={{ animation: 'spin 0.8s linear infinite' }} />
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
          Synchronizing active trip data...
        </p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div style={{ paddingTop: 40, textAlign: 'center', padding: '0 20px' }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            border: '1.5px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <AlertCircle size={32} color="var(--color-danger)" />
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>
          Unable to Load Trip
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0 0 18px' }}>{error}</p>
        <button
          type="button"
          onClick={() => refetch()}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            color: '#FFFFFF',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Retry Connection
        </button>
      </div>
    )
  }

  const canEnd = trip?.status === 'in_progress'
  const defaultRouteParts = routeParts(trip?.bus?.route ?? bus?.route)
  const origin = trip?.starting_point || defaultRouteParts.origin
  const destination = trip?.end_point || defaultRouteParts.destination
  const elapsedStr = formatElapsed(trip?.started_at, now)
  const currentPax = occupancy.ai_count || occupancy.scan_count || 0
  const occupancyPct = Math.min(100, Math.round((currentPax / busCapacity) * 100))
  const seatsAvailable = Math.max(0, busCapacity - currentPax)

  // Early return if no trip - show empty state
  if (!trip) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No active trip. Start a trip from the dashboard.</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 30 }}
    >
      {/* ── Top Section Header with Refresh Action ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionHeader title="Active Trip" subtitle="Journey status & real-time telemetry" light />
        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isManualRefreshing}
          title="Refresh trip information"
          aria-label="Refresh trip information"
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.2s ease',
          }}
        >
          <RefreshCw
            size={16}
            style={{ animation: isManualRefreshing ? 'spin 0.8s linear infinite' : 'none' }}
          />
        </button>
      </div>

      {/* ── Feedback Banners ── */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              color: '#4ADE80',
              fontSize: '0.88rem',
              fontWeight: 700,
            }}
          >
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </motion.div>
        )}
        {actErr && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              color: '#F87171',
              fontSize: '0.88rem',
              fontWeight: 700,
            }}
          >
            <XCircle size={18} />
            <span>{actErr}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ACTIVE JOURNEY CORRIDOR HERO CARD ── */}
      {trip && (
      <div
        style={{
          background: 'linear-gradient(145deg, rgba(30, 35, 50, 0.95), rgba(15, 17, 23, 0.98))',
          border: '1.5px solid rgba(249, 115, 22, 0.28)',
          borderRadius: 22,
          padding: '20px 18px',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(249, 115, 22, 0.15)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
            {/* Ambient Background Gradient Accent */}
            <div
              style={{
                position: 'absolute',
                top: -60,
                right: -60,
                width: 160,
                height: 160,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(249, 115, 22, 0.22) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            {/* Header row: Status badge + Live Elapsed Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 12px',
                    borderRadius: 99,
                    background:
                      trip.status === 'in_progress'
                        ? 'rgba(34, 197, 94, 0.15)'
                        : trip.status === 'cancelled'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(255, 255, 255, 0.08)',
                    border:
                      trip.status === 'in_progress'
                        ? '1px solid rgba(34, 197, 94, 0.35)'
                        : trip.status === 'cancelled'
                        ? '1px solid rgba(239, 68, 68, 0.35)'
                        : '1px solid rgba(255, 255, 255, 0.15)',
                    color:
                      trip.status === 'in_progress'
                        ? '#4ADE80'
                        : trip.status === 'cancelled'
                        ? '#F87171'
                        : '#9CA3AF',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      backgroundColor:
                        trip.status === 'in_progress' ? '#22C55E' : trip.status === 'cancelled' ? '#EF4444' : '#9CA3AF',
                      boxShadow: trip.status === 'in_progress' ? '0 0 8px #22C55E' : 'none',
                    }}
                  />
                  <span>{tripLabel(trip.status)}</span>
                </span>

                {trip.status === 'in_progress' && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: 99,
                      background: 'rgba(249, 115, 22, 0.12)',
                      border: '1px solid rgba(249, 115, 22, 0.25)',
                      color: 'var(--color-primary-light)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    <Clock size={12} />
                    <span>{elapsedStr} on road</span>
                  </span>
                )}
              </div>

              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontFamily: 'monospace',
                }}
              >
                {bus?.bus_number ?? 'BUS-001'}
              </span>
            </div>

            {/* Visual Route Corridor Track */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'rgba(15, 17, 23, 0.7)',
                padding: '14px 16px',
                borderRadius: 16,
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {/* Origin Terminal */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: 'rgba(255, 255, 255, 0.5)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Origin
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '0.98rem',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={origin}
                >
                  {origin}
                </div>
              </div>

              {/* Connecting Transit Vector */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  width: 54,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'rgba(249, 115, 22, 0.18)',
                    border: '1px solid rgba(249, 115, 22, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#F97316',
                    marginBottom: 2,
                  }}
                >
                  <Bus size={14} />
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 2,
                    background: 'linear-gradient(90deg, #22C55E 0%, #F97316 50%, #EF4444 100%)',
                    borderRadius: 2,
                  }}
                />
              </div>

              {/* Destination Terminal */}
              <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 5,
                    marginBottom: 3,
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: 'rgba(255, 255, 255, 0.5)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Destination
                  </span>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
                </div>
                <div
                  style={{
                    fontSize: '0.98rem',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={destination}
                >
                  {destination}
                </div>
              </div>
            </div>

            {/* Route Subtitle Tag */}
            <div
              style={{
                marginTop: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.78rem',
                color: 'rgba(255, 255, 255, 0.7)',
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Radio size={14} color="#F97316" />
                <span>Corridor: {trip.bus?.route ?? bus?.route ?? 'Sayre Highway Corridor'}</span>
              </div>
              <span style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Direct Highway Express</span>
            </div>

            {/* ── PRIMARY CTA: TURN-BY-TURN NAVIGATION LAUNCHER ── */}
            {trip.status === 'in_progress' && (
              <motion.button
              type="button"
              onClick={() => navigate('/navigation')}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                padding: '16px 18px',
                borderRadius: 18,
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                border: '1.5px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 10px 30px rgba(249, 115, 22, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.2) inset',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <Compass size={24} strokeWidth={2.4} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '1.02rem',
                      fontWeight: 900,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                    }}
                  >
                    LAUNCH TURN-BY-TURN NAVIGATION
                  </div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 0.85)',
                      marginTop: 2,
                    }}
                  >
                    Live GPS, maneuver arrow guidance & lane alerts
                  </div>
                </div>
              </div>

              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ArrowRight size={18} strokeWidth={2.8} />
              </div>
            </motion.button>
            )}

            {/* ── LIVE TELEMETRY & QUICK METRICS (4 CARDS GRID) ── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
              }}
            >
            {/* Metric 1: GPS Health & Accuracy */}
            <div
              style={{
                background: 'rgba(26, 29, 39, 0.85)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 16,
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  GPS Telemetry
                </span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background:
                      gpsStatus === 'connected'
                        ? 'rgba(34, 197, 94, 0.15)'
                        : gpsStatus === 'poor'
                        ? 'rgba(250, 204, 21, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color:
                      gpsStatus === 'connected'
                        ? '#22C55E'
                        : gpsStatus === 'poor'
                        ? '#FACC15'
                        : '#EF4444',
                  }}
                >
                  <Satellite size={16} />
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 900,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background:
                        gpsStatus === 'connected'
                          ? '#22C55E'
                          : gpsStatus === 'poor'
                          ? '#FACC15'
                          : '#EF4444',
                      boxShadow: gpsStatus === 'connected' ? '0 0 8px #22C55E' : 'none',
                    }}
                  />
                  <span>
                    {gpsStatus === 'connected'
                      ? accuracy != null
                        ? `Live ±${Math.round(accuracy)}m`
                        : 'GPS Active'
                      : gpsStatus === 'poor'
                      ? 'Weak Signal'
                      : 'Offline'}
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {source === 'device'
                    ? 'Device Hardware GPS'
                    : source === 'fastapi'
                    ? 'FastAPI Gateway'
                    : 'Realtime Cloud'}
                </div>
              </div>
            </div>

            {/* Metric 2: Passenger Occupancy */}
            <div
              style={{
                background: 'rgba(26, 29, 39, 0.85)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 16,
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Passenger Load
                </span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'rgba(192, 132, 252, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#C084FC',
                  }}
                >
                  <Users size={16} />
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 900,
                    color: '#FFFFFF',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {currentPax}{' '}
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                    / {busCapacity} seats
                  </span>
                </div>
                {/* Mini Occupancy Bar */}
                <div
                  style={{
                    width: '100%',
                    height: 4,
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 2,
                    marginTop: 6,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${occupancyPct}%`,
                      height: '100%',
                      background:
                        occupancyPct >= 95
                          ? '#EF4444'
                          : occupancyPct >= 80
                          ? '#FACC15'
                          : '#22C55E',
                      borderRadius: 2,
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                  {seatsAvailable > 0 ? `${seatsAvailable} available` : 'Full bus'}
                </div>
              </div>
            </div>

            {/* Metric 3: Departure Clock */}
            <div
              style={{
                background: 'rgba(26, 29, 39, 0.85)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 16,
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Departure Time
                </span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'rgba(59, 130, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#60A5FA',
                  }}
                >
                  <Clock size={16} />
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 900,
                    color: '#FFFFFF',
                  }}
                >
                  {trip.started_at ? format(new Date(trip.started_at), 'h:mm a') : '—'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {trip.started_at ? format(new Date(trip.started_at), 'MMM d, yyyy') : 'No start timestamp'}
                </div>
              </div>
            </div>

            {/* Metric 4: Live Speed */}
            <div
              style={{
                background: 'rgba(26, 29, 39, 0.85)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 16,
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Speedometer
                </span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'rgba(249, 115, 22, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#F97316',
                  }}
                >
                  <Gauge size={16} />
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 900,
                    color: '#FFFFFF',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {Math.round(speed || 0)}{' '}
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>km/h</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {speed > 5 ? 'Vehicle moving' : 'Stopped / Station'}
                </div>
              </div>
            </div>
            </div>

            {/* ── DETAILED SPECIFICATIONS & DISPATCH RECORDS ── */}
            <div
              style={{
                background: 'rgba(26, 29, 39, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 20,
              padding: '20px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.03em' }}>
                TRIP & VEHICLE SPECIFICATIONS
              </div>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'var(--color-primary-light)',
                  background: 'rgba(249, 115, 22, 0.12)',
                  padding: '3px 8px',
                  borderRadius: 6,
                }}
              >
                Verified Fleet Unit
              </span>
            </div>

            {/* Rows Container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Trip ID */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'rgba(15, 17, 23, 0.6)',
                  borderRadius: 12,
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Trip ID</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#FFFFFF', fontWeight: 700 }}>
                    {trip.id.slice(0, 14)}…
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(trip.id, 'id')}
                    title="Copy full Trip ID"
                    aria-label="Copy full Trip ID"
                    style={{
                      background: copiedId ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: 6,
                      color: copiedId ? '#22C55E' : 'rgba(255, 255, 255, 0.7)',
                      padding: '4px 6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}
                  >
                    {copiedId ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedId ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Bus Assignment */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'rgba(15, 17, 23, 0.6)',
                  borderRadius: 12,
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                  Assigned Vehicle
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: 'rgba(249, 115, 22, 0.15)',
                      border: '1px solid rgba(249, 115, 22, 0.3)',
                      color: '#F97316',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                    }}
                  >
                    {bus?.bus_number ?? 'BUS-001'}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#FFFFFF', fontWeight: 700 }}>
                    {trip.bus?.plate_number ?? bus?.plate_number ?? 'ABC-1234'}
                  </span>
                </div>
              </div>

              {/* Driver on Duty */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'rgba(15, 17, 23, 0.6)',
                  borderRadius: 12,
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                  Driver on Duty
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(255, 255, 255, 0.8)',
                    }}
                  >
                    <User size={12} />
                  </div>
                  <span style={{ fontSize: '0.84rem', color: '#FFFFFF', fontWeight: 700 }}>
                    {user?.full_name || user?.email?.split('@')[0] || 'driver01'}
                  </span>
                </div>
              </div>

              {/* Current GPS Coordinates */}
              {location && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'rgba(15, 17, 23, 0.6)',
                    borderRadius: 12,
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    Live GPS Position
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#38BDF8', fontWeight: 700 }}>
                      {Number(location.latitude).toFixed(4)}°, {Number(location.longitude).toFixed(4)}°
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(`${Number(location.latitude).toFixed(5)}, ${Number(location.longitude).toFixed(5)}`, 'gps')
                      }
                      title="Copy coordinates"
                      aria-label="Copy coordinates"
                      style={{
                        background: copiedGps ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: 6,
                        color: copiedGps ? '#22C55E' : 'rgba(255, 255, 255, 0.7)',
                        padding: '4px 6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                      }}
                    >
                      {copiedGps ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedGps ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>

            {/* ── TRIP ACTIONS (END TRIP) ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 6 }}>
              {canEnd && (
                <motion.button
                  type="button"
                  onClick={() => {
                    setSuccessMsg(null)
                    setShowEnd(true)
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  border: '1.5px solid rgba(255, 255, 255, 0.25)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  fontSize: '1.05rem',
                  fontWeight: 900,
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
                }}
              >
                <StopCircle size={22} strokeWidth={2.5} />
                <span>COMPLETE & END TRIP</span>
              </motion.button>
            )}

            {trip.status === 'completed' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '18px',
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: 16,
                  color: '#4ADE80',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                }}
              >
                <CheckCircle2 size={20} />
                <span>Trip has been completed successfully.</span>
              </div>
            )}

            {trip.status === 'cancelled' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '18px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 16,
                  color: '#F87171',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                }}
              >
                <XCircle size={20} />
                <span>This journey was cancelled by dispatch.</span>
              </div>
            )}
            </div>
            </div>
            )}

            {/* ── CONFIRM END TRIP MODAL ── */}
            <ConfirmModal
              open={showEnd}
              title="Complete Trip"
              confirmLabel="CONFIRM END TRIP"
              confirmVariant="danger"
              loading={acting}
              onConfirm={handleEndTrip}
              onCancel={() => setShowEnd(false)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Are you sure you want to complete this journey? This will finalize all passenger counts, close GPS logging,
                  and report the bus ready for next dispatch.
                </p>

                <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 14,
              padding: '14px 16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Route Corridor:</span>
                <span style={{ fontSize: '0.85rem', color: '#FFFFFF', fontWeight: 800 }}>
                  {origin} → {destination}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Trip Duration:</span>
                <span style={{ fontSize: '0.85rem', color: '#FFFFFF', fontWeight: 800 }}>{elapsedStr}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Final Passengers:</span>
                <span style={{ fontSize: '0.85rem', color: '#4ADE80', fontWeight: 800 }}>
                  {currentPax} Passengers
                </span>
              </div>
            </div>

            <p
              style={{
                margin: 0,
                color: '#F87171',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            >
              <AlertCircle size={15} />
              <span>This action cannot be undone once confirmed.</span>
            </p>
          </div>
        </ConfirmModal>
      </motion.div>
    )
  }
