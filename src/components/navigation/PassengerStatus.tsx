import { Users } from 'lucide-react'

interface Props {
  count: number | null | undefined
  capacity: number
  loading?: boolean
}

export default function PassengerStatus({ count, capacity, loading }: Props) {
  if (loading && count == null) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
          fontWeight: 600,
        }}
      >
        <Users size={16} color="var(--text-tertiary)" />
        <span>Loading pax...</span>
      </div>
    )
  }

  if (count == null) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--text-tertiary)',
          fontSize: '0.82rem',
          fontWeight: 600,
        }}
      >
        <Users size={16} />
        <span>Passenger count unavailable</span>
      </div>
    )
  }

  const isFull = count >= capacity
  const isNear = count >= capacity * 0.9

  const badgeColor = isFull ? '#EF4444' : isNear ? '#F59E0B' : '#4ADE80'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: badgeColor,
        }}
      >
        <Users size={16} strokeWidth={2.4} />
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span
          style={{
            fontSize: '1.05rem',
            fontWeight: 800,
            color: '#FFFFFF',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {count}
        </span>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
          / {capacity}
        </span>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          passengers
        </span>
      </div>
    </div>
  )
}
