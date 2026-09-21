type Variant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'primary'

interface Props {
  children: React.ReactNode
  variant?: Variant
  dot?: boolean
  pulse?: boolean
}

const variantClass: Record<Variant, string> = {
  success: 'status-pill--success',
  danger:  'status-pill--danger',
  warning: 'status-pill--warning',
  info:    'status-pill--info',
  neutral: 'status-pill--neutral',
  primary: 'status-pill--primary',
}

export default function StatusBadge({ children, variant = 'neutral', dot = true, pulse = false }: Props) {
  return (
    <span className={`status-pill ${variantClass[variant]}`}>
      {dot && (
        <span
          className={`status-pill__dot${pulse ? ' pulse-dot' : ''}`}
          aria-hidden
        />
      )}
      {children}
    </span>
  )
}
