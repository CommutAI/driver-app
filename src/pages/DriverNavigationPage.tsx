import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  ArrowRightLeft,
} from 'lucide-react'

import { useActiveTrip } from '../hooks/useActiveTrip'
import { useAssignedBus } from '../hooks/useAssignedBus'
import { useOccupancy } from '../hooks/useOccupancy'
import { useDriverGPS } from '../hooks/useDriverGPS'
import { useNavigationRoute } from '../hooks/useNavigationRoute'
import { useRouteProgress } from '../hooks/useRouteProgress'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { DEFAULT_DESTINATION, DEFAULT_ORIGIN } from '../services/routingService'
import type { Coordinates } from '../types'

import NavigationMap from '../components/navigation/NavigationMap'
import NavigationInstructionCard from '../components/navigation/NavigationInstructionCard'
import TripInfoPanel from '../components/navigation/TripInfoPanel'
import NetworkStatusIndicator from '../components/navigation/NetworkStatusIndicator'
import GPSStatusIndicator from '../components/navigation/GPSStatusIndicator'
import EmergencyModal from '../components/emergency/EmergencyModal'

export default function DriverNavigationPage() {
  const navigate = useNavigate()
  const { trip } = useActiveTrip()
  const { bus } = useAssignedBus()

  // Live GPS hook (Hardware Geolocation + Supabase Realtime)
  const {
    location,
    heading,
    speed,
    accuracy,
    gpsStatus,
  } = useDriverGPS(trip?.id)

  // Occupancy / Passenger count hook
  const busCapacity = bus?.seat_capacity ?? 31
  const { occupancy, loading: paxLoading } = useOccupancy(trip?.id, busCapacity)

  // Connectivity
  const network = useNetworkStatus()

  // Emergency SOS modal state
  const [emergencyOpen, setEmergencyOpen] = useState<boolean>(false)

  // Route direction state (synced with localStorage and trip)
  const [selectedRoute, setSelectedRoute] = useState<string>(() => {
    return localStorage.getItem('driver_selected_route') || 'manolo_fortich'
  })

  const isAgoraToManolo = useMemo(() => {
    if (selectedRoute === 'agora') return true
    if (selectedRoute === 'manolo_fortich') return false
    const routeText = (trip?.bus as any)?.route ?? bus?.route ?? ''
    const lower = routeText.toLowerCase()
    return lower.includes('agora → manolo') || lower.includes('agora - manolo') || lower.includes('agora to manolo')
  }, [selectedRoute, trip, bus])

  // Determine destination from selected route
  // If Agora -> Manolo: destination is Manolo Fortich (DEFAULT_ORIGIN)
  // If Manolo -> Agora: destination is Agora Terminal (DEFAULT_DESTINATION)
  const destination = useMemo<Coordinates>(() => {
    return isAgoraToManolo ? DEFAULT_ORIGIN : DEFAULT_DESTINATION
  }, [isAgoraToManolo])

  const destinationTitle = useMemo(() => {
    return isAgoraToManolo ? 'Manolo Fortich Terminal' : 'Agora Terminal, CDO'
  }, [isAgoraToManolo])

  const originTitle = useMemo(() => {
    return isAgoraToManolo ? 'Agora Terminal, CDO' : 'Manolo Fortich Terminal'
  }, [isAgoraToManolo])

  // Current GPS coordinates or fallback origin
  const currentCoords = useMemo<Coordinates | null>(() => {
    if (location && typeof location.latitude === 'number' && typeof location.longitude === 'number') {
      return { latitude: Number(location.latitude), longitude: Number(location.longitude) }
    }
    return null
  }, [location])

  // Routing engine hook
  const {
    route,
    isCalculating,
    isRecalculating,
    recalculateRoute,
  } = useNavigationRoute(currentCoords || DEFAULT_ORIGIN, destination)

  // Progress & turn-by-turn guidance hook
  const {
    progress,
    currentStep,
    nextStep,
    distanceToNextManeuver,
    currentRoadName,
  } = useRouteProgress(route, currentCoords, speed)



  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: '#0F1117',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── TOP LAYER: Floating Navigation Instruction Card ── */}
      {currentStep ? (
        <NavigationInstructionCard
          maneuver={currentStep.maneuver}
          distance={distanceToNextManeuver}
          instruction={currentStep.instruction}
          roadName={currentRoadName}
          nextManeuver={nextStep?.maneuver}
          destinationLabel={isAgoraToManolo ? 'To: Manolo' : 'To: Agora'}
          onToggleRoute={() => {
            const nextRoute = isAgoraToManolo ? 'manolo_fortich' : 'agora'
            setSelectedRoute(nextRoute)
            localStorage.setItem('driver_selected_route', nextRoute)
          }}
          onRefreshRoute={() => recalculateRoute()}
          isRefreshing={isCalculating}
          gpsStatus={gpsStatus}
          gpsAccuracy={accuracy}
          onBack={() => navigate('/')}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            top: 'calc(10px + env(safe-area-inset-top, 0px))',
            left: 12,
            right: 12,
            zIndex: 1000,
            background: 'rgba(15, 17, 23, 0.94)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 18,
            padding: '10px 12px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label="Back to dashboard"
              title="Back to dashboard"
              style={{
                height: 28,
                padding: '0 8px',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={15} strokeWidth={2.5} />
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.85)' }}>
              {isCalculating ? 'Computing route...' : destinationTitle}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                const nextRoute = isAgoraToManolo ? 'manolo_fortich' : 'agora'
                setSelectedRoute(nextRoute)
                localStorage.setItem('driver_selected_route', nextRoute)
              }}
              title="Switch trip destination"
              style={{
                height: 28,
                padding: '0 8px',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap',
              }}
            >
              <span>{isAgoraToManolo ? 'To: Manolo' : 'To: Agora'}</span>
              <ArrowRightLeft size={11} style={{ color: '#F97316' }} />
            </button>

            <button
              type="button"
              onClick={() => recalculateRoute()}
              aria-label="Refresh route"
              title="Refresh route"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: 'rgba(255, 255, 255, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <RefreshCw size={13} style={{ animation: isCalculating ? 'spin 1s linear infinite' : 'none' }} />
            </button>

            <GPSStatusIndicator
              status={gpsStatus}
              accuracy={accuracy}
              style={{
                height: 28,
                padding: '0 8px',
                borderRadius: 8,
                fontSize: '0.7rem',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Offline Banner ── */}
      <NetworkStatusIndicator network={network} />

      {/* ── Recalculating / Off-Route Warning Banner ── */}
      <AnimatePresence>
        {isRecalculating && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'absolute',
              top: currentStep ? 'calc(110px + env(safe-area-inset-top, 0px))' : 'calc(60px + env(safe-area-inset-top, 0px))',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1001,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              background: 'rgba(234, 88, 12, 0.95)',
              color: '#FFFFFF',
              borderRadius: 99,
              boxShadow: '0 8px 24px rgba(234, 88, 12, 0.4)',
              fontSize: '0.78rem',
              fontWeight: 800,
              maxWidth: '90vw',
              whiteSpace: 'nowrap',
            }}
          >
            <Loader2 size={15} className="animate-spin" />
            <span>Recalculating route...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CENTER LAYER: Full-screen Leaflet Map ── */}
      <div style={{ flex: 1, width: '100%', height: '100%', position: 'relative' }}>
        <NavigationMap
          busLocation={location}
          heading={heading}
          route={route}
          destination={destination}
          destinationTitle={destinationTitle}
          busNumber={bus?.bus_number}
          onReroute={recalculateRoute}
        />
      </div>

      {/* ── BOTTOM LAYER: Trip Information Panel ── */}
      <TripInfoPanel
        progress={progress}
        speed={speed}
        passengerCount={occupancy.ai_count || occupancy.scan_count || null}
        busCapacity={busCapacity}
        paxLoading={paxLoading}
        trip={trip}
        originName={originTitle}
        destinationName={destinationTitle}
        gpsStatus={gpsStatus}
        accuracy={accuracy}
        network={network}
        onEndTrip={trip ? () => navigate('/trip') : undefined}
      />

      {/* ── Emergency Alert Modal ── */}
      <EmergencyModal open={emergencyOpen} onClose={() => setEmergencyOpen(false)} />
    </div>
  )
}
