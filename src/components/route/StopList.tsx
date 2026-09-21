import { CheckCircle2, Circle, MapPin } from 'lucide-react'
import type { GpsLocation } from '../../types'
import type { ParsedStop } from '../../hooks/useRouteStops'

function nearestIdx(stops: ParsedStop[], loc: GpsLocation | null): number {
  if (!loc || !stops.length) return -1
  let minD = Infinity, idx = -1
  stops.forEach((s, i) => {
    const d = Math.hypot(Number(s.latitude) - Number(loc.latitude), Number(s.longitude) - Number(loc.longitude))
    if (d < minD) { minD = d; idx = i }
  })
  return idx
}

interface Props { stops: ParsedStop[]; busLocation: GpsLocation | null }

export default function StopList({ stops, busLocation }: Props) {
  const currentIdx = nearestIdx(stops, busLocation)

  return (
    <div style={{ position: 'relative' }}>
      {/* Vertical connector line */}
      <div style={{
        position: 'absolute', left: 19, top: 20, bottom: 20,
        width: 2, background: 'rgba(255,255,255,0.06)', zIndex: 0,
      }} aria-hidden />

      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {stops.map((stop, i) => {
          const isPast    = i < currentIdx
          const isCurrent = i === currentIdx
          const isFirst   = i === 0
          const isLast    = i === stops.length - 1

          return (
            <li key={stop.id} style={{
              position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 14,
              paddingBlock: 10, zIndex: 1,
              opacity: isPast ? 0.45 : 1,
              transition: 'opacity 0.2s',
            }}>
              {/* Dot */}
              <div style={{ flexShrink: 0, marginTop: 2, width: 38, display: 'flex', justifyContent: 'center' }}>
                {isCurrent
                  ? (
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: 'var(--color-primary-gradient)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, boxShadow: '0 4px 16px rgba(249,115,22,0.5)',
                    }}>
                      🚌
                    </div>
                  )
                  : isPast
                  ? <CheckCircle2 size={34} color="var(--color-success)" />
                  : isFirst
                  ? (
                    <div style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid var(--color-success)', background: 'var(--color-success-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MapPin size={16} color="var(--color-success)" />
                    </div>
                  )
                  : isLast
                  ? (
                    <div style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid var(--color-danger)', background: 'var(--color-danger-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MapPin size={16} color="var(--color-danger)" />
                    </div>
                  )
                  : <Circle size={34} color="rgba(255,255,255,0.15)" />}
              </div>

              {/* Label */}
              <div style={{ paddingTop: 6, flex: 1 }}>
                <p style={{
                  margin: 0, fontSize: '0.9rem', fontWeight: isCurrent ? 800 : 600,
                  color: isCurrent ? 'var(--color-primary)' : 'var(--text-primary)',
                  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                }}>
                  {stop.stop_name}
                  {isCurrent && (
                    <span style={{ fontSize: '0.6rem', background: 'var(--color-primary)', color: '#fff', padding: '2px 7px', borderRadius: 99, fontWeight: 800, letterSpacing: '0.04em' }}>
                      HERE
                    </span>
                  )}
                </p>
                <p style={{ margin: '1px 0 0', fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                  Stop {stop.sequence_order} · {stop.estimated_minutes_from_origin} min from origin
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
