import type { Coordinates, ManeuverType, NavigationRoute, NavigationStep } from '../types'
import { haversineDistance } from '../utils/geoUtils'

// Standard corridor stops for the Manolo Fortich <-> Agora route
export const DEFAULT_CORRIDOR_STOPS = [
  { name: 'Manolo Fortich Terminal', coords: [8.3663088, 124.865008] as [number, number] },
  { name: 'Tankulan', coords: [8.3688, 124.8641] as [number, number] },
  { name: 'Dicklum', coords: [8.3740, 124.8480] as [number, number] },
  { name: 'San Miguel', coords: [8.3890, 124.8332] as [number, number] },
  { name: 'Lunocan', coords: [8.4143, 124.8231] as [number, number] },
  { name: 'Alae', coords: [8.4244, 124.8128] as [number, number] },
  { name: 'Bae Upper Puerto', coords: [8.4264, 124.8092] as [number, number] },
  { name: 'Puerto', coords: [8.5010, 124.7505] as [number, number] },
  { name: 'Agusan', coords: [8.4886, 124.7382] as [number, number] },
  { name: 'Tablon', coords: [8.4819, 124.7286] as [number, number] },
  { name: 'Gusa', coords: [8.4757, 124.6823] as [number, number] },
  { name: 'Gaisano CDO', coords: [8.4867, 124.6500] as [number, number] },
  { name: 'Agora Terminal', coords: [8.4890748, 124.657629] as [number, number] },
]

export const DEFAULT_ORIGIN: Coordinates = {
  latitude: 8.3663088,
  longitude: 124.865008,
}

export const DEFAULT_DESTINATION: Coordinates = {
  latitude: 8.4890748,
  longitude: 124.657629,
}

/**
 * Map OSRM step maneuver to our ManeuverType
 */
function mapOsrmManeuver(type: string, modifier?: string): ManeuverType {
  const mod = (modifier || '').toLowerCase()
  const t = (type || '').toLowerCase()

  if (t === 'arrive') return 'ARRIVE'
  if (t === 'merge') return 'MERGE'
  if (t === 'roundabout' || t === 'rotary') return 'ROUNDABOUT'
  if (t === 'fork' || t === 'off ramp' || t === 'exit') return 'EXIT'
  if (mod === 'uturn') return 'U_TURN'

  if (mod === 'slight left') return 'SLIGHT_LEFT'
  if (mod === 'slight right') return 'SLIGHT_RIGHT'
  if (mod === 'left' || mod === 'sharp left') return 'TURN_LEFT'
  if (mod === 'right' || mod === 'sharp right') return 'TURN_RIGHT'

  if (t === 'depart' || t === 'continue' || t === 'new name') return 'STRAIGHT'
  return 'STRAIGHT'
}

/**
 * Generate human-readable instruction text
 */
function buildInstructionText(maneuver: ManeuverType, roadName: string, modifier?: string): string {
  const road = roadName ? `onto ${roadName}` : 'ahead'
  switch (maneuver) {
    case 'TURN_LEFT':
      return `Turn left ${road}`
    case 'TURN_RIGHT':
      return `Turn right ${road}`
    case 'SLIGHT_LEFT':
      return `Keep slight left ${road}`
    case 'SLIGHT_RIGHT':
      return `Keep slight right ${road}`
    case 'U_TURN':
      return `Make a U-turn ${road}`
    case 'MERGE':
      return `Merge ${road}`
    case 'ROUNDABOUT':
      return `At the roundabout, proceed ${road}`
    case 'EXIT':
      return `Take exit ${road}`
    case 'ARRIVE':
      return `Arriving at destination`
    case 'STRAIGHT':
    default:
      return modifier === 'straight' || !roadName ? 'Continue straight ahead' : `Continue ${road}`
  }
}

/**
 * Generate a reliable corridor fallback route when offline or OSRM unavailable
 */
