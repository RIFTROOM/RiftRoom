import type { ReactNode } from 'react'
import { Logo } from '../ui/Logo'
import styles from './AuthLayout.module.css'

interface AuthLayoutProps {
  title: string
  subtitle: ReactNode
  children: ReactNode
  footer: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className={styles.page}>
      <aside className={styles.showcase} aria-hidden="true">
        <Logo />
        <div className={styles.rift}>
          <span className={styles.shardLeft} />
          <span className={styles.glow} />
          <span className={styles.shardRight} />
        </div>
        <div className={styles.tagline}>
          <h2>Step through the rift.</h2>
          <p>One account. Every room you’ll ever join.</p>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.mobileLogo}>
          <Logo />
        </div>
        <section className={styles.card} aria-labelledby="auth-title">
          <header className={styles.header}>
            <h1 id="auth-title">{title}</h1>
            <p>{subtitle}</p>
          </header>
          {children}
        </section>
        <p className={styles.footer}>{footer}</p>
      </main>
    </div>
  )
}
