import type { ReactNode } from 'react'

interface Props { label: string; value: ReactNode; mono?: boolean }

export default function TripDetailRow({ label, value, mono }: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}
    className="trip-detail-row"
    >
      <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)',
        textAlign: 'right', flexShrink: 1, overflow: 'hidden', textOverflow: 'ellipsis',
        fontFamily: mono ? 'monospace' : undefined,
      }}>
        {value}
      </span>
    </div>
  )
}