function generateFallbackRoute(
  origin: Coordinates,
  destination: Coordinates
): NavigationRoute {
  // Determine direction based on origin vs destination latitude
  const isManoloToAgora = origin.latitude < destination.latitude
  const stops = isManoloToAgora ? [...DEFAULT_CORRIDOR_STOPS] : [...DEFAULT_CORRIDOR_STOPS].reverse()

  const geometry: [number, number][] = [
    [origin.latitude, origin.longitude],
    ...stops.map(s => s.coords),
    [destination.latitude, destination.longitude],
  ]

  let totalDistance = 0
  for (let i = 0; i < geometry.length - 1; i++) {
    totalDistance += haversineDistance(geometry[i], geometry[i + 1])
  }

  // Approx average speed 35 km/h = ~9.7 m/s
  const duration = Math.round(totalDistance / 9.7)

  // Build steps from corridor key waypoints
  const steps: NavigationStep[] = [
    {
      id: 'step-depart',
      maneuver: 'STRAIGHT',
      distance: 300,
      instruction: 'Head towards Sayre Highway',
      road_name: 'Terminal Exit',
      coordinates: [origin.latitude, origin.longitude],
    },
    {
      id: 'step-sayre',
      maneuver: 'TURN_LEFT',
      distance: 21500,
      instruction: 'Turn left onto Sayre Highway',
      road_name: 'Sayre Highway (Route 10)',
      coordinates: [8.3678, 124.8641],
    },
    {
      id: 'step-puerto',
      maneuver: 'SLIGHT_LEFT',
      distance: 3500,
      instruction: 'Keep left towards Puerto / Butuan-CDO-Iligan Rd',
      road_name: 'Sayre Highway',
      coordinates: [8.4985, 124.7563],
    },
    {
      id: 'step-recto',
      maneuver: 'TURN_LEFT',
      distance: 8800,
      instruction: 'Continue onto C. M. Recto Avenue',
      road_name: 'C. M. Recto Avenue',
      coordinates: [8.5009, 124.7505],
    },
    {
      id: 'step-agora',
      maneuver: 'TURN_RIGHT',
      distance: 400,
      instruction: 'Turn right into Agora Terminal',
      road_name: 'Agora Terminal Rd',
      coordinates: [8.4880, 124.6565],
    },
    {
      id: 'step-arrive',
      maneuver: 'ARRIVE',
      distance: 0,
      instruction: 'Arrive at destination',
      road_name: isManoloToAgora ? 'Agora Terminal' : 'Manolo Fortich Terminal',
      coordinates: [destination.latitude, destination.longitude],
    },
  ]

  return {
    id: `fallback-${Date.now()}`,
    distance: totalDistance,
    duration,
    geometry,
    steps,
  }
}

/**
 * Calculate route using OSRM with graceful fallback
 */
export async function calculateRoute(
  origin: Coordinates,
  destination: Coordinates
): Promise<NavigationRoute> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&steps=true`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6500)

    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Routing service returned status ${response.status}`)
    }

    const data = await response.json()
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found by routing engine')
    }

    const route = data.routes[0]
    const leg = route.legs[0]

    // Convert GeoJSON coordinates [lon, lat] to Leaflet [lat, lon]
    const geometry: [number, number][] = route.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]]
    )

interface OsrmStep {
  name?: string
  distance: number
  duration: number
  maneuver: {
    type: string
    modifier?: string
    location: [number, number]
  }
}

    // Map OSRM steps to our NavigationStep interface
    const steps: NavigationStep[] = (leg.steps || []).map((step: OsrmStep, idx: number) => {
      const maneuverType = mapOsrmManeuver(step.maneuver.type, step.maneuver.modifier)
      const roadName = step.name || ''
      const instruction = buildInstructionText(maneuverType, roadName, step.maneuver.modifier)

      return {
        id: `step-${idx}-${Date.now()}`,
        maneuver: maneuverType,
        distance: Math.round(step.distance),
        instruction,
        road_name: roadName || 'Sayre Highway Corridor',
        coordinates: [step.maneuver.location[1], step.maneuver.location[0]] as [number, number],
      }
    })

    // If steps are empty for any reason, synthesize start and arrival steps
    if (steps.length === 0) {
      steps.push(
        {
          id: 'step-0',
          maneuver: 'STRAIGHT',
          distance: route.distance,
          instruction: 'Follow route ahead',
          road_name: 'Sayre Highway Corridor',
          coordinates: [origin.latitude, origin.longitude],
        },
        {
          id: 'step-1',
          maneuver: 'ARRIVE',
          distance: 0,
          instruction: 'Arrive at destination',
          road_name: 'Destination',
          coordinates: [destination.latitude, destination.longitude],
        }
      )
    }

    return {
      id: `osrm-${Date.now()}`,
      distance: Math.round(route.distance),
      duration: Math.round(route.duration),
      geometry,
      steps,
    }
  } catch (err) {
    console.warn('OSRM routing request failed or timed out, using corridor fallback:', err)
    return generateFallbackRoute(origin, destination)
  }
}
