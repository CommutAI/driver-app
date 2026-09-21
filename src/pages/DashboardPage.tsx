import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Play, Loader2, CheckCircle2, Bus, AlertTriangle,
  ArrowRight, Compass, Satellite, Users, Check,
  History, ChevronRight, MapPin,
} from 'lucide-react'
import { format, formatDuration, intervalToDuration } from 'date-fns'

import { useAuth }        from '../contexts/AuthContext'
import { useActiveTrip }  from '../hooks/useActiveTrip'
import { useAssignedBus } from '../hooks/useAssignedBus'
import { useDriverGPS }   from '../hooks/useDriverGPS'
import { useRouteStops }  from '../hooks/useRouteStops'
import { useNavigationRoute } from '../hooks/useNavigationRoute'
import { useRouteProgress }   from '../hooks/useRouteProgress'
import { supabase }       from '../lib/supabase'
import { DEFAULT_ORIGIN, DEFAULT_DESTINATION } from '../services/routingService'
import type { Coordinates, Trip } from '../types'
import RouteMap           from '../components/route/RouteMap'
import SoftCard           from '../components/ui/SoftCard'
import StatusBadge        from '../components/ui/StatusBadge'
import EmergencyModal     from '../components/emergency/EmergencyModal'
import DashboardTurnByTurnCard from '../components/navigation/DashboardTurnByTurnCard'

// ─── Helpers ────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function firstName(name?: string) { return name?.split(' ')[0] ?? 'Driver' }

function tripDuration(start?: string | null, end?: string | null): string {
  if (!start || !end) return '—'
  const dur = intervalToDuration({ start: new Date(start), end: new Date(end) })
  return formatDuration(dur, { format: ['hours', 'minutes'] }) || '< 1 min'
}

function routeParts(route: string | undefined) {
  if (!route) return { origin: 'Manolo Fortich Terminal', destination: 'Agora Terminal' }
  const parts = route.split(/[↔→\-–]/).map(s => s.trim()).filter(Boolean)
  if (parts.length >= 2) return { origin: parts[0], destination: parts[parts.length - 1] }
  return { origin: route, destination: route }
}

