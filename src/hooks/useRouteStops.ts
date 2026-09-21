// ─────────────────────────────────────────────────────────────
//  useRouteStops — hardcoded bus stops with coordinates from public-dashboard
//  Route is a free-text field on buses.route.
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react'

export interface ParsedStop {
  id: string
  stop: string
  stop_name: string
  sequence_order: number
  latitude: number
  longitude: number
  estimated_minutes_from_origin: number
  status: 'START' | 'END' | 'ACTIVE'
}

// Hardcoded bus stops data (matching public-dashboard)
const busStopsData: Array<{ stop: string; location: string; status: string; coordinates: [number, number] }> = [
  { stop: 'STOP 01', location: 'Manolo Fortich Terminal', status: 'START', coordinates: [8.366308873785245, 124.86500795847] },
  { stop: 'STOP 02', location: 'Gaisano CDO', status: 'ACTIVE', coordinates: [8.4867, 124.6500] },
  { stop: 'STOP 03', location: 'Gusa', status: 'ACTIVE', coordinates: [8.4757, 124.6823] },
  { stop: 'STOP 04', location: 'Tablon Baloi', status: 'ACTIVE', coordinates: [8.4819, 124.7286] },
  { stop: 'STOP 05', location: 'Tablon', status: 'ACTIVE', coordinates: [8.4819, 124.7286] },
  { stop: 'STOP 06', location: 'Agusan', status: 'ACTIVE', coordinates: [8.4886, 124.7382] },
  { stop: 'STOP 07', location: 'Puerto', status: 'ACTIVE', coordinates: [8.5010, 124.7505] },
  { stop: 'STOP 08', location: 'Bae Upper Puerto', status: 'ACTIVE', coordinates: [8.4264, 124.8092] },
  { stop: 'STOP 09', location: 'Alae', status: 'ACTIVE', coordinates: [8.4244, 124.8128] },
  { stop: 'STOP 10', location: 'Lunocan', status: 'ACTIVE', coordinates: [8.4143, 124.8231] },
  { stop: 'STOP 11', location: 'San Miguel', status: 'ACTIVE', coordinates: [8.3890, 124.8332] },
  { stop: 'STOP 12', location: 'Dicklum', status: 'ACTIVE', coordinates: [8.3740, 124.8480] },
  { stop: 'STOP 13', location: 'Tankulan', status: 'ACTIVE', coordinates: [8.3688, 124.8641] },
  { stop: 'STOP 14', location: 'Agora Terminal', status: 'END', coordinates: [8.489074818449854, 124.65762898250219] }
]

/**
 * Return hardcoded stops with coordinates for the route, reversing sequence if Agora -> Manolo
 */
export function useRouteStops(routeText?: string): {
  stops: ParsedStop[]
  loading: false
} {
  const isAgoraToManolo = useMemo(() => {
    if (!routeText) return false
    const lower = routeText.toLowerCase()
    return (
      lower.includes('agora → manolo') ||
      lower.includes('agora - manolo') ||
      lower.includes('agora to manolo') ||
      lower === 'agora'
    )
  }, [routeText])

  const stops = useMemo<ParsedStop[]>(() => {
    const rawStops = isAgoraToManolo ? [...busStopsData].reverse() : [...busStopsData]
    return rawStops.map((stop, i) => {
      const isStart = i === 0
      const isEnd = i === rawStops.length - 1
      return {
        id: `stop-${i}`,
        stop: `STOP ${String(i + 1).padStart(2, '0')}`,
        stop_name: stop.location,
        sequence_order: i + 1,
        latitude: stop.coordinates[0],
        longitude: stop.coordinates[1],
        estimated_minutes_from_origin: i * 5,
        status: isStart ? 'START' : isEnd ? 'END' : 'ACTIVE',
      }
    })
  }, [isAgoraToManolo])

  return { stops, loading: false }
}
