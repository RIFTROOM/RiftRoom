import { Link } from 'react-router'
import { LogoMark } from '../components/ui/Logo'
import styles from '../components/layout/FullScreen.module.css'

export function NotFoundPage() {
  return (
    <main className={styles.screen}>
      <LogoMark size={48} />
      <div className={styles.text}>
        <h1>This room doesn’t exist</h1>
        <p>The page you’re looking for fell through the rift.</p>
      </div>
      <Link to="/">Back to RIFTROOM</Link>
    </main>
  )
}
