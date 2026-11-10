import type { ReactNode } from 'react'
import styles from './Alert.module.css'
import { AlertIcon, CheckCircleIcon } from './icons'

interface AlertProps {
  tone?: 'error' | 'success'
  title?: string
  children: ReactNode
}

export function Alert({ tone = 'error', title, children }: AlertProps) {
  return (
    <div className={`${styles.alert} ${styles[tone]}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span className={styles.icon}>{tone === 'error' ? <AlertIcon /> : <CheckCircleIcon />}</span>
      <div>
        {title && <p className={styles.title}>{title}</p>}
        <p className={styles.body}>{children}</p>
      </div>
    </div>
  )
}
