import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Navigation, MapPin, Loader2, RefreshCw, Compass } from 'lucide-react'

import { useActiveTrip }  from '../hooks/useActiveTrip'
import { useAssignedBus } from '../hooks/useAssignedBus'
import { useGpsLocation } from '../hooks/useGpsLocation'
import { useRouteStops }  from '../hooks/useRouteStops'
import SectionHeader  from '../components/ui/SectionHeader'
import SoftCard       from '../components/ui/SoftCard'
import RouteMap       from '../components/route/RouteMap'
import StopList       from '../components/route/StopList'
import GpsStatusPanel from '../components/gps/GpsStatusPanel'

function routeParts(route: string | undefined) {
  if (!route) return { origin: '—', destination: '—' }
  const parts = route.split(/[↔→\-–]/).map(s => s.trim()).filter(Boolean)
  if (parts.length >= 2) return { origin: parts[0], destination: parts[parts.length - 1] }
  return { origin: route, destination: route }
}

export default function RoutePage() {
  const navigate = useNavigate()
  const { trip }  = useActiveTrip()
  const { bus }   = useAssignedBus()

  // Route direction state (synced with localStorage and trip)
  const [selectedRoute, setSelectedRoute] = useState<string>(() => {
    return localStorage.getItem('driver_selected_route') || 'manolo_fortich'
  })

  const isAgoraToManolo = useMemo(() => {
    if (trip?.starting_point) {
      return trip.starting_point.toLowerCase().includes('agora')
    }
    if (selectedRoute === 'agora') return true
    if (selectedRoute === 'manolo_fortich') return false
    const tripRoute = (trip?.bus as any)?.route ?? bus?.route
    return tripRoute?.toLowerCase().includes('agora → manolo') || false
  }, [selectedRoute, trip, bus])

  const routeText = isAgoraToManolo
    ? 'Agora → Manolo Fortich'
    : 'Manolo Fortich → Agora'

  const handleRouteChange = (newRoute: string) => {
    setSelectedRoute(newRoute)
    localStorage.setItem('driver_selected_route', newRoute)
  }

  // GPS is keyed by trip_id in the shared schema
  const { location, gpsStatus, lastUpdate, loading: gpsLoading, refetch: refetchGps } =
    useGpsLocation(trip?.id)

  // Route stops are parsed from routeText dynamically
  const { stops } = useRouteStops(routeText)

  useEffect(() => {
    const id = setInterval(refetchGps, 15_000)
    return () => clearInterval(id)
  }, [refetchGps])

  const { origin, destination } = routeParts(routeText)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <SectionHeader
        title="Route Monitoring"
        subtitle={routeText ?? 'No route assigned'}
        light
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => navigate('/navigation')}
              aria-label="Open Turn-by-Turn Navigation"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: 'var(--color-primary-gradient)',
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(249,115,22,0.35)',
              }}
            >
              <Compass size={14} />
              <span>Navigate</span>
            </button>
            <button
              type="button"
              onClick={refetchGps}
              aria-label="Refresh GPS"
              style={{
                width: 36, height: 36,
                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                borderRadius: 10, cursor: 'pointer', color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <RefreshCw size={15} style={{ animation: gpsLoading ? 'spin 0.8s linear infinite' : 'none' }} />
            </button>
          </div>
        }
      />

      {/* Prominent Turn-by-Turn Navigation Action Banner */}
      <motion.button
        type="button"
        onClick={() => navigate('/navigation')}
        whileTap={{ scale: 0.98 }}
        className="primary-btn primary-btn--full primary-btn--primary"
        style={{
          fontSize: '1.05rem',
          fontWeight: 800,
          gap: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(249,115,22,0.4)',
        }}
      >
        <Navigation size={22} />
        START TURN-BY-TURN NAVIGATION
      </motion.button>

      {/* Route direction selector & summary bar */}
      <SoftCard variant="hero" padding={14}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#ffffff', fontSize: '0.92rem' }}>
            <MapPin size={16} color="rgba(255,255,255,0.7)" />
            <span>{origin}</span>
            <Navigation size={13} color="rgba(255,255,255,0.7)" />
            <span>{destination}</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(15, 17, 23, 0.65)',
              borderRadius: 10,
              padding: 2,
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            <button
              type="button"
              onClick={() => handleRouteChange('manolo_fortich')}
              style={{
                padding: '4px 8px',
                borderRadius: 8,
                border: 'none',
                background: !isAgoraToManolo ? 'var(--color-primary-gradient)' : 'transparent',
                color: !isAgoraToManolo ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.7rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Manolo → Agora
            </button>
            <button
              type="button"
              onClick={() => handleRouteChange('agora')}
              style={{
                padding: '4px 8px',
                borderRadius: 8,
                border: 'none',
                background: isAgoraToManolo ? 'var(--color-primary-gradient)' : 'transparent',
                color: isAgoraToManolo ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.7rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Agora → Manolo
            </button>
          </div>
        </div>
      </SoftCard>

      {/* Map with live road route and bus location */}
      {gpsLoading && !location
        ? (
          <div style={{ height: 320, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--card-radius)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={30} color="var(--color-primary)" style={{ animation: 'spin 0.8s linear infinite' }} />
          </div>
        )
        : (
          <div style={{ height: 'calc(100dvh - 140px)', minHeight: 400, borderRadius: 'var(--card-radius)', overflow: 'hidden' }}>
            <RouteMap
              stops={stops}
              busLocation={location as any}
              destinationTitle={isAgoraToManolo ? 'Manolo Fortich Terminal' : 'Agora Terminal, CDO'}
              routeDirection={isAgoraToManolo ? 'agora_to_manolo' : 'manolo_to_agora'}
            />
          </div>
        )
      }

      {/* GPS status panel */}
      <GpsStatusPanel location={location as any} gpsStatus={gpsStatus} lastUpdate={lastUpdate} loading={gpsLoading} />

      {/* Stop timeline (parsed from route text) */}
      {stops.length > 1 && (
        <SoftCard padding={20}>
          <p style={{ margin: '0 0 12px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Route Stops
          </p>
          <StopList stops={stops as any} busLocation={location as any} />
        </SoftCard>
      )}

      {/* No trip */}
      {!trip && (
        <SoftCard>
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Navigation size={44} color="var(--text-tertiary)" style={{ margin: '0 auto 12px', display: 'block' }} strokeWidth={1.5} />
            <p style={{ margin: '0 0 4px', fontWeight: 700, color: 'var(--text-primary)' }}>No active trip</p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Route monitoring will appear once a trip is in progress.
            </p>
          </div>
        </SoftCard>
      )}
    </motion.div>
  )
}
