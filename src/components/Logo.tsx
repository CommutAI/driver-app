import logoOnly from '../logo-only.png'

type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface Props {
  size?: LogoSize
  className?: string
  style?: React.CSSProperties
}

const SIZES: Record<LogoSize, number> = {
  xs:  28,
  sm:  36,
  md:  48,
  lg:  80,
  xl: 120,
}

export default function Logo({ size = 'md', className = '', style }: Props) {
  const px = SIZES[size]
  return (
    <img
      src={logoOnly}
      alt="CommutAI"
      className={className}
      style={{
        width:  px,
        height: px,
        objectFit: 'contain',
        display: 'block',
        ...style,
      }}
    />
  )
}
