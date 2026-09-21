import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { GpsLocation } from '../../types'
import type { ParsedStop } from '../../hooks/useRouteStops'
import {
  calculateRoute,
  DEFAULT_CORRIDOR_STOPS,
  DEFAULT_ORIGIN,
  DEFAULT_DESTINATION,
} from '../../services/routingService'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Hide Leaflet attribution and logo (matching public-dashboard)
if (!document.getElementById('leaflet-style-override')) {
  const style = document.createElement('style')
  style.id = 'leaflet-style-override'
  style.textContent = `
    .leaflet-control-attribution {
      display: none !important;
    }
    .pulse-dot {
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @keyframes busPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.8; }
    }
  `
  document.head.appendChild(style)
}

// Custom marker icons matching public-dashboard style
const createCustomIcon = (color: string, size: number = 16) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2]
  })
}

const activeIcon = createCustomIcon('#f59e0b') // Amber for active stops

// Custom Start Terminal Pin
const createStartPin = (terminalName: string) => {
  return L.divIcon({
    className: 'start-pin-marker',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; position: relative; width: 140px; margin-left: -70px; margin-top: -54px; z-index: 1100; cursor: pointer;">
        <div style="
          background: #16A34A;
          color: #ffffff;
          padding: 2px 8px;
          border-radius: 99px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          border: 1.5px solid #FFFFFF;
          box-shadow: 0 4px 12px rgba(22, 163, 74, 0.7);
          margin-bottom: 2px;
          white-space: nowrap;
        ">
          START: ${terminalName.split(' ')[0]}
        </div>
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            background: rgba(34, 197, 94, 0.35);
            animation: busPulse 2s ease-in-out infinite;
          "></div>
          <div style="
            width: 30px;
            height: 30px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            background: linear-gradient(135deg, #22C55E 0%, #15803D 100%);
            border: 2.5px solid #FFFFFF;
            box-shadow: 0 4px 14px rgba(22, 163, 74, 0.75);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="transform: rotate(45deg); color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900;">
              S
            </div>
          </div>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -36],
  })
}

// Custom Destination Terminal Pin (Checkered Flag)
const createDestinationPin = (terminalName: string) => {
  return L.divIcon({
    className: 'destination-pin-marker',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; position: relative; width: 160px; margin-left: -80px; margin-top: -58px; z-index: 1200; cursor: pointer;">
        <div style="
          background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
          color: #ffffff;
          padding: 3px 9px;
          border-radius: 99px;
          font-size: 9.5px;
          font-weight: 900;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          border: 2px solid #FFFFFF;
          box-shadow: 0 4px 16px rgba(220, 38, 38, 0.75);
          margin-bottom: 2px;
          white-space: nowrap;
          animation: emergency-pulse 2s ease-in-out infinite;
        ">
          DESTINATION: ${terminalName.split(' ')[0]}
        </div>
        <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
          <div style="
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            background: rgba(239, 68, 68, 0.4);
            animation: busPulse 1.8s ease-in-out infinite;
          "></div>
          <div style="
            width: 34px;
            height: 34px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            background: linear-gradient(135deg, #EF4444 0%, #B91C1C 100%);
            border: 2.5px solid #FFFFFF;
            box-shadow: 0 4px 16px rgba(220, 38, 38, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="transform: rotate(45deg); color: white; display: flex; align-items: center; justify-content: center;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                <line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -42],
  })
}

const createBusIcon = (location?: string, speed?: number | null) => {
  const speedText = typeof speed === 'number' && speed > 0 ? `${speed.toFixed(0)} km/h` : 'Live'
  const locationText = location || 'Bus Location'
  return L.divIcon({
    className: 'bus-pin-marker',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; position: relative; width: 100px; margin-left: -50px; margin-top: -50px; cursor: pointer;">
        <!-- Floating Label -->
        <div style="
          background: rgba(15, 17, 23, 0.94);
          color: #ffffff;
          padding: 2px 8px;
          border-radius: 99px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.02em;
          border: 1px solid rgba(249, 115, 22, 0.5);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
          white-space: nowrap;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          <span>${locationText}</span>
          <span style="color: #F97316;">•</span>
          <span style="color: #4ADE80;">${speedText}</span>
        </div>

        <!-- Bus Marker Pin with Bus Icon & Radar Pulse -->
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <!-- Pulsing Radar Halo -->
          <div style="
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            background: rgba(249, 115, 22, 0.35);
            animation: busPulse 2s ease-in-out infinite;
          "></div>

          <!-- Circular Badge with Bus Icon -->
          <div style="
            position: relative;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
            border: 2.5px solid #FFFFFF;
            box-shadow: 0 4px 16px rgba(234, 88, 12, 0.7), 0 2px 6px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
          ">
            <!-- Bus SVG Icon -->
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 6v6"/>
              <path d="M15 6v6"/>
              <path d="M2 12h19.6"/>
              <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.7 19.2 6 18.2 6H5.8c-1 0-1.9.7-2.2 1.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"/>
              <circle cx="7" cy="18" r="2"/>
              <path d="M9 18h5"/>
              <circle cx="16" cy="18" r="2"/>
            </svg>
          </div>

          <!-- Pin Arrow Tip at bottom -->
          <div style="
            position: absolute;
            bottom: -5px;
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 7px solid #EA580C;
            filter: drop-shadow(0 2px 2px rgba(0,0,0,0.4));
          "></div>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -32],
  })
}

function RecenterOnBus({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], map.getZoom(), { animate: true }) }, [lat, lng, map])
  return null
}

