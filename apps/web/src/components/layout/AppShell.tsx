import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import styles from './AppShell.module.css'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

/** Layout for signed-in pages: sidebar + header + content. */
export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Close the mobile drawer whenever the route changes.
  const [lastPath, setLastPath] = useState(location.pathname)
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setMenuOpen(false)
  }

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <div className={styles.shell}>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      {menuOpen && <div className={styles.backdrop} onClick={() => setMenuOpen(false)} aria-hidden="true" />}
      <div className={styles.body}>
        <Header onOpenMenu={() => setMenuOpen(true)} />
        <main className={styles.content} id="main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
