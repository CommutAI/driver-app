import type { CSSProperties } from 'react'
import type { GpsStatus } from '../../types'

interface Props {
  status: GpsStatus
  accuracy?: number | null
  isSharing?: boolean
  style?: CSSProperties
  onClick?: () => void
}

export default function GPSStatusIndicator({ status, accuracy, isSharing = true, style, onClick }: Props) {
  const isConnected = status === 'connected'
  const isWeak = status === 'poor'

  const dotColor = isConnected ? '#22C55E' : isWeak ? '#FACC15' : '#EF4444'
  const label = isConnected
    ? isSharing
      ? accuracy != null ? `📡 Sharing ±${Math.round(accuracy)}m` : '📡 Sharing GPS'
      : accuracy != null ? `GPS ±${Math.round(accuracy)}m` : 'GPS Live'
    : isWeak
    ? 'GPS Weak'
    : 'GPS Offline'

  return (
    <div
      role="status"
      onClick={onClick}
      title={onClick ? "Click to toggle Phone GPS broadcasting" : undefined}
      aria-label={`GPS Status: ${label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        background: 'rgba(15, 17, 23, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 99,
        color: 'var(--text-secondary)',
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.02em',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          backgroundColor: dotColor,
          boxShadow: isConnected ? `0 0 8px ${dotColor}` : 'none',
        }}
      />
      <span>{label}</span>
    </div>
  )
}