function MapInvalidator() {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
    const t = setTimeout(() => map.invalidateSize(), 250)
    return () => clearTimeout(t)
  }, [map])
  return null
}

function MapRouteFitter({ coordinates, busStops }: { coordinates: [number, number][], busStops: ParsedStop[] }) {
  const map = useMap()
  
  useEffect(() => {
    if (coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates)
      map.fitBounds(bounds, { padding: [50, 50] })
    } else if (busStops.length > 0) {
      const allCoordinates = busStops.map(stop => [Number(stop.latitude), Number(stop.longitude)] as [number, number])
      const bounds = L.latLngBounds(allCoordinates)
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [coordinates, busStops, map])
  
  return null
}

interface Props {
  stops: ParsedStop[]
  busLocation: GpsLocation | null
  destinationTitle?: string
  routeDirection?: 'manolo_to_agora' | 'agora_to_manolo' | string
}

export default function RouteMap({ stops, busLocation, destinationTitle, routeDirection }: Props) {
  const defaultCenter: [number, number] = [8.43, 124.75] // Center of the route area
  const center: [number, number] = busLocation
    ? [Number(busLocation.latitude), Number(busLocation.longitude)]
    : defaultCenter

  const isAgoraRoute = useMemo(() => {
    if (routeDirection) {
      const lower = routeDirection.toLowerCase()
      if (lower.includes('agora') && (lower.includes('manolo') || lower.includes('agora_to_manolo') || lower === 'agora')) {
        return true
      }
    }
    return stops.length > 0 && stops[0].stop_name.toLowerCase().includes('agora')
  }, [routeDirection, stops])

  const defaultCorridorCoords = useMemo(() => {
    const raw = DEFAULT_CORRIDOR_STOPS.map(s => s.coords)
    return isAgoraRoute ? [...raw].reverse() : raw
  }, [isAgoraRoute])

  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>(defaultCorridorCoords)

  useEffect(() => {
    let active = true
    async function loadRoadRoute() {
      try {
        const origin = isAgoraRoute ? DEFAULT_DESTINATION : DEFAULT_ORIGIN
        const destination = isAgoraRoute ? DEFAULT_ORIGIN : DEFAULT_DESTINATION

        const res = await calculateRoute(origin, destination)
        if (active && res?.geometry && res.geometry.length > 0) {
          setRouteCoordinates(res.geometry)
        }
      } catch {
        if (active && stops.length > 0) {
          setRouteCoordinates(stops.map(s => [Number(s.latitude), Number(s.longitude)]))
        }
      }
    }
    loadRoadRoute()
    return () => { active = false }
  }, [isAgoraRoute, stops])
  
  return (
    <div style={{
      width: '100%', height: '100%',
      borderRadius: 'var(--card-radius)',
      overflow: 'hidden',
      border: '1px solid var(--glass-border)',
      boxShadow: 'var(--glass-shadow)',
    }}>
      <MapContainer center={center} zoom={12} scrollWheelZoom={false} style={{ width: '100%', height: '100%' }} aria-label="Route map">
        <MapInvalidator />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        
        <MapRouteFitter coordinates={routeCoordinates} busStops={stops} />

        {/* Road route line connecting Manolo Fortich and Agora along the highway */}
        {routeCoordinates.length > 0 && (
          <Polyline
            positions={routeCoordinates}
            pathOptions={{
              color: '#F97316',
              weight: 5,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}

        {stops.map((stop) => {
          let icon = activeIcon
          let zIndex = 500
          if (stop.status === 'START') {
            icon = createStartPin(stop.stop_name)
            zIndex = 1100
          } else if (stop.status === 'END') {
            icon = createDestinationPin(destinationTitle || stop.stop_name)
            zIndex = 1200
          }
          
          return (
            <Marker key={`${stop.id}-${stop.status}-${stop.stop_name}`} position={[Number(stop.latitude), Number(stop.longitude)]} icon={icon} zIndexOffset={zIndex}>
              <Popup>
                <div style={{ fontSize: 12, background: '#1E2130', color: '#F3F4F6', padding: '6px 8px', borderRadius: 8 }}>
                  <strong>{stop.stop_name}</strong>
                  <br /><span style={{ color: '#9CA3AF' }}>{stop.stop} ({stop.status})</span>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {busLocation && (
          <>
            <Marker position={[Number(busLocation.latitude), Number(busLocation.longitude)]} icon={createBusIcon('Bus', busLocation.speed)} zIndexOffset={1000}>
              <Popup>
                <div style={{ fontSize: 12, background: '#1E2130', color: '#F3F4F6', padding: '6px 8px', borderRadius: 8 }}>
                  <strong>Bus Location</strong><br />
                  <span style={{ color: '#9CA3AF' }}>{Number(busLocation.speed ?? 0).toFixed(1)} km/h</span>
                </div>
              </Popup>
            </Marker>
            <RecenterOnBus lat={Number(busLocation.latitude)} lng={Number(busLocation.longitude)} />
          </>
        )}
      </MapContainer>
    </div>
  )
}
