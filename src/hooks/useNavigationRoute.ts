import { useState, useEffect, useRef, useCallback } from 'react'
import type { Coordinates, NavigationRoute } from '../types'
import { calculateRoute } from '../services/routingService'
import { minDistanceToPolyline } from '../utils/geoUtils'

interface UseNavigationRouteResult {
  route: NavigationRoute | null
  isCalculating: boolean
  isRecalculating: boolean
  isOffRoute: boolean
  offRouteDistance: number
  error: string | null
  recalculateRoute: () => Promise<void>
}

// Distance threshold for off-route detection (meters)
const OFF_ROUTE_THRESHOLD_METERS = 85
// Cooldown between recalculation requests (ms)
const RECALC_COOLDOWN_MS = 10_000

export function useNavigationRoute(
  currentLocation: Coordinates | null,
  destination: Coordinates
): UseNavigationRouteResult {
  const [route, setRoute] = useState<NavigationRoute | null>(null)
  const [isCalculating, setIsCalculating] = useState<boolean>(false)
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false)
  const [isOffRoute, setIsOffRoute] = useState<boolean>(false)
  const [offRouteDistance, setOffRouteDistance] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  const offRouteCountRef = useRef<number>(0)
  const lastRecalcTimeRef = useRef<number>(0)
  const initialCalculatedRef = useRef<boolean>(false)

  // Compute route from current location to destination
  const computeRoute = useCallback(
    async (isRecalc = false) => {
      if (!currentLocation || !destination) return

      if (isRecalc) {
        setIsRecalculating(true)
      } else {
        setIsCalculating(true)
      }
      setError(null)

      try {
        const calculated = await calculateRoute(currentLocation, destination)
        setRoute(calculated)
        setIsOffRoute(false)
        offRouteCountRef.current = 0
        lastRecalcTimeRef.current = Date.now()
      } catch (err: any) {
        setError(err?.message || 'Failed to calculate route')
      } finally {
        setIsCalculating(false)
        setIsRecalculating(false)
      }
    },
    [currentLocation?.latitude, currentLocation?.longitude, destination.latitude, destination.longitude] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Initial calculation when location first becomes available
  useEffect(() => {
    if (currentLocation && !initialCalculatedRef.current) {
      initialCalculatedRef.current = true
      computeRoute(false)
    }
  }, [currentLocation, computeRoute])

  // Monitor off-route status as GPS updates
  useEffect(() => {
    if (!currentLocation || !route || route.geometry.length === 0) return

    const { distance } = minDistanceToPolyline(
      [currentLocation.latitude, currentLocation.longitude],
      route.geometry
    )
    setOffRouteDistance(Math.round(distance))

    if (distance > OFF_ROUTE_THRESHOLD_METERS) {
      offRouteCountRef.current += 1

      // Trigger off-route after 3 consecutive confirmations
      if (offRouteCountRef.current >= 3) {
        setIsOffRoute(true)

        // Debounce recalculation
        const now = Date.now()
        if (now - lastRecalcTimeRef.current > RECALC_COOLDOWN_MS && !isRecalculating) {
          computeRoute(true)
        }
      }
    } else {
      offRouteCountRef.current = 0
      if (isOffRoute) {
        setIsOffRoute(false)
      }
    }
  }, [currentLocation, route, isRecalculating, isOffRoute, computeRoute])

  return {
    route,
    isCalculating,
    isRecalculating,
    isOffRoute,
    offRouteDistance,
    error,
    recalculateRoute: () => computeRoute(true),
  }
}
