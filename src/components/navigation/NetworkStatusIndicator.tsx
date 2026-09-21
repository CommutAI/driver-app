import { WifiOff, Loader2 } from 'lucide-react'
import type { NetworkStatus } from '../../hooks/useNetworkStatus'

interface Props {
  network: NetworkStatus
}

export default function NetworkStatusIndicator({ network }: Props) {
  if (network.isOnline && !network.isReconnecting) return null

  return (
    <div
      role="alert"
      style={{
        position: 'absolute',
        top: 104, // Right below the top instruction card
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 14px',
        background: network.isReconnecting ? 'rgba(234, 179, 8, 0.95)' : 'rgba(239, 68, 68, 0.95)',
        color: '#FFFFFF',
        borderRadius: 99,
        fontSize: '0.78rem',
        fontWeight: 700,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
      }}
    >
      {network.isReconnecting ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          <span>Reconnecting to network...</span>
        </>
      ) : (
        <>
          <WifiOff size={14} />
          <span>Offline — using cached route and GPS</span>
        </>
      )}
    </div>
  )
}
