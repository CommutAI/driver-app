import { useState, type InputHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Eye, EyeOff } from 'lucide-react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string
  icon?: LucideIcon
  error?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function ModernInput({
  label,
  icon: Icon,
  error,
  type = 'text',
  value,
  onChange,
  ...rest
}: Props) {
  const [active, setActive] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const isPassword = type === 'password'
  const inputType  = isPassword ? (showPw ? 'text' : 'password') : type
  const hasValue   = value !== '' && value !== undefined

  return (
    <div className="modern-input">
      <div className={`modern-input__wrapper${active || hasValue ? ' modern-input__wrapper--active' : ''}`}>
        {Icon && (
          <span className="modern-input__icon">
            <Icon size={18} />
          </span>
        )}
        <input
          className="modern-input__field"
          type={inputType}
          value={value}
          placeholder=" "
          onChange={onChange}
          onFocus={() => setActive(true)}
          onBlur={() => setActive(false)}
          {...rest}
        />
        <label className="modern-input__label">{label}</label>

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            aria-label={showPw ? 'Hide password' : 'Show password'}
            onClick={() => setShowPw(v => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-tertiary)', padding: '0 14px',
              display: 'flex', alignItems: 'center',
            }}
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && (
        <p style={{ margin: '5px 0 0 4px', fontSize: '0.78rem', color: 'var(--color-danger)', fontWeight: 500 }}>
          {error}
        </p>
      )}
    </div>
  )
}
