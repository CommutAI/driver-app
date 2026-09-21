import { useMemo } from 'react'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import type { Coordinates } from '../../types'

interface Props {
  destination: Coordinates
  title?: string
}

export default function DestinationMarker({ destination, title = 'Destination Terminal' }: Props) {
  const icon = useMemo(() => {
    return L.divIcon({
      className: 'commutai-destination-marker',
      html: `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          width: 80px;
          height: 60px;
          margin-left: -40px;
          margin-top: -50px;
        ">
          <!-- Terminal Flag Badge -->
          <div style="
            background: #EF4444;
            color: #ffffff;
            width: 36px;
            height: 36px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid #ffffff;
            box-shadow: 0 4px 14px rgba(239, 68, 68, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
              <!-- Checkered Flag Icon -->
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                <line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
            </div>
          </div>
          <div style="
            margin-top: 4px;
            background: rgba(15, 17, 23, 0.9);
            color: #FFFFFF;
            font-size: 10px;
            font-weight: 800;
            padding: 2px 6px;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            white-space: nowrap;
          ">
            ${title}
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
      popupAnchor: [0, -45],
    })
  }, [title])

  return (
    <Marker position={[destination.latitude, destination.longitude]} icon={icon}>
      <Popup>
        <div style={{ fontSize: 13, background: '#1E2130', color: '#F3F4F6', padding: '6px 8px', borderRadius: 8 }}>
          <strong>{title}</strong>
          <br />
          <span style={{ color: '#9CA3AF' }}>Trip Destination</span>
        </div>
      </Popup>
    </Marker>
  )
}
