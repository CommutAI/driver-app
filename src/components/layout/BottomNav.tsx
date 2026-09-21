import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Clock,
  UserCircle,
} from 'lucide-react'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/',              icon: <LayoutDashboard size={18} />, label: 'Home'    },
  { to: '/history',       icon: <Clock           size={18} />, label: 'History' },
  { to: '/profile',       icon: <UserCircle      size={18} />, label: 'Profile' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav-modern" aria-label="Main navigation">
      <div className="bottom-nav-modern__container">
        <div className="bottom-nav-modern__content">
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `bottom-nav-modern__item${isActive ? ' bottom-nav-modern__item--active' : ''}`
              }
              aria-label={label}
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="bottom-nav-modern__indicator" />}
                  <span className="bottom-nav-modern__icon">{icon}</span>
                  <span className="bottom-nav-modern__label">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