// Available terminals for custom route selection
const AVAILABLE_TERMINALS = [
  'Manolo Fortich Terminal',
  'Agora Terminal, CDO',
  'Cagayan de Oro City Hall',
  'Limketkai Center',
  'SM City Cagayan de Oro',
  'Centrio Mall',
  'Bukidnon Provincial Capitol',
  'Valencia City Terminal',
  'Maramag Terminal',
  'Don Carlos Terminal',
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { trip, loading: tripLoading, refetch: refetchTrip } = useActiveTrip()
  const { bus } = useAssignedBus()

  // Route selection state (persisted across sessions and navigation)
  const [selectedRoute, setSelectedRoute] = useState<string>(() => {
    return localStorage.getItem('driver_selected_route') || 'manolo_fortich'
  })
  const [customOrigin, setCustomOrigin] = useState<string>('')
  const [customDestination, setCustomDestination] = useState<string>('')
  const [showCustomRoute, setShowCustomRoute] = useState(false)
  const [startingTrip, setStartingTrip] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(() => new Date())

  // Recent trips on homepage
  const [recentTrips, setRecentTrips] = useState<Trip[]>([])
  const [recentLoading, setRecentLoading] = useState(false)

  // Live clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleRouteChange = (newRoute: string) => {
    setSelectedRoute(newRoute)
    localStorage.setItem('driver_selected_route', newRoute)
  }

  // Determine whether Agora -> Manolo is active
  const isAgoraToManolo = useMemo(() => {
    if (trip?.starting_point) {
      return trip.starting_point.toLowerCase().includes('agora')
    }
    if (selectedRoute === 'agora') return true
    if (selectedRoute === 'manolo_fortich') return false
    const routeText = (trip?.bus as any)?.route ?? bus?.route ?? ''
    const lower = routeText.toLowerCase()
    return lower.includes('agora → manolo') || lower.includes('agora - manolo') || lower.includes('agora to manolo')
  }, [selectedRoute, trip, bus])

  const effectiveRouteText = isAgoraToManolo
    ? 'Agora → Manolo Fortich'
    : 'Manolo Fortich → Agora'

  // Route stops reversed dynamically when Agora -> Manolo
  const { stops } = useRouteStops(effectiveRouteText)

  // Live GPS tracking from hardware + backend
  const {
    location,
    speed,
    accuracy,
    gpsStatus,
  } = useDriverGPS(trip?.id)

  // Fetch recent trips for driver
  const fetchRecentTrips = useCallback(async () => {
    if (!user) return
    setRecentLoading(true)
    try {
      if (user.id === 'demo-driver-uuid') {
        const now = Date.now()
        setRecentTrips([
          {
            id: 'demo-recent-001',
            bus_id: 'bus-omanfortsco-001',
            conductor_id: user.id,
            driver_id: user.id,
            starting_point: 'Agora Terminal',
            end_point: 'Manolo Fortich Terminal',
            status: 'completed',
            started_at: new Date(now - 3600000 * 2.5).toISOString(),
            ended_at: new Date(now - 3600000 * 1.8).toISOString(),
            current_lat: 8.3663,
            current_lng: 124.8650,
            gps_updated_at: new Date(now - 3600000 * 1.8).toISOString(),
            bus: {
              id: 'bus-omanfortsco-001',
              plate_number: 'OMANFORTSCO-01',
              bus_number: 1,
              route: 'Agora Terminal → Manolo Fortich Terminal',
              seat_capacity: 31,
              status: 'active',
              created_at: new Date().toISOString(),
            },
          },
          {
            id: 'demo-recent-002',
            bus_id: 'bus-omanfortsco-001',
            conductor_id: user.id,
            driver_id: user.id,
            starting_point: 'Manolo Fortich Terminal',
            end_point: 'Agora Terminal',
            status: 'completed',
            started_at: new Date(now - 3600000 * 6).toISOString(),
            ended_at: new Date(now - 3600000 * 5.2).toISOString(),
            current_lat: 8.4852,
            current_lng: 124.6567,
            gps_updated_at: new Date(now - 3600000 * 5.2).toISOString(),
            bus: {
              id: 'bus-omanfortsco-001',
              plate_number: 'OMANFORTSCO-01',
              bus_number: 1,
              route: 'Manolo Fortich Terminal → Agora Terminal',
              seat_capacity: 31,
              status: 'active',
              created_at: new Date().toISOString(),
            },
          },
        ])
        setRecentLoading(false)
        return
      }

      const { data } = await (supabase
        .from('trips') as any)
        .select('*, bus:buses(*)')
        .or(`conductor_id.eq.${user.id},driver_id.eq.${user.id}`)
        .in('status', ['completed', 'cancelled'])
        .order('started_at', { ascending: false })
        .limit(3) as { data: Trip[] | null }

      setRecentTrips(data ?? [])
    } catch (err) {
      console.error('Error loading recent trips:', err)
    } finally {
      setRecentLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!trip) {
      fetchRecentTrips()
    }
  }, [trip, fetchRecentTrips])

  // Destination coordinates:
  // When Agora -> Manolo Fortich: destination is Manolo Fortich Terminal (DEFAULT_ORIGIN)
  // When Manolo Fortich -> Agora: destination is Agora Terminal (DEFAULT_DESTINATION)
  const destination = useMemo<Coordinates>(() => {
    return isAgoraToManolo ? DEFAULT_ORIGIN : DEFAULT_DESTINATION
  }, [isAgoraToManolo])

  const destinationTitle = useMemo(() => {
    return isAgoraToManolo ? 'Manolo Fortich Terminal' : 'Agora Terminal, CDO'
  }, [isAgoraToManolo])

  const currentCoords = useMemo<Coordinates | null>(() => {
    if (location && typeof location.latitude === 'number' && typeof location.longitude === 'number') {
      return { latitude: Number(location.latitude), longitude: Number(location.longitude) }
    }
    return null
  }, [location])

  // Route calculation hook from current position to active destination
  const {
    route,
    isCalculating,
  } = useNavigationRoute(currentCoords || (isAgoraToManolo ? DEFAULT_DESTINATION : DEFAULT_ORIGIN), destination)

  // Turn-by-turn progress & maneuvers hook
  const {
    progress,
    currentStep,
    nextStep,
    distanceToNextManeuver,
    currentRoadName,
  } = useRouteProgress(route, currentCoords, speed)

  async function handleStartTrip() {
    if (!user || !bus) return
    setStartingTrip(true)
    setError(null)

    if (user.id === 'demo-driver-uuid') {
      refetchTrip()
      setStartingTrip(false)
      navigate('/navigation')
      return
    }

    const now = new Date().toISOString()
    let startingPoint: string
    let endPoint: string

    // Use custom route if specified, otherwise use preset
    if (showCustomRoute && customOrigin && customDestination) {
      startingPoint = customOrigin
      endPoint = customDestination
    } else {
      startingPoint = isAgoraToManolo ? 'Agora Terminal' : 'Manolo Fortich Terminal'
      endPoint = isAgoraToManolo ? 'Manolo Fortich Terminal' : 'Agora Terminal'
    }

    const { error: err } = await (supabase.from('trips') as any).insert({
      bus_id: bus.id,
      conductor_id: user.id,
      driver_id: user.id,
      starting_point: startingPoint,
      end_point: endPoint,
      status: 'in_progress',
      started_at: now,
      current_lat: location?.latitude ?? null,
      current_lng: location?.longitude ?? null,
      gps_updated_at: location ? now : null,
    })

    if (err) {
      setError((err as any).message)
    } else {
      refetchTrip()
      navigate('/navigation')
    }
    setStartingTrip(false)
  }

  if (tripLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
        <Loader2 size={32} color="var(--color-primary)" style={{ animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* ── Driver Cockpit Header (when no active trip) ── */}
      {!trip && (
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 18 }}
        >
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(26, 29, 39, 0.9), rgba(15, 17, 23, 0.95))',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 20,
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
            }}
          >
            {/* Top row: Avatar + Greeting + Time */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    background: 'var(--color-primary-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(249, 115, 22, 0.35)',
                    position: 'relative',
                  }}
                >
                  <Bus size={22} color="#ffffff" strokeWidth={2.4} />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: '#22C55E',
                      border: '2px solid #0F1117',
                    }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--color-primary-light)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Fleet Captain
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
                    <span style={{ fontSize: '0.72rem', color: '#4ADE80', fontWeight: 700 }}>
                      On Duty
                    </span>
                  </div>
                  <h1
                    style={{
                      margin: '2px 0 0',
                      fontSize: 'clamp(1.2rem, 3.5vw, 1.45rem)',
                      fontWeight: 900,
                      color: '#ffffff',
                      letterSpacing: '-0.03em',
                      lineHeight: 1.1,
                    }}
                  >
                    {greeting()}, {firstName(user?.full_name)}
                  </h1>
                </div>
              </div>

              {/* Real-time Clock */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
                  {format(currentTime, 'h:mm:ss a')}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                  {format(currentTime, 'EEE, MMM d')}
                </div>
              </div>
            </div>

            {/* Vehicle Assignment Status Strip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'rgba(249, 115, 22, 0.15)',
                    border: '1px solid rgba(249, 115, 22, 0.3)',
                    color: '#F97316',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                  }}
                >
                  {bus?.bus_number ? `BUS-${bus.bus_number}` : 'BUS-001'}
                </span>
                <span style={{ fontSize: '0.82rem', color: '#FFFFFF', fontWeight: 700 }}>
                  {bus?.plate_number ?? 'ABC-1234'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <Users size={14} color="var(--text-tertiary)" />
                <span>{bus?.seat_capacity ?? 35} Seater</span>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                <span style={{ color: '#4ADE80' }}>Ready for Dispatch</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Error message ── */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            background: 'var(--color-danger-subtle)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 'var(--radius-md)',
            color: '#F87171',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          {error}
        </motion.div>
      )}

      {/* ── No active trip - show start controls & recent history ── */}
      {!trip ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
        >
          {/* Main Trip Initialization Cockpit */}
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(26, 29, 39, 0.9), rgba(15, 17, 23, 0.95))',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 22,
              padding: '22px 20px',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  Select Trip Route
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Choose your active transit corridor direction
                </p>
              </div>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(249, 115, 22, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary)',
                  border: '1px solid rgba(249, 115, 22, 0.25)',
                }}
              >
                <Compass size={18} />
              </div>
            </div>

            {/* ── Visual Interactive Route Cards ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {/* Route Option 1: Manolo Fortich -> Agora */}
              <div
                onClick={() => handleRouteChange('manolo_fortich')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleRouteChange('manolo_fortich')}
                style={{
                  padding: '16px 16px',
                  borderRadius: 16,
                  cursor: 'pointer',
                  border: selectedRoute === 'manolo_fortich'
                    ? '2px solid #F97316'
                    : '1.5px solid rgba(255, 255, 255, 0.08)',
                  background: selectedRoute === 'manolo_fortich'
                    ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(15, 17, 23, 0.8) 100%)'
                    : 'rgba(15, 17, 23, 0.6)',
                  boxShadow: selectedRoute === 'manolo_fortich'
                    ? '0 6px 20px rgba(249, 115, 22, 0.25), 0 0 0 1px rgba(249, 115, 22, 0.2)'
                    : 'none',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: selectedRoute === 'manolo_fortich' ? '#F97316' : 'rgba(255, 255, 255, 0.1)',
                          color: '#FFFFFF',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Outbound • CDO Bound
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                        Sayre Highway Corridor
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FFFFFF', fontWeight: 800, fontSize: '0.98rem' }}>
                      <span style={{ color: '#4ADE80' }}>Manolo Fortich Terminal</span>
                      <ArrowRight size={14} color="rgba(255,255,255,0.4)" strokeWidth={2.5} />
                      <span style={{ color: '#F97316' }}>Agora Terminal</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span>~36.2 km</span>
                      <span>•</span>
                      <span>Est. 45 mins</span>
                      <span>•</span>
                      <span>16 Planned Stops</span>
                    </div>
                  </div>

                  {/* Radio Indicator */}
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      border: selectedRoute === 'manolo_fortich' ? '2px solid #F97316' : '2px solid rgba(255, 255, 255, 0.2)',
                      background: selectedRoute === 'manolo_fortich' ? '#F97316' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {selectedRoute === 'manolo_fortich' && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </div>
                </div>
              </div>

              {/* Route Option 2: Agora -> Manolo Fortich */}
              <div
                onClick={() => handleRouteChange('agora')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleRouteChange('agora')}
                style={{
                  padding: '16px 16px',
                  borderRadius: 16,
                  cursor: 'pointer',
                  border: selectedRoute === 'agora'
                    ? '2px solid #F97316'
                    : '1.5px solid rgba(255, 255, 255, 0.08)',
                  background: selectedRoute === 'agora'
                    ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(15, 17, 23, 0.8) 100%)'
                    : 'rgba(15, 17, 23, 0.6)',
                  boxShadow: selectedRoute === 'agora'
                    ? '0 6px 20px rgba(249, 115, 22, 0.25), 0 0 0 1px rgba(249, 115, 22, 0.2)'
                    : 'none',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: selectedRoute === 'agora' ? '#F97316' : 'rgba(255, 255, 255, 0.1)',
                          color: '#FFFFFF',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Inbound • Bukidnon Bound
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                        Sayre Highway Corridor
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FFFFFF', fontWeight: 800, fontSize: '0.98rem' }}>
                      <span style={{ color: '#4ADE80' }}>Agora Terminal</span>
                      <ArrowRight size={14} color="rgba(255,255,255,0.4)" strokeWidth={2.5} />
                      <span style={{ color: '#F97316' }}>Manolo Fortich Terminal</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span>~36.2 km</span>
                      <span>•</span>
                      <span>Est. 45 mins</span>
                      <span>•</span>
                      <span>16 Planned Stops</span>
                    </div>
                  </div>

                  {/* Radio Indicator */}
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      border: selectedRoute === 'agora' ? '2px solid #F97316' : '2px solid rgba(255, 255, 255, 0.2)',
                      background: selectedRoute === 'agora' ? '#F97316' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {selectedRoute === 'agora' && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Route Option */}
            <div
              onClick={() => setShowCustomRoute(!showCustomRoute)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setShowCustomRoute(!showCustomRoute)}
              style={{
                padding: '14px 16px',
                borderRadius: 14,
                cursor: 'pointer',
                border: showCustomRoute
                  ? '2px solid #F97316'
                  : '1.5px dashed rgba(255, 255, 255, 0.15)',
                background: showCustomRoute
                  ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.12) 0%, rgba(15, 17, 23, 0.8) 100%)'
                  : 'rgba(15, 17, 23, 0.4)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'rgba(249, 115, 22, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#F97316',
                  }}
                >
                  <MapPin size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#FFFFFF' }}>
                    Custom Route
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    Choose any origin and destination
                  </div>
                </div>
              </div>
              <ChevronRight
                size={18}
                color="rgba(255,255,255,0.4)"
                style={{
                  transform: showCustomRoute ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              />
            </div>

            {/* Custom Route Dropdown */}
            {showCustomRoute && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  padding: '16px',
                  borderRadius: 14,
                  background: 'rgba(15, 17, 23, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Origin (Starting Point)
                  </label>
                  <select
                    value={customOrigin}
                    onChange={(e) => setCustomOrigin(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Select origin...</option>
                    {AVAILABLE_TERMINALS.map((terminal) => (
                      <option key={terminal} value={terminal}>
                        {terminal}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Destination (Ending Point)
                  </label>
                  <select
                    value={customDestination}
                    onChange={(e) => setCustomDestination(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Select destination...</option>
                    {AVAILABLE_TERMINALS.map((terminal) => (
                      <option key={terminal} value={terminal}>
                        {terminal}
                      </option>
                    ))}
                  </select>
                </div>

                {customOrigin && customDestination && (
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: 'rgba(34, 197, 94, 0.12)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <CheckCircle2 size={16} color="#22C55E" />
                    <span style={{ fontSize: '0.8rem', color: '#4ADE80', fontWeight: 700 }}>
                      {customOrigin} → {customDestination}
                    </span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Pre-Trip Telemetry Readiness Check */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  padding: '10px 8px',
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  textAlign: 'center',
                }}
              >
                <Satellite size={16} color="#38BDF8" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  GPS Signal
                </div>
                <div style={{ fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 800, marginTop: 2 }}>
                  {gpsStatus === 'connected' ? `±${Math.round(accuracy || 10)}m` : 'Hardware GPS'}
                </div>
              </div>

              <div
                style={{
                  padding: '10px 8px',
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  textAlign: 'center',
                }}
              >
                <Users size={16} color="#4ADE80" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Capacity
                </div>
                <div style={{ fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 800, marginTop: 2 }}>
                  {bus?.seat_capacity ?? 35} Seats
                </div>
              </div>

              <div
                style={{
                  padding: '10px 8px',
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  textAlign: 'center',
                }}
              >
                <Compass size={16} color="#F97316" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Direction
                </div>
                <div style={{ fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 800, marginTop: 2 }}>
                  {showCustomRoute && customOrigin && customDestination
                    ? 'Custom'
                    : selectedRoute === 'agora' ? 'To Manolo' : 'To Agora'}
                </div>
              </div>
            </div>

            {/* Big Start Trip CTA Button */}
            <motion.button
              type="button"
              onClick={handleStartTrip}
              disabled={startingTrip || (showCustomRoute && (!customOrigin || !customDestination))}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: 16,
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '1.05rem',
                fontWeight: 900,
                letterSpacing: '0.02em',
                cursor: startingTrip || (showCustomRoute && (!customOrigin || !customDestination)) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 8px 24px rgba(249, 115, 22, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.15)',
                transition: 'all 0.2s ease',
                opacity: showCustomRoute && (!customOrigin || !customDestination) ? 0.5 : 1,
              }}
            >
              {startingTrip ? (
                <>
                  <Loader2 size={22} className="animate-spin" />
                  <span>INITIALIZING TRIP...</span>
                </>
              ) : (
                <>
                  <Play size={20} fill="#FFFFFF" />
                  <span>
                    {showCustomRoute && customOrigin && customDestination
                      ? `START: ${customOrigin} → ${customDestination}`
                      : 'START TRIP & NAVIGATION'}
                  </span>
                </>
              )}
            </motion.button>
          </div>

          {/* ── Recent Trip Activity Section (Directly on Homepage) ── */}
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(26, 29, 39, 0.75), rgba(15, 17, 23, 0.85))',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 20,
              padding: '18px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={18} color="var(--color-primary)" />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>
                  Recent Trip Activity
                </h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/history')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary-light)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: 0,
                }}
              >
                <span>View Full History</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {recentLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                <Loader2 size={24} color="var(--color-primary)" style={{ animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : recentTrips.length === 0 ? (
              <div
                style={{
                  padding: '20px 16px',
                  textAlign: 'center',
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed rgba(255, 255, 255, 0.08)',
                }}
              >
                <p style={{ margin: '0 0 4px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  No recent trips logged yet
                </p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  Start your first trip above to record live telemetry and history.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentTrips.map((rt) => {
                  const isDone = rt.status === 'completed'
                  const rBus = rt.bus as any
                  const defaultParts = routeParts(rBus?.route)
                  const origin = rt.starting_point || defaultParts.origin
                  const destination = rt.end_point || defaultParts.destination

                  return (
                    <div
                      key={rt.id}
                      onClick={() => navigate('/history')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && navigate('/history')}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 14,
                        background: 'rgba(15, 17, 23, 0.55)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        cursor: 'pointer',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            background: isDone ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            border: isDone ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                          }}
                        >
                          {isDone ? (
                            <CheckCircle2 size={16} color="#4ADE80" />
                          ) : (
                            <AlertTriangle size={16} color="#F87171" />
                          )}
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: '0.84rem',
                              fontWeight: 800,
                              color: '#FFFFFF',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <span style={{ color: '#4ADE80' }}>{origin.split(' ')[0]}</span>
                            <ArrowRight size={12} color="rgba(255,255,255,0.4)" />
                            <span style={{ color: '#F97316' }}>{destination.split(' ')[0]}</span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                            {format(new Date(rt.started_at), 'MMM d, h:mm a')} • {tripDuration(rt.started_at, rt.ended_at)}
                          </div>
                        </div>
                      </div>

                      <StatusBadge variant={isDone ? 'success' : 'danger'}>
                        {isDone ? 'Completed' : 'Cancelled'}
                      </StatusBadge>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        /* ── Active trip - show map and navigation ── */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Live Navigation Map Card */}
          <SoftCard padding={0} style={{ height: 'calc(100dvh - 160px)', minHeight: 450, position: 'relative', overflow: 'hidden' }}>
            <RouteMap
              stops={stops}
              busLocation={location}
              destinationTitle={destinationTitle}
              routeDirection={isAgoraToManolo ? 'agora_to_manolo' : 'manolo_to_agora'}
            />

            {/* Route Direction Switcher Pill on Map */}
            {!emergencyOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  left: 14,
                  zIndex: 1000,
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(15, 17, 23, 0.92)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 14,
                  padding: 3,
                  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.55)',
                  maxWidth: 'calc(100% - 100px)',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleRouteChange('manolo_fortich')}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 11,
                    border: 'none',
                    background: !isAgoraToManolo ? 'var(--color-primary-gradient)' : 'transparent',
                    color: !isAgoraToManolo ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    boxShadow: !isAgoraToManolo ? '0 2px 8px rgba(249, 115, 22, 0.4)' : 'none',
                  }}
                >
                  Manolo → Agora
                </button>
                <button
                  type="button"
                  onClick={() => handleRouteChange('agora')}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 11,
                    border: 'none',
                    background: isAgoraToManolo ? 'var(--color-primary-gradient)' : 'transparent',
                    color: isAgoraToManolo ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    boxShadow: isAgoraToManolo ? '0 2px 8px rgba(249, 115, 22, 0.4)' : 'none',
                  }}
                >
                  Agora → Manolo
                </button>
              </div>
            )}

            {/* Side Emergency SOS Button */}
            {!emergencyOpen && (
              <motion.button
                type="button"
                onClick={() => setEmergencyOpen(true)}
                whileTap={{ scale: 0.92 }}
                aria-label="Emergency SOS"
                title="Emergency SOS Alert"
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  zIndex: 1000,
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  border: '1.5px solid rgba(255, 255, 255, 0.3)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.55)',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  letterSpacing: '0.04em',
                  animation: 'emergency-pulse 2s ease-in-out infinite',
                }}
              >
                <span>SOS</span>
                <AlertTriangle size={18} strokeWidth={2.5} />
              </motion.button>
            )}

            {/* Live Turn-by-Turn Guidance Display on Map */}
            {!emergencyOpen && (
              <DashboardTurnByTurnCard
                currentStep={currentStep}
                nextStep={nextStep}
                distanceToNextManeuver={distanceToNextManeuver}
                currentRoadName={currentRoadName}
                destinationTitle={destinationTitle}
                speed={speed}
                progress={progress}
                isCalculating={isCalculating}
                onNavigate={() => navigate('/navigation')}
              />
            )}
          </SoftCard>

          {trip.status === 'completed' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <CheckCircle2 size={18} color="var(--color-success)" />
              Trip completed.
            </div>
          )}
        </motion.div>
      )}

      {/* Emergency Alert Modal */}
      <EmergencyModal open={emergencyOpen} onClose={() => setEmergencyOpen(false)} />
    </div>
  )
}
