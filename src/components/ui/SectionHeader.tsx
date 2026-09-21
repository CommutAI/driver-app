import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  action?: ReactNode
  light?: boolean   // white heading (on hero/gradient backgrounds)
}

export default function SectionHeader({ title, subtitle, action, light = false }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: '1.05rem',
            fontWeight: 800,
            color: light ? '#ffffff' : 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: light ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)', fontWeight: 500 }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}
