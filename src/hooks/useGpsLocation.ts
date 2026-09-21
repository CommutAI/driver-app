// ─────────────────────────────────────────────────────────────
//  useGpsLocation — latest GPS record from gps_locations
//  In the shared schema GPS is keyed by trip_id (not bus_id)
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { supabase }    from '../lib/supabase'
import { useRealtime } from '../contexts/RealtimeContext'
import type { GpsLocation, GpsStatus } from '../types'

interface State {
  location: GpsLocation | null
  gpsStatus: GpsStatus
  lastUpdate: Date | null
  loading: boolean
  refetch: () => void
}

export function useGpsLocation(tripId: string | null | undefined): State {
  const { latestLocation }      = useRealtime()
  const [location, setLocation] = useState<GpsLocation | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetch = useCallback(async () => {
    if (!tripId) {
      // Check browser device geolocation if no tripId is currently active
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const devLoc: GpsLocation = {
              id: `device-gps-${Date.now()}`,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              altitude: pos.coords.altitude ?? null,
              speed: pos.coords.speed ? pos.coords.speed * 3.6 : 0,
              accuracy: pos.coords.accuracy,
              source: 'device',
              trip_id: null,
              satellite_count: null,
              fix_quality: null,
              recorded_at: new Date(pos.timestamp).toISOString(),
              created_at: new Date(pos.timestamp).toISOString(),
            }
            setLocation(devLoc)
            setLastUpdate(new Date(pos.timestamp))
          },
          () => {},
          { enableHighAccuracy: true, timeout: 4000, maximumAge: 15000 }
        )
      }
      return
    }
    setLoading(true)

    try {
      const { data } = await (supabase
        .from('gps_locations') as any)
        .select('*')
        .eq('trip_id', tripId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle() as { data: GpsLocation | null }

      if (data) {
        setLocation(data)
        setLastUpdate(new Date(data.recorded_at))
      } else {
        // Check trips table current_lat / current_lng from conductor app
        const { data: tripData } = await (supabase
          .from('trips') as any)
          .select('current_lat, current_lng, gps_updated_at')
          .eq('id', tripId)
          .maybeSingle() as { data: { current_lat: number | null; current_lng: number | null; gps_updated_at: string | null } | null }

        if (tripData && typeof tripData.current_lat === 'number' && typeof tripData.current_lng === 'number') {
          const recTime = tripData.gps_updated_at || new Date().toISOString()
          setLocation({
            id: `trip-gps-${tripId}`,
            latitude: tripData.current_lat,
            longitude: tripData.current_lng,
            altitude: null,
            speed: 0,
            accuracy: 12,
            source: 'gps',
            trip_id: tripId,
            satellite_count: null,
            fix_quality: null,
            recorded_at: recTime,
            created_at: recTime,
          })
          setLastUpdate(new Date(recTime))
        } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const devLoc: GpsLocation = {
                id: `device-gps-${Date.now()}`,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                altitude: pos.coords.altitude ?? null,
                speed: pos.coords.speed ? pos.coords.speed * 3.6 : 0,
                accuracy: pos.coords.accuracy,
                source: 'device',
                trip_id: tripId,
                satellite_count: null,
                fix_quality: null,
                recorded_at: new Date(pos.timestamp).toISOString(),
                created_at: new Date(pos.timestamp).toISOString(),
              }
              setLocation(devLoc)
              setLastUpdate(new Date(pos.timestamp))
            },
            () => {},
            { enableHighAccuracy: true, timeout: 4000, maximumAge: 15000 }
          )
        }
      }
    } catch (err) {
      console.warn('Error fetching GPS in useGpsLocation:', err)
    } finally {
      setLoading(false)
    }
  }, [tripId])

  useEffect(() => { fetch() }, [fetch])

  // Merge realtime GPS pushes keyed by trip_id
  useEffect(() => {
    if (!latestLocation) return
    const loc = latestLocation as any
    if (loc.trip_id !== tripId) return
    setLocation(loc as GpsLocation)
    setLastUpdate(new Date(loc.recorded_at))
  }, [latestLocation, tripId])

  // Derive GPS status: if we have a recent location assume connected,
  // otherwise disconnected. The shared schema has no gps_status enum column.
  const gpsStatus: GpsStatus = (() => {
    if (!location) return 'disconnected'
    const ageMs = Date.now() - new Date(location.recorded_at).getTime()
    if (ageMs < 60_000)  return 'connected'   // < 1 min = live
    if (ageMs < 300_000) return 'poor'         // 1–5 min = weak
    return 'disconnected'
  })()

  return { location, gpsStatus, lastUpdate, loading, refetch: fetch }
}
