import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

type BtnVariant = 'primary' | 'danger' | 'success' | 'ghost'

interface Props {
  children: ReactNode
  variant?: BtnVariant
  fullWidth?: boolean
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  style?: React.CSSProperties
}

export default function PrimaryButton({
  children,
  variant = 'primary',
  fullWidth = false,
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  style,
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`primary-btn primary-btn--${variant}${fullWidth ? ' primary-btn--full' : ''}`}
      style={style}
    >
      {loading && <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />}
      {children}
    </button>
  )
}
