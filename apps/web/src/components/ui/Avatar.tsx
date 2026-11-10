import { useState } from 'react'
import styles from './Avatar.module.css'

interface AvatarProps {
  name: string
  src?: string | null
  size?: number
}

export function Avatar({ name, src, size = 36 }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <span className={styles.avatar} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {src && !failed ? (
        <img src={src} alt="" className={styles.image} onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  )
}
