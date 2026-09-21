import type { ReactNode, CSSProperties } from 'react'

type Variant = 'default' | 'hero' | 'gradient' | 'accent-success' | 'accent-danger' | 'accent-warning' | 'accent-info' | 'accent-primary'

interface SoftCardProps {
  children: ReactNode
  variant?: Variant
  padding?: number | string
  style?: CSSProperties
  className?: string
  onClick?: () => void
  role?: string
  'aria-label'?: string
}

const variantClass: Record<Variant, string> = {
  'default':        'soft-card',
  'hero':           'soft-card soft-card--hero',
  'gradient':       'soft-card soft-card--gradient',
  'accent-success': 'soft-card soft-card--accent-success',
  'accent-danger':  'soft-card soft-card--accent-danger',
  'accent-warning': 'soft-card soft-card--accent-warning',
  'accent-info':    'soft-card soft-card--accent-info',
  'accent-primary': 'soft-card soft-card--accent-primary',
}

export default function SoftCard({
  children,
  variant = 'default',
  padding = 20,
  style,
  className = '',
  onClick,
  ...rest
}: SoftCardProps) {
  const Tag = onClick ? 'button' : 'div'
  const paddingValue = typeof padding === 'number' ? `${padding}px` : padding

  return (
    <Tag
      onClick={onClick}
      className={`${variantClass[variant]}${onClick ? ' soft-card--clickable' : ''} ${className}`}
      style={{ padding: paddingValue, width: '100%', textAlign: 'left', ...style }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
