import { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Coordinates, GpsLocation, NavigationRoute } from '../../types'
import BusMarker from './BusMarker'
import DestinationMarker from './DestinationMarker'
import RoutePolyline from './RoutePolyline'
import RecenterButton from './RecenterButton'
import RerouteButton from './RerouteButton'

interface Props {
  busLocation: GpsLocation | null
  heading?: number
  route: NavigationRoute | null
  destination: Coordinates
  destinationTitle?: string
  busNumber?: string | number | null
  onReroute?: () => void
}

/**
 * Controller component for the navigation camera behavior
 */
function NavigationCameraController({
  busLocation,
  heading = 0,
  isFollowing,
  setIsFollowing,
  routeGeometry,
}: {
  busLocation: GpsLocation | null
  heading: number
  isFollowing: boolean
  setIsFollowing: (following: boolean) => void
  routeGeometry: [number, number][]
}) {
  const map = useMap()
  const userInteractedRef = useRef<boolean>(false)
  const isInitialFitRef = useRef<boolean>(false)

  // Listen to user drag/pan/zoom to pause following
  useEffect(() => {
    const onUserInteractionStart = () => {
      userInteractedRef.current = true
      setIsFollowing(false)
    }

    map.on('dragstart', onUserInteractionStart)
    map.on('zoomstart', onUserInteractionStart)

    return () => {
      map.off('dragstart', onUserInteractionStart)
      map.off('zoomstart', onUserInteractionStart)
    }
  }, [map, setIsFollowing])

  // Initial fit bounds when route first loads
  useEffect(() => {
    if (!isInitialFitRef.current && routeGeometry && routeGeometry.length > 1) {
      isInitialFitRef.current = true
      const bounds = L.latLngBounds(routeGeometry)
      map.fitBounds(bounds, {
        paddingTopLeft: [80, 40],
        paddingBottomRight: [40, 180],
        maxZoom: 15,
      })
    }
  }, [routeGeometry, map])

  // Follow bus with navigation offset (bus slightly below center to show road ahead)
  useEffect(() => {
    if (!isFollowing || !busLocation) return

    const lat = Number(busLocation.latitude)
    const lng = Number(busLocation.longitude)

    // Project center ahead of the bus along its travel direction (~200m ahead)
    const offsetDistance = 0.0018 // approx 200m
    const rad = (heading * Math.PI) / 180
    const targetLat = lat + offsetDistance * Math.cos(rad)
    const targetLng = lng + offsetDistance * Math.sin(rad)

    const targetZoom = Math.max(15, map.getZoom())

    map.setView([targetLat, targetLng], targetZoom, {
      animate: true,
      duration: 0.8,
    })
  }, [busLocation?.latitude, busLocation?.longitude, heading, isFollowing, map]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

function MapInvalidator() {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
    const t1 = setTimeout(() => map.invalidateSize(), 150)
    const t2 = setTimeout(() => map.invalidateSize(), 500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [map])
  return null
}

export default function NavigationMap({
  busLocation,
  heading = 0,
  route,
  destination,
  destinationTitle,
  busNumber,
  onReroute,
}: Props) {
  const [isFollowing, setIsFollowing] = useState<boolean>(true)
  const mapRef = useRef<L.Map | null>(null)

  const defaultCenter: [number, number] = busLocation
    ? [Number(busLocation.latitude), Number(busLocation.longitude)]
    : [destination.latitude, destination.longitude]

  const handleRecenter = useCallback(() => {
    setIsFollowing(true)
    if (mapRef.current && busLocation) {
      const lat = Number(busLocation.latitude)
      const lng = Number(busLocation.longitude)

      const offsetDistance = 0.0018
      const rad = (heading * Math.PI) / 180
      const targetLat = lat + offsetDistance * Math.cos(rad)
      const targetLng = lng + offsetDistance * Math.sin(rad)

      // Zoom to 15 for recenter
      mapRef.current.flyTo([targetLat, targetLng], 15, {
        animate: true,
        duration: 0.8,
      })
    }
  }, [busLocation, heading])

  const handleZoomTo16 = useCallback(() => {
    if (mapRef.current && busLocation) {
      const lat = Number(busLocation.latitude)
      const lng = Number(busLocation.longitude)

      const offsetDistance = 0.0018
      const rad = (heading * Math.PI) / 180
      const targetLat = lat + offsetDistance * Math.cos(rad)
      const targetLng = lng + offsetDistance * Math.sin(rad)

      // Zoom to 16 for reroute
      mapRef.current.flyTo([targetLat, targetLng], 16, {
        animate: true,
        duration: 0.8,
      })
    }
  }, [busLocation, heading])

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#0B0F19',
      }}
    >
      <MapContainer
        center={defaultCenter}
        zoom={16}
        scrollWheelZoom={true}
        zoomControl={false}
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
        minZoom={10}
        maxZoom={18}
      >
        <MapInvalidator />

        {/* Modern clean tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
        />

        {/* Camera controller for smooth navigation tracking */}
        <NavigationCameraController
          busLocation={busLocation}
          heading={heading}
          isFollowing={isFollowing}
          setIsFollowing={setIsFollowing}
          routeGeometry={route?.geometry || []}
        />

        {/* Route line */}
        {route && (
          <RoutePolyline geometry={route.geometry} />
        )}

        {/* Destination Terminal Marker */}
        <DestinationMarker destination={destination} title={destinationTitle} />

        {/* Live CommutAI Bus Marker */}
        {busLocation && (
          <BusMarker
            location={busLocation}
            heading={heading}
            busNumber={busNumber}
          />
        )}
      </MapContainer>

      {/* Floating Re-center button when driver manually pans the map */}
      <RecenterButton onClick={handleRecenter} visible={!isFollowing} />

      {/* Floating Reroute button */}
      <RerouteButton 
        onClick={onReroute || (() => {})} 
        visible={true} 
        onZoomTo16={handleZoomTo16}
      />
    </div>
  )
}
