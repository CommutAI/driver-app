import { Compass } from 'lucide-react'

interface Props {
  onClick: () => void
  visible: boolean
}

export default function RecenterButton({ onClick, visible }: Props) {
  if (!visible) return null

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Re-center map on bus"
      style={{
        position: 'absolute',
        right: 10,
        bottom: 200,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        padding: '12px',
        width: '48px',
        height: '48px',
        background: 'rgba(15, 17, 23, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(249, 115, 22, 0.4)',
        borderRadius: 99,
        color: '#FFFFFF',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45), 0 0 12px rgba(249, 115, 22, 0.25)',
        cursor: 'pointer',
        transition: 'all 200ms ease',
      }}
    >
      <Compass size={20} color="#F97316" strokeWidth={2.5} />
    </button>
  )
}
