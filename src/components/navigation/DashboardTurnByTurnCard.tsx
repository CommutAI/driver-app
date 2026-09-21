import {
  ArrowUpLeft,
  ArrowUpRight,
  ArrowUp,
  RotateCcw,
  Merge,
  CircleDot,
  CornerUpRight,
  Flag,
  Compass,
  Navigation as NavigationIcon,
  Loader2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import type { ManeuverType, NavigationStep, RouteProgress } from '../../types'
import { formatManeuverDistance } from '../../utils/geoUtils'

interface Props {
  currentStep: NavigationStep | null
  nextStep?: NavigationStep | null
  distanceToNextManeuver: number
  currentRoadName?: string
  destinationTitle: string
  speed?: number
  progress?: RouteProgress | null
  isCalculating?: boolean
  onNavigate: () => void
}

function getManeuverIcon(maneuver?: ManeuverType, size = 28) {
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
      return <NavigationIcon size={size} strokeWidth={2.4} />
  }
}

export default function DashboardTurnByTurnCard({
  currentStep,
  nextStep,
  distanceToNextManeuver,
  currentRoadName,
  destinationTitle,
  speed = 0,
  progress,
  isCalculating = false,
  onNavigate,
}: Props) {
  const formattedDistance = formatManeuverDistance(distanceToNextManeuver || 0)

  const distanceRemainingKm = progress?.distance_remaining
    ? (progress.distance_remaining / 1000).toFixed(1)
    : null

  const minutesRemaining = progress?.estimated_time_remaining
    ? Math.max(1, Math.round(progress.estimated_time_remaining / 60))
    : null

  const instructionText = isCalculating
    ? 'Recalculating best route...'
    : currentStep?.instruction || `Head toward ${destinationTitle}`

  const roadText = currentRoadName || currentStep?.road_name || destinationTitle

  const percentComplete = Math.min(100, Math.max(0, progress?.progress_percentage || 0))

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.3 }}
      role="region"
      aria-label="Live turn-by-turn guidance"
      style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        zIndex: 1000,
        background: 'rgba(15, 17, 23, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 18,
        border: '1.5px solid rgba(255, 255, 255, 0.14)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(249, 115, 22, 0.15)',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onClick={onNavigate}
    >
      {/* Mini Progress Bar along top edge */}
      <div style={{ height: 3, width: '100%', background: 'rgba(255, 255, 255, 0.08)' }}>
        <div
          style={{
            height: '100%',
            width: `${percentComplete}%`,
            background: 'linear-gradient(90deg, #22C55E 0%, #F97316 100%)',
            transition: 'width 0.5s ease',
          }}
        />
      </div>

      <div style={{ padding: '10px 14px 12px 14px' }}>
        {/* Top Status & Telemetry Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 8,
            borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
            paddingBottom: 6,
          }}
        >
          {/* Live Indicator + Speed */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#22C55E',
                boxShadow: '0 0 8px #22C55E',
                display: 'inline-block',
                animation: 'pulse 1.8s infinite',
              }}
            />
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: '#4ADE80',
                textTransform: 'uppercase',
              }}
            >
              Turn-By-Turn Active
            </span>

            {speed > 0 && (
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  background: 'rgba(255, 255, 255, 0.1)',
                  padding: '1px 6px',
                  borderRadius: 6,
                  marginLeft: 2,
                }}
              >
                {Math.round(speed)} km/h
              </span>
            )}
          </div>

          {/* Remaining Distance & ETA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#CBD5E1', fontWeight: 700 }}>
            {isCalculating ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#F97316' }}>
                <Loader2 size={12} className="animate-spin" />
                <span>Rerouting</span>
              </div>
            ) : distanceRemainingKm ? (
              <span>
                {distanceRemainingKm} km • ~{minutesRemaining} min
              </span>
            ) : (
              <span>Towards {destinationTitle.split(' ')[0]}</span>
            )}
          </div>
        </div>

        {/* Main Turn-by-Turn Instruction Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Maneuver Icon Badge */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              flexShrink: 0,
              boxShadow: '0 6px 18px rgba(249, 115, 22, 0.45)',
            }}
          >
            {getManeuverIcon(currentStep?.maneuver, 30)}
          </div>

          {/* Middle: Distance & Turn Instruction */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
              <span
                style={{
                  fontSize: 'clamp(1.25rem, 4vw, 1.45rem)',
                  fontWeight: 900,
                  color: '#FFFFFF',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formattedDistance}
              </span>

              {nextStep && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: 'rgba(255, 255, 255, 0.65)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    background: 'rgba(255, 255, 255, 0.08)',
                    padding: '2px 6px',
                    borderRadius: 6,
                  }}
                >
                  Then {getManeuverIcon(nextStep.maneuver, 11)}
                </span>
              )}
            </div>

            <div
              style={{
                fontSize: 'clamp(0.85rem, 2.8vw, 0.95rem)',
                fontWeight: 800,
                color: '#F8FAFC',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {instructionText}
            </div>

            <div
              style={{
                fontSize: '0.74rem',
                fontWeight: 600,
                color: '#FB923C',
                marginTop: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {roadText}
            </div>
          </div>

          {/* Right: Full Screen Navigate Button */}
          <div style={{ flexShrink: 0 }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onNavigate()
              }}
              aria-label="Launch full-screen turn-by-turn navigation"
              style={{
                background: 'var(--color-primary-gradient)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 12,
                padding: '8px 12px',
                color: '#FFFFFF',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 14px rgba(249, 115, 22, 0.45)',
                whiteSpace: 'nowrap',
              }}
            >
              <Compass size={15} strokeWidth={2.4} />
              <span>Full View</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
