import type { LucideIcon } from 'lucide-react'
import SoftCard from './SoftCard'

interface Props {
  icon: LucideIcon
  label: string
  value: string
  sub?: string
  iconColor?: string
  iconBg?: string
  onClick?: () => void
  accentTop?: boolean
}
export default function DashboardCard({
  icon: Icon,
  label,
  value,
  sub,
  iconColor = 'var(--color-primary)',
  iconBg = 'var(--color-primary-subtle)',
  onClick,
}: Props) {
  return (
    <SoftCard onClick={onClick} padding={0} style={{ overflow: 'hidden' }}>
      <div className={`dashboard-kpi${onClick ? ' dashboard-kpi--clickable' : ''}`}>
        {/* Top accent line drawn via ::before in CSS when hovered */}
        <div
          className="dashboard-kpi__icon"
          style={{ background: iconBg }}
        >
          <Icon size={22} color={iconColor} strokeWidth={2} />
        </div>
        <div className="dashboard-kpi__content">
          <p className="dashboard-kpi__value">{value}</p>
          <p className="dashboard-kpi__label">{label}</p>
          {sub && (
            <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
              {sub}
            </p>
          )}
        </div>
      </div>
    </SoftCard>
  )
}
