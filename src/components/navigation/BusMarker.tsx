import { useMemo } from 'react'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import type { GpsLocation } from '../../types'

interface Props {
  location: GpsLocation
  heading?: number
  busNumber?: string | number | null
}

export default function BusMarker({ location, heading = 0, busNumber }: Props) {
  const icon = useMemo(() => {
    const busLabel = busNumber ? `Bus ${busNumber}` : 'OMANFORTSCO'
    const speedText = `${Number(location.speed ?? 0).toFixed(0)} km/h`

    // Leaflet divIcon with rotating pointer and custom CommutAI vehicle badge
    return L.divIcon({
      className: 'commutai-bus-marker-wrapper',
      html: `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          width: 90px;
          height: 90px;
          margin-left: -45px;
          margin-top: -45px;
          pointer-events: none;
        ">
          <!-- Floating Label -->
          <div style="
            background: rgba(15, 17, 23, 0.9);
            color: #ffffff;
            padding: 2px 8px;
            border-radius: 99px;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.02em;
            border: 1px solid rgba(249, 115, 22, 0.4);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            white-space: nowrap;
            margin-bottom: 2px;
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span>${busLabel}</span>
            <span style="color: #F97316;">•</span>
            <span style="color: #4ADE80;">${speedText}</span>
          </div>

          <!-- Rotating Vehicle Beacon -->
          <div style="
            position: relative;
            width: 52px;
            height: 52px;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(${heading}deg);
            transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
          ">
            <!-- Pulsing outer glow -->
            <div style="
              position: absolute;
              width: 52px;
              height: 52px;
              border-radius: 50%;
              background: rgba(249, 115, 22, 0.25);
              animation: busPulse 2s infinite ease-in-out;
            "></div>

            <!-- Direction arrow tip -->
            <div style="
              position: absolute;
              top: -2px;
              width: 0;
              height: 0;
              border-left: 7px solid transparent;
              border-right: 7px solid transparent;
              border-bottom: 11px solid #EA580C;
              filter: drop-shadow(0 -2px 4px rgba(249, 115, 22, 0.8));
            "></div>

            <!-- Vehicle Body Circle -->
            <div style="
              position: relative;
              width: 40px;
              height: 40px;
              border-radius: 50%;
              background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
              border: 3px solid #FFFFFF;
              box-shadow: 0 4px 16px rgba(234, 88, 12, 0.65), 0 2px 6px rgba(0,0,0,0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #FFFFFF;
            ">
              <!-- Custom Bus Icon SVG inside vehicle marker -->
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 6v6"/>
                <path d="M15 6v6"/>
                <path d="M2 12h19.6"/>
                <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.7 19.2 6 18.2 6H5.8c-1 0-1.9.7-2.2 1.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"/>
                <circle cx="7" cy="18" r="2"/>
                <path d="M9 18h5"/>
                <circle cx="16" cy="18" r="2"/>
              </svg>
            </div>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
      popupAnchor: [0, -32],
    })
  }, [location.speed, heading, busNumber])

  return (
    <Marker
      position={[Number(location.latitude), Number(location.longitude)]}
      icon={icon}
      zIndexOffset={1500}
    >
      <Popup>
        <div style={{ fontSize: 13, background: '#1E2130', color: '#F3F4F6', padding: '8px 10px', borderRadius: 8 }}>
          <div style={{ fontWeight: 800, color: '#F97316', marginBottom: 2 }}>
            {busNumber ? `Bus ${busNumber}` : 'OMANFORTSCO Bus'}
          </div>
          <div>Speed: <strong>{Number(location.speed ?? 0).toFixed(1)} km/h</strong></div>
          <div>Heading: <strong>{heading}°</strong></div>
          <div>Accuracy: <strong>±{Number(location.accuracy ?? 10).toFixed(0)}m</strong></div>
        </div>
      </Popup>
    </Marker>
  )
}
