/**
 * Geo calculation utilities for navigation
 */

export interface LatLng {
  latitude: number
  longitude: number
}

/**
 * Calculate Haversine distance between two coordinates in meters
 */
export function haversineDistance(
  coord1: [number, number] | LatLng,
  coord2: [number, number] | LatLng
): number {
  const lat1 = Array.isArray(coord1) ? coord1[0] : coord1.latitude
  const lon1 = Array.isArray(coord1) ? coord1[1] : coord1.longitude
  const lat2 = Array.isArray(coord2) ? coord2[0] : coord2.latitude
  const lon2 = Array.isArray(coord2) ? coord2[1] : coord2.longitude

  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Calculate bearing/heading in degrees (0 = North, 90 = East, 180 = South, 270 = West)
 */
export function calculateBearing(
  coord1: [number, number] | LatLng,
  coord2: [number, number] | LatLng
): number {
  const lat1 = ((Array.isArray(coord1) ? coord1[0] : coord1.latitude) * Math.PI) / 180
  const lon1 = ((Array.isArray(coord1) ? coord1[1] : coord1.longitude) * Math.PI) / 180
  const lat2 = ((Array.isArray(coord2) ? coord2[0] : coord2.latitude) * Math.PI) / 180
  const lon2 = ((Array.isArray(coord2) ? coord2[1] : coord2.longitude) * Math.PI) / 180

  const dLon = lon2 - lon1
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)

  const brng = (Math.atan2(y, x) * 180) / Math.PI
  return (brng + 360) % 360
}

/**
 * Distance from a point to a line segment [p1, p2] in meters
 */
export function pointToSegmentDistance(
  p: [number, number],
  p1: [number, number],
  p2: [number, number]
): number {
  const [lat, lon] = p
  const [lat1, lon1] = p1
  const [lat2, lon2] = p2

  const dx = lon2 - lon1
  const dy = lat2 - lat1

  if (dx === 0 && dy === 0) {
    return haversineDistance([lat, lon], [lat1, lon1])
  }

  // Parameter t of projection onto line
  const t = Math.max(
    0,
    Math.min(1, ((lon - lon1) * dx + (lat - lat1) * dy) / (dx * dx + dy * dy))
  )

  const projLat = lat1 + t * dy
  const projLon = lon1 + t * dx

  return haversineDistance([lat, lon], [projLat, projLon])
}

/**
 * Minimum distance from point to a polyline in meters
 */
export function minDistanceToPolyline(
  point: [number, number],
  polyline: [number, number][]
): { distance: number; nearestSegmentIndex: number } {
  if (polyline.length === 0) return { distance: Infinity, nearestSegmentIndex: -1 }
  if (polyline.length === 1) {
    return {
      distance: haversineDistance(point, polyline[0]),
      nearestSegmentIndex: 0,
    }
  }

  let minDistance = Infinity
  let nearestSegmentIndex = 0

  for (let i = 0; i < polyline.length - 1; i++) {
    const d = pointToSegmentDistance(point, polyline[i], polyline[i + 1])
    if (d < minDistance) {
      minDistance = d
      nearestSegmentIndex = i
    }
  }

  return { distance: minDistance, nearestSegmentIndex }
}

/**
 * Format distance in meters to a human readable string (e.g. "1.2 km" or "450 m")
 */
export function formatManeuverDistance(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000
    return km >= 10 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`
  }
  return `${Math.round(meters)} m`
}

/**
 * Format duration in seconds to minutes string (e.g. "39 min")
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${Math.max(1, minutes)} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMins = minutes % 60
  return `${hours} hr ${remainingMins} min`
}
