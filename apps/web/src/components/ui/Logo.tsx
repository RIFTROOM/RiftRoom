import { useId } from 'react'
import styles from './Logo.module.css'

/** The RIFTROOM mark: a room split by a rift. */
export function LogoMark({ size = 32 }: { size?: number }) {
  const gradientId = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="#1c1929" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" stroke="rgb(255 255 255 / 0.08)" />
      <path d="M7 7h10.5L12.8 25H7z" fill={`url(#${gradientId})`} />
      <path d="M20.2 7H25v18H15.5z" fill={`url(#${gradientId})`} opacity=".55" />
    </svg>
  )
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className={styles.logo}>
      <LogoMark size={size} />
      <span className={styles.wordmark}>
        RIFT<span>ROOM</span>
      </span>
    </span>
  )
}
