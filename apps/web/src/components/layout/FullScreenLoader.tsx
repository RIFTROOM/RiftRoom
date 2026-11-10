import { LogoMark } from '../ui/Logo'
import { Spinner } from '../ui/Spinner'
import styles from './FullScreen.module.css'

export function FullScreenLoader() {
  return (
    <div className={styles.screen}>
      <div className={styles.pulse}>
        <LogoMark size={48} />
      </div>
      <Spinner size={18} label="Loading RIFTROOM" />
    </div>
  )
}
