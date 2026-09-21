import { RefreshCw } from 'lucide-react'

interface Props {
  onClick: () => void
  visible: boolean
  onZoomTo16?: () => void
}

export default function RerouteButton({ onClick, visible, onZoomTo16 }: Props) {
  if (!visible) return null

  const handleClick = () => {
    if (onZoomTo16) {
      onZoomTo16()
    }
    onClick()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Reroute"
      style={{
        position: 'absolute',
        right: 10,
        bottom: 260,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        padding: '12px',
        width: '48px',
        height: '48px',
        background: 'rgba(234, 88, 12, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(234, 88, 12, 0.6)',
        borderRadius: 99,
        color: '#FFFFFF',
        boxShadow: '0 8px 24px rgba(234, 88, 12, 0.4), 0 0 12px rgba(234, 88, 12, 0.25)',
        cursor: 'pointer',
        transition: 'all 200ms ease',
      }}
    >
      <RefreshCw size={20} color="#FFFFFF" strokeWidth={2.5} />
    </button>
  )
}
