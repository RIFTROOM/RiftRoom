import { useAuth } from '../../auth/auth-context'
import { Button } from '../ui/Button'
import { LogoMark } from '../ui/Logo'
import styles from './FullScreen.module.css'

export function SessionErrorScreen({ message }: { message: string }) {
  const { reload } = useAuth()
  return (
    <div className={styles.screen}>
      <LogoMark size={48} />
      <div className={styles.text}>
        <h1>We couldn’t check your session</h1>
        <p>{message}</p>
      </div>
      <Button variant="secondary" onClick={reload}>
        Try again
      </Button>
    </div>
  )
}
