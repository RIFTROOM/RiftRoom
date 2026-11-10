import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { CloseIcon, DoorIcon, HomeIcon, SettingsIcon, UsersIcon } from '../ui/icons'
import { Logo } from '../ui/Logo'
import styles from './Sidebar.module.css'

interface NavItem {
  label: string
  icon: ReactNode
  to?: string
}

// Items without `to` are planned sections, shown as "Soon".
const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: <HomeIcon />, to: '/dashboard' },
  { label: 'Rooms', icon: <DoorIcon /> },
  { label: 'Friends', icon: <UsersIcon /> },
  { label: 'Settings', icon: <SettingsIcon /> },
]

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <aside className={`${styles.sidebar} ${open ? styles.open : ''}`} aria-label="Main navigation">
      <div className={styles.top}>
        <Logo size={30} />
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close menu">
          <CloseIcon />
        </button>
      </div>

      <nav className={styles.nav}>
        <p className={styles.section}>Menu</p>
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.label}>
              {item.to ? (
                <NavLink
                  to={item.to}
                  className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ) : (
                <span className={`${styles.item} ${styles.disabled}`} aria-disabled="true">
                  {item.icon}
                  <span>{item.label}</span>
                  <span className={styles.soon}>Soon</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
