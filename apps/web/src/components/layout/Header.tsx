import { useState } from 'react'
import { useAuth } from '../../auth/auth-context'
import { ApiError } from '../../lib/api-client'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { LogOutIcon, MenuIcon } from '../ui/icons'
import { LogoMark } from '../ui/Logo'
import styles from './Header.module.css'

export function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, logout } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = async () => {
    setSigningOut(true)
    setError(null)
    try {
      await logout()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not sign out. Please try again.')
      setSigningOut(false)
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button type="button" className={styles.menu} onClick={onOpenMenu} aria-label="Open menu">
          <MenuIcon size={20} />
        </button>
        <span className={styles.mobileMark}>
          <LogoMark size={28} />
        </span>
      </div>

      <div className={styles.right}>
        {error && (
          <span className={styles.error} role="alert">
            {error}
          </span>
        )}
        {user && (
          <div className={styles.user}>
            <Avatar name={user.username} src={user.avatarUrl} size={34} />
            <div className={styles.identity}>
              <span className={styles.username}>{user.username}</span>
              <span className={styles.email}>{user.email}</span>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={handleLogout}
          loading={signingOut}
          icon={<LogOutIcon size={17} />}
          className={styles.logout}
          aria-label="Sign out"
        >
          <span className={styles.logoutLabel}>Sign out</span>
        </Button>
      </div>
    </header>
  )
}
