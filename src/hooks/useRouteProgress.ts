import { useState, useEffect, useRef, useMemo } from 'react'
import type { Coordinates, NavigationRoute, NavigationStep, RouteProgress } from '../types'
import { haversineDistance, minDistanceToPolyline } from '../utils/geoUtils'

interface UseRouteProgressResult {
  progress: RouteProgress | null
  currentStep: NavigationStep | null
  nextStep: NavigationStep | null
  distanceToNextManeuver: number // in meters
  currentRoadName: string
}

// Distance in meters to trigger step completion
const STEP_COMPLETION_RADIUS_METERS = 45

export function useRouteProgress(
  route: NavigationRoute | null,
  currentLocation: Coordinates | null,
  currentSpeed: number // in km/h
): UseRouteProgressResult {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)
  const prevRouteIdRef = useRef<string | null>(null)

  // Reset step index when a brand new route is calculated
  useEffect(() => {
    if (route && route.id !== prevRouteIdRef.current) {
      prevRouteIdRef.current = route.id
      setCurrentStepIndex(0)
    }
  }, [route])

  // Step advancement logic
  useEffect(() => {
    if (!route || !route.steps || route.steps.length === 0 || !currentLocation) return

    const steps = route.steps
    const currentStep = steps[currentStepIndex]
    if (!currentStep) return

    const distToStep = haversineDistance(
      [currentLocation.latitude, currentLocation.longitude],
      currentStep.coordinates
    )

    // Advance if within threshold and there is a next step
    if (distToStep <= STEP_COMPLETION_RADIUS_METERS && currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(idx => idx + 1)
      return
    }

    // Also check if bus is closer to the next step's maneuver
    if (currentStepIndex < steps.length - 1) {
      const nextStep = steps[currentStepIndex + 1]
      const distToNext = haversineDistance(
        [currentLocation.latitude, currentLocation.longitude],
        nextStep.coordinates
      )
      if (distToNext < distToStep * 0.7 && distToStep > 80) {
        setCurrentStepIndex(idx => idx + 1)
      }
    }
  }, [currentLocation, route, currentStepIndex])

  const progressData = useMemo<UseRouteProgressResult>(() => {
    if (!route || !currentLocation || route.geometry.length === 0) {
      return {
        progress: null,
        currentStep: null,
        nextStep: null,
        distanceToNextManeuver: 0,
        currentRoadName: 'Sayre Highway Corridor',
      }
    }

    const steps = route.steps
    const activeStep = steps[currentStepIndex] || steps[0] || null
    const upcomingStep = steps[currentStepIndex + 1] || null

    // Distance to maneuver: from bus position to the active/next maneuver coordinate
    const targetCoords = activeStep ? activeStep.coordinates : route.geometry[route.geometry.length - 1]
    const distanceToNextManeuver = Math.round(
      haversineDistance([currentLocation.latitude, currentLocation.longitude], targetCoords)
    )

    // Find nearest point on route polyline to compute remaining distance
    const { nearestSegmentIndex } = minDistanceToPolyline(
      [currentLocation.latitude, currentLocation.longitude],
      route.geometry
    )

    // Sum remaining polyline distance from nearest segment to destination
    let distRemaining = 0
    for (let i = nearestSegmentIndex; i < route.geometry.length - 1; i++) {
      distRemaining += haversineDistance(route.geometry[i], route.geometry[i + 1])
    }

    const totalDistance = Math.max(1, route.distance)
    const distanceRemaining = Math.min(totalDistance, Math.round(distRemaining))
    const distanceTraveled = Math.max(0, totalDistance - distanceRemaining)
    const progressPercentage = Math.min(100, Math.round((distanceTraveled / totalDistance) * 100))

    // Estimate remaining travel time
    let estimatedTimeRemaining: number
    if (currentSpeed >= 15) {
      const speedMetersPerSec = (currentSpeed * 1000) / 3600
      estimatedTimeRemaining = Math.round(distanceRemaining / speedMetersPerSec)
    } else {
      // Scale total estimated duration by remaining distance ratio
      const ratio = distanceRemaining / totalDistance
      estimatedTimeRemaining = Math.round(route.duration * ratio)
    }

    const progress: RouteProgress = {
      distance_traveled: distanceTraveled,
      distance_remaining: distanceRemaining,
      progress_percentage: progressPercentage,
      current_step_index: currentStepIndex,
      next_step: activeStep,
      estimated_time_remaining: Math.max(60, estimatedTimeRemaining),
    }

    return {
      progress,
      currentStep: activeStep,
      nextStep: upcomingStep,
      distanceToNextManeuver,
      currentRoadName: activeStep?.road_name || 'Sayre Highway',
    }
  }, [route, currentLocation, currentSpeed, currentStepIndex])

  return progressData
}
