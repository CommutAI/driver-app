import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gauge,
  ChevronUp,
  ChevronDown,
  Radio,
  StopCircle,
} from 'lucide-react'
import type { GpsStatus, RouteProgress, Trip } from '../../types'
import { formatDuration, formatManeuverDistance } from '../../utils/geoUtils'
import PassengerStatus from './PassengerStatus'
import GPSStatusIndicator from './GPSStatusIndicator'
import type { NetworkStatus } from '../../hooks/useNetworkStatus'

interface Props {
  progress: RouteProgress | null
  speed: number // in km/h
  passengerCount: number | null | undefined
  busCapacity: number
  paxLoading?: boolean
  trip: Trip | null
  originName?: string
  destinationName?: string
  gpsStatus: GpsStatus
  accuracy?: number | null
  network: NetworkStatus
  onEndTrip?: () => void
}

export default function TripInfoPanel({
  progress,
  speed,
  passengerCount,
  busCapacity,
  paxLoading,
  trip,
  originName = 'Manolo Fortich',
  destinationName = 'Agora Terminal, CDO',
  gpsStatus,
  accuracy,
  network,
  onEndTrip,
}: Props) {
  const [expanded, setExpanded] = useState<boolean>(false)

  const remainingMeters = progress?.distance_remaining ?? 0
  const remainingSeconds = progress?.estimated_time_remaining ?? 0
  const progressPct = progress?.progress_percentage ?? 0

  const formattedEta = formatDuration(remainingSeconds)
  const formattedRemainingDistance = formatManeuverDistance(remainingMeters)

  return (
    <div
      role="region"
      aria-label="Trip overview and metrics"
      style={{
        position: 'absolute',
        bottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        left: 10,
        right: 10,
        width: 'auto',
        zIndex: 1000,
        background: 'rgba(15, 17, 23, 0.94)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1.5px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 18,
        padding: '12px 14px',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        transition: 'all 200ms ease',
      }}
    >
      {/* ── Progress Bar Line ── */}
      <div
        style={{
          height: 3,
          width: '100%',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 99,
          overflow: 'hidden',
          marginBottom: 14,
        }}
      >
        <motion.div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #F97316 0%, #4ADE80 100%)',
            borderRadius: 99,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* ── Primary Glanceable Metrics ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        {/* Left: ETA and Remaining Distance */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 'clamp(1.4rem, 4.5vw, 1.9rem)',
                fontWeight: 900,
                color: '#4ADE80',
                letterSpacing: '-0.03em',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formattedEta}
            </span>
            <span
              style={{
                fontSize: 'clamp(0.82rem, 2.2vw, 1rem)',
                fontWeight: 700,
                color: 'rgba(255, 255, 255, 0.85)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formattedRemainingDistance} remaining
            </span>
          </div>

          <p
            style={{
              margin: '3px 0 0',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {progressPct}% completed • {destinationName}
          </p>
        </div>

        {/* Right: Expand Toggle */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Collapse trip details' : 'Expand trip details'}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 12,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {expanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
      </div>

      {/* ── Status Row: Passenger Count & Speed ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          flexWrap: 'wrap',
        }}
      >
        <PassengerStatus
          count={passengerCount}
          capacity={busCapacity}
          loading={paxLoading}
        />

        {/* Speed Gauge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
            <Gauge size={16} strokeWidth={2.4} />
          </div>
          <span
            style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              color: '#FFFFFF',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {speed}
          </span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            km/h
          </span>
        </div>
      </div>

      {/* ── Collapsible Drawer Details ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {/* Trip ID & Indicators */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Radio size={14} color="var(--color-primary)" />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {trip ? `Trip #${trip.id.slice(0, 8)}` : 'Navigation Active'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GPSStatusIndicator status={gpsStatus} accuracy={accuracy} />
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: network.isOnline ? '#22C55E' : '#EF4444',
                      background: 'rgba(255, 255, 255, 0.06)',
                      padding: '4px 8px',
                      borderRadius: 99,
                    }}
                  >
                    {network.statusLabel}
                  </span>
                </div>
              </div>

              {/* Origin -> Destination Route Details */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />
                  <div style={{ width: 2, height: 16, background: 'rgba(255, 255, 255, 0.2)' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
                </div>

                <div style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600 }}>
                  <div style={{ color: '#FFFFFF', marginBottom: 6 }}>
                    From: {originName}
                  </div>
                  <div style={{ color: '#FFFFFF' }}>
                    To: {destinationName}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {onEndTrip && (
                <button
                  type="button"
                  onClick={onEndTrip}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 14,
                    color: '#F87171',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    marginTop: 4,
                  }}
                >
                  <StopCircle size={18} />
                  <span>Complete / End Trip</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
