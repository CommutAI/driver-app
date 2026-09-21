import { Polyline } from 'react-leaflet'
import type { Coordinates } from '../../types'

interface Props {
  geometry: [number, number][]
  currentLocation?: Coordinates | null
}

export default function RoutePolyline({ geometry }: Props) {
  if (!geometry || geometry.length < 2) return null

  return (
    <Polyline
      positions={geometry}
      pathOptions={{
        color: '#2563EB',
        weight: 6,
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
      }}
    />
  )
}
