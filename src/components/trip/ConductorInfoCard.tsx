import { UserCheck, UserX } from 'lucide-react'
import SoftCard    from '../ui/SoftCard'
import StatusBadge from '../ui/StatusBadge'
import type { StaffUser } from '../../types'

interface Props {
  conductor: StaffUser | null | undefined
}

export default function ConductorInfoCard({ conductor }: Props) {
  return (
    <SoftCard padding={16}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14, flexShrink: 0,
          background: conductor ? 'var(--color-success-subtle)' : 'rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {conductor
            ? <UserCheck size={22} color="var(--color-success)" />
            : <UserX     size={22} color="var(--text-tertiary)" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Conductor
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {conductor?.full_name ?? 'No conductor assigned'}
          </p>
          {conductor && (
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
              {conductor.email}
            </p>
          )}
        </div>
        {conductor && (
          <StatusBadge variant={conductor.is_active ? 'success' : 'neutral'}>
            {conductor.is_active ? 'On Duty' : 'Off Duty'}
          </StatusBadge>
        )}
      </div>
      <p style={{ margin: '10px 0 0 58px', fontSize: '0.7rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
        Conductor handles fare collection and QR scanning.
      </p>
    </SoftCard>
  )
}
