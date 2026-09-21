import {
  ArrowUpLeft,
  ArrowUpRight,
  ArrowUp,
  RotateCcw,
  Merge,
  CircleDot,
  CornerUpRight,
  Flag,
  ArrowLeft,
  RefreshCw,
  ArrowRightLeft,
} from 'lucide-react'
import type { ManeuverType, GpsStatus } from '../../types'
import { formatManeuverDistance } from '../../utils/geoUtils'
import GPSStatusIndicator from './GPSStatusIndicator'

interface Props {
  maneuver: ManeuverType
  distance: number // in meters
  instruction: string
  roadName: string
  nextManeuver?: ManeuverType | null
  onBack?: () => void
  destinationLabel?: string
  onToggleRoute?: () => void
  onRefreshRoute?: () => void
  isRefreshing?: boolean
  gpsStatus?: GpsStatus
  gpsAccuracy?: number | null
}

function getManeuverIcon(maneuver: ManeuverType, size = 32) {
  switch (maneuver) {
    case 'TURN_LEFT':
      return <ArrowUpLeft size={size} strokeWidth={2.8} />
    case 'TURN_RIGHT':
      return <ArrowUpRight size={size} strokeWidth={2.8} />
    case 'SLIGHT_LEFT':
      return <ArrowUpLeft size={size} strokeWidth={2.2} style={{ transform: 'rotate(15deg)' }} />
    case 'SLIGHT_RIGHT':
      return <ArrowUpRight size={size} strokeWidth={2.2} style={{ transform: 'rotate(-15deg)' }} />
    case 'U_TURN':
      return <RotateCcw size={size} strokeWidth={2.8} />
    case 'STRAIGHT':
      return <ArrowUp size={size} strokeWidth={2.8} />
    case 'MERGE':
      return <Merge size={size} strokeWidth={2.8} />
    case 'ROUNDABOUT':
      return <CircleDot size={size} strokeWidth={2.8} />
    case 'EXIT':
      return <CornerUpRight size={size} strokeWidth={2.8} />
    case 'ARRIVE':
      return <Flag size={size} strokeWidth={2.8} />
    default:
      return <ArrowUp size={size} strokeWidth={2.8} />
  }
}

export default function NavigationInstructionCard({
  maneuver,
  distance,
  instruction,
  roadName,
  nextManeuver,
  onBack,
  destinationLabel,
  onToggleRoute,
  onRefreshRoute,
  isRefreshing = false,
  gpsStatus,
  gpsAccuracy,
}: Props) {
  const formattedDistance = formatManeuverDistance(distance)

  return (
    <div
      role="region"
      aria-label="Current navigation instruction"
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
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(249, 115, 22, 0.1)',
        transition: 'all 200ms ease',
      }}
    >
      {/* ── TOP UTILITY & STATUS BAR (Back, Then, To: Manolo, Refresh, GPS Status, SOS) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          marginBottom: 8,
          paddingBottom: 8,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          flexWrap: 'wrap',
        }}
      >
        {/* Left side: Back button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
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
                flexShrink: 0,
              }}
            >
              <ArrowLeft size={15} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Right side: Then, To: Manolo, Refresh, GPS Status, SOS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {nextManeuver && (
            <span
              style={{
                height: 28,
                padding: '0 8px',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'rgba(255, 255, 255, 0.75)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                whiteSpace: 'nowrap',
              }}
            >
              Then {getManeuverIcon(nextManeuver, 12)}
            </span>
          )}

          {onToggleRoute && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleRoute()
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
              <span>{destinationLabel || 'To: Manolo'}</span>
              <ArrowRightLeft size={11} style={{ color: '#F97316' }} />
            </button>
          )}

          {onRefreshRoute && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRefreshRoute()
              }}
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
                flexShrink: 0,
              }}
            >
              <RefreshCw size={13} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          )}

          {gpsStatus && (
            <GPSStatusIndicator
              status={gpsStatus}
              accuracy={gpsAccuracy}
              style={{
                height: 28,
                padding: '0 8px',
                borderRadius: 8,
                fontSize: '0.7rem',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            />
          )}
        </div>
      </div>

      {/* ── MAIN TURN-BY-TURN GUIDANCE ROW ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Maneuver Icon badge */}
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            flexShrink: 0,
            boxShadow: '0 6px 20px rgba(249, 115, 22, 0.45)',
          }}
        >
          {getManeuverIcon(maneuver, 32)}
        </div>

        {/* Text Details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 'clamp(1.5rem, 4.5vw, 1.85rem)',
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '-0.03em',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formattedDistance}
          </div>

          <div
            style={{
              fontSize: 'clamp(0.95rem, 2.5vw, 1.05rem)',
              fontWeight: 700,
              color: '#F3F4F6',
              lineHeight: 1.25,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: 2,
            }}
          >
            {instruction}
          </div>

          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--color-primary-light, #FB923C)',
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {roadName}
          </div>
        </div>
      </div>
    </div>
  )
}
