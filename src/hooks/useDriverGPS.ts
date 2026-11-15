import { useState, useEffect, useRef, useCallback } from 'react'
import type { GpsLocation, GpsStatus } from '../types'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../contexts/RealtimeContext'
import { calculateBearing, haversineDistance } from '../utils/geoUtils'

export interface DriverGpsState {
  location: GpsLocation | null
  heading: number
  speed: number // in km/h
  accuracy: number | null
  gpsStatus: GpsStatus
  lastUpdate: Date | null
  source: 'fastapi' | 'supabase' | 'device' | 'none'
  isSharingGps: boolean
  setIsSharingGps: (val: boolean) => void
  refetch: () => void
}

const FASTAPI_URL = import.meta.env.VITE_FASTAPI_GPS_URL || null

/**
 * Hook to read and toggle driver GPS location sharing state.
 * Synchronized across all components via CustomEvent and localStorage.
 */
export function useGpsSharing() {
  const [isSharingGps, setIsSharingGpsState] = useState<boolean>(() => {
    const saved = localStorage.getItem('driver_share_gps')
    return saved !== null ? saved === 'true' : true
  })

  useEffect(() => {
    const handleSync = (e: any) => {
      if (e?.detail !== undefined) {
        setIsSharingGpsState(Boolean(e.detail))
      } else {
        const saved = localStorage.getItem('driver_share_gps')
        setIsSharingGpsState(saved !== null ? saved === 'true' : true)
      }
    }

    window.addEventListener('driver_gps_sharing_changed', handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.removeEventListener('driver_gps_sharing_changed', handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [])

  const setIsSharingGps = useCallback((val: boolean) => {
    setIsSharingGpsState(val)
    try {
      localStorage.setItem('driver_share_gps', String(val))
    } catch {}
    window.dispatchEvent(new CustomEvent('driver_gps_sharing_changed', { detail: val }))
  }, [])

  return { isSharingGps, setIsSharingGps }
}

export function useDriverGPS(tripId?: string | null): DriverGpsState {
  const { latestLocation } = useRealtime()

  const [location, setLocation] = useState<GpsLocation | null>(null)
  const [heading, setHeading] = useState<number>(0)
  const [speed, setSpeed] = useState<number>(0)
  const [accuracy, setAccuracy] = useState<number | null>(10)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('disconnected')
  const [activeSource, setActiveSource] = useState<'fastapi' | 'supabase' | 'device' | 'none'>('none')

  // Driver phone GPS sharing toggle (synced across entire application)
  const { isSharingGps, setIsSharingGps } = useGpsSharing()

  const lastUploadTimeRef = useRef<number>(0)
  const lastUploadPosRef = useRef<{ lat: number; lng: number } | null>(null)

  // Upload helper to push driver phone coordinates to Supabase & onboard Pi
  const uploadDriverLocation = useCallback(async (
    lat: number,
    lng: number,
    inSpeed: number,
    inHeading: number,
    inAccuracy: number | null
  ) => {
    if (!isSharingGps) return
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return
    if (inAccuracy != null && inAccuracy > 150) return // Skip inaccurate fixes

    const now = Date.now()
    // Throttle updates to at most once every 4 seconds or when moving > 8 meters
    const timeSinceLast = now - lastUploadTimeRef.current
    if (timeSinceLast < 4000) {
      if (lastUploadPosRef.current) {
        const moved = haversineDistance(
          [lastUploadPosRef.current.lat, lastUploadPosRef.current.lng],
          [lat, lng]
        )
        if (moved < 8) return
      } else {
        return
      }
    }

    lastUploadTimeRef.current = now
    lastUploadPosRef.current = { lat, lng }

    try {
      // 1. Insert into gps_locations
      await (supabase.from('gps_locations') as any).insert({
        latitude: lat,
        longitude: lng,
        speed: inSpeed,
        heading: inHeading,
        accuracy: inAccuracy ?? 5,
        source: 'driver_phone_gps',
        trip_id: tripId ?? null,
        recorded_at: new Date(now).toISOString()
      })

      // 2. If active trip, update trip's current_lat, current_lng, and last location timestamp (gps_updated_at)
      if (tripId) {
        await (supabase.from('trips') as any).update({
          current_lat: lat,
          current_lng: lng,
          gps_updated_at: new Date(now).toISOString()
        }).eq('id', tripId)
      }

      // 3. Send background POST requests to onboard Raspberry Pi
      const piEndpoints = [
        'http://192.168.1.54:8080/set-location',
        'http://localhost:8080/set-location',
      ]
      if (FASTAPI_URL) {
        const customUrl = FASTAPI_URL.replace('/location', '/set-location')
        if (!piEndpoints.includes(customUrl)) {
          piEndpoints.push(customUrl)
        }
      }

      const payload = JSON.stringify({
        latitude: lat,
        longitude: lng,
        speed: inSpeed,
        source: 'driver_phone_gps'
      })

      piEndpoints.forEach((url) => {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          signal: AbortSignal.timeout(1500)
        }).catch(() => {})
      })
    } catch (err) {
      console.warn('[Driver GPS Upload Error]:', err)
    }
  }, [isSharingGps, tripId])

  // Previous position ref for heading / speed calculation
  const prevPositionRef = useRef<{ lat: number; lng: number; time: number } | null>(null)
  const fastApiOfflineRef = useRef<boolean>(false)

  // Update location helper with heading calculation
  const updateGpsData = useCallback((
    lat: number,
    lng: number,
    inSpeed: number | null | undefined,
    inHeading: number | null | undefined,
    inAccuracy: number | null | undefined,
    sourceName: 'fastapi' | 'supabase' | 'device',
    altitude: number | null = null
  ) => {
    const now = Date.now()
    let resolvedHeading = inHeading ?? 0

    // Compute heading dynamically if hardware heading is not provided or zero, and bus has moved
    if (prevPositionRef.current && (inHeading == null || inHeading === 0)) {
      const movedDist = haversineDistance(
        [prevPositionRef.current.lat, prevPositionRef.current.lng],
        [lat, lng]
      )
      if (movedDist >= 2.5) {
        resolvedHeading = calculateBearing(
          [prevPositionRef.current.lat, prevPositionRef.current.lng],
          [lat, lng]
        )
      } else {
        resolvedHeading = heading
      }
    }

    // Compute speed if not provided
    let resolvedSpeed = inSpeed ?? 0
    if (prevPositionRef.current && (inSpeed == null || isNaN(inSpeed))) {
      const timeDeltaSec = (now - prevPositionRef.current.time) / 1000
      if (timeDeltaSec > 0.5) {
        const distMeters = haversineDistance(
          [prevPositionRef.current.lat, prevPositionRef.current.lng],
          [lat, lng]
        )
        resolvedSpeed = (distMeters / timeDeltaSec) * 3.6 // m/s to km/h
      }
    }

    prevPositionRef.current = { lat, lng, time: now }

    const newLoc: GpsLocation = {
      id: `gps-${now}`,
      latitude: lat,
      longitude: lng,
      speed: Number(resolvedSpeed.toFixed(1)),
      accuracy: inAccuracy != null ? Number(inAccuracy.toFixed(1)) : 8,
      altitude,
      source: sourceName,
      trip_id: tripId ?? null,
      satellite_count: 12,
      fix_quality: 1,
      recorded_at: new Date(now).toISOString(),
      created_at: new Date(now).toISOString(),
    }

    setLocation(newLoc)
    setHeading(Math.round(resolvedHeading))
    setSpeed(Math.max(0, Math.round(resolvedSpeed)))
    setAccuracy(newLoc.accuracy)
    setLastUpdate(new Date(now))
    setActiveSource(sourceName)
    setGpsStatus('connected')

    // Automatically broadcast driver phone GPS to Supabase fleet system
    if (sourceName === 'device') {
      uploadDriverLocation(lat, lng, Number(resolvedSpeed.toFixed(1)), Math.round(resolvedHeading), inAccuracy ?? null)
    }
  }, [heading, tripId, uploadDriverLocation])

  // ── Source 1: Device Hardware GPS (Continuous Watch & Immediate Fix) ──
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    // Immediate initial fix
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateGpsData(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.speed ? pos.coords.speed * 3.6 : 0,
          pos.coords.heading ?? 0,
          pos.coords.accuracy,
          'device',
          pos.coords.altitude ?? undefined
        )
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    )

    // Continuous watchPosition as the vehicle drives
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        updateGpsData(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.speed ? pos.coords.speed * 3.6 : 0,
          pos.coords.heading ?? 0,
          pos.coords.accuracy,
          'device',
          pos.coords.altitude ?? undefined
        )
      },
      (err) => {
        console.warn('Hardware GPS error:', err.message)
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [updateGpsData])

  // ── Source 2: Poll FastAPI GPS endpoint (if vehicle has onboard GPS server) ──
  const pollFastApi = useCallback(async () => {
    if (!FASTAPI_URL || fastApiOfflineRef.current) return false
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 2000)

      const res = await fetch(FASTAPI_URL, { signal: controller.signal })
      clearTimeout(timeout)

      if (res.ok) {
        const data = await res.json()
        if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          updateGpsData(
            data.latitude,
            data.longitude,
            data.speed,
            data.heading,
            data.accuracy,
            'fastapi',
            data.altitude
          )
          return true
        }
      }
    } catch {
      fastApiOfflineRef.current = true
    }
    return false
  }, [updateGpsData])

  // ── Source 3: Supabase GPS Fetch (gps_locations or trips table) ──
  const fetchSupabaseGps = useCallback(async () => {
    if (!tripId) return false
    try {
      // 1. Try gps_locations table
      const { data } = await (supabase.from('gps_locations') as any)
        .select('*')
        .eq('trip_id', tripId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle() as { data: any }

      if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        updateGpsData(
          data.latitude,
          data.longitude,
          data.speed,
          data.heading ?? 0,
          data.accuracy ?? 10,
          'supabase',
          data.altitude
        )
        return true
      }

      // 2. Try trips table current_lat / current_lng from conductor app
      const { data: tripData } = await (supabase.from('trips') as any)
        .select('current_lat, current_lng, gps_updated_at')
        .eq('id', tripId)
        .maybeSingle() as { data: any }

      if (tripData && typeof tripData.current_lat === 'number' && typeof tripData.current_lng === 'number') {
        updateGpsData(
          tripData.current_lat,
          tripData.current_lng,
          0,
          0,
          12,
          'supabase'
        )
        return true
      }
    } catch (e) {
      console.warn('Error fetching Supabase GPS:', e)
    }
    return false
  }, [tripId, updateGpsData])

  // Combined fetch
  const fetchGps = useCallback(async () => {
    const fastApiOk = await pollFastApi()
    if (!fastApiOk) {
      await fetchSupabaseGps()
    }
  }, [pollFastApi, fetchSupabaseGps])

  // Periodic polling for backend GPS (every 10 seconds)
  useEffect(() => {
    fetchGps()
    const interval = setInterval(fetchGps, 10000)
    return () => clearInterval(interval)
  }, [fetchGps])

  // Supabase Realtime update listener
  useEffect(() => {
    if (!latestLocation) return
    const loc = latestLocation as any
    if (tripId && loc.trip_id && loc.trip_id !== tripId) return

    if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
      updateGpsData(
        loc.latitude,
        loc.longitude,
        loc.speed,
        loc.heading,
        loc.accuracy,
        'supabase',
        loc.altitude
      )
    }
  }, [latestLocation, tripId, updateGpsData])

  // Check GPS signal staleness
  useEffect(() => {
    const checkStatus = () => {
      if (!lastUpdate) {
        setGpsStatus('disconnected')
        return
      }
      const ageMs = Date.now() - lastUpdate.getTime()
      if (ageMs < 15_000) {
        setGpsStatus(accuracy && accuracy > 30 ? 'poor' : 'connected')
      } else if (ageMs < 60_000) {
        setGpsStatus('poor')
      } else {
        setGpsStatus('disconnected')
      }
    }

    const timer = setInterval(checkStatus, 3000)
    return () => clearInterval(timer)
  }, [lastUpdate, accuracy])

  return {
    location,
    heading,
    speed,
    accuracy,
    gpsStatus,
    lastUpdate,
    source: activeSource,
    isSharingGps,
    setIsSharingGps,
    refetch: fetchGps,
  }
}
