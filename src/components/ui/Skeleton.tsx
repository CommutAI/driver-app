interface Props {
  variant?: 'text' | 'card' | 'avatar' | 'kpi'
  width?: string
  count?: number
  className?: string
}

export function SkeletonLine({ width = '100%', height = 16 }: { width?: string; height?: number }) {
  return (
    <div
      className="skeleton"
      style={{ height, width, marginBottom: 8 }}
      aria-hidden
    />
  )
}

export default function Skeleton({ variant = 'text', width, count = 1 }: Props) {
  const cls = `skeleton skeleton--${variant}`
  return (
    <div aria-busy="true" aria-label="Loading" style={{ width }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cls} style={{ marginBottom: 12 }} />
      ))}
    </div>
  )
}
