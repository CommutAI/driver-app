import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import EmergencyModal from './EmergencyModal'

export default function EmergencyFab() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // Hide EmergencyFab on Dashboard (/), Turn-by-Turn Navigation (/navigation), History (/history), and Profile (/profile)
  if (['/', '/navigation', '/history', '/profile'].includes(location.pathname)) {
    return null
  }

  return (
    <>
      <motion.button
        type="button"
        aria-label="Send emergency alert"
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.92 }}
        style={{
          position: 'fixed',
          bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
          right: 'max(12px, env(safe-area-inset-right, 0px))',
          zIndex: 45,
          height: 40,
          padding: '0 14px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          border: '1.5px solid rgba(255,255,255,0.3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '0.82rem',
          letterSpacing: '0.04em',
          boxShadow: '0 4px 18px rgba(239,68,68,0.55)',
          animation: 'emergency-pulse 2s ease-in-out infinite',
        }}
      >
        <span>SOS</span>
        <AlertTriangle size={18} strokeWidth={2.5} />
      </motion.button>

      <EmergencyModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
