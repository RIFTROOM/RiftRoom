import { useAuth } from '../auth/auth-context'
import { Avatar } from '../components/ui/Avatar'
import { AtIcon, CalendarIcon, CheckCircleIcon, DoorIcon, MailIcon, ShieldIcon, SparkIcon } from '../components/ui/icons'
import styles from './DashboardPage.module.css'

const dateFormatter = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' })

function greeting(date = new Date()): string {
  const hour = date.getHours()
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const { user } = useAuth()
  // RequireAuth guarantees a user here; this only narrows the type.
  if (!user) return null

  const memberSince = dateFormatter.format(new Date(user.createdAt))

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>
            <SparkIcon size={14} /> Dashboard
          </p>
          <h1>
            {greeting()}, <span className={styles.name}>{user.username}</span>
          </h1>
          <p className={styles.lead}>You’re signed in. This is your personal space in RIFTROOM.</p>
        </div>
      </section>

      <div className={styles.grid}>
        <article className={`${styles.card} ${styles.profile}`} aria-labelledby="profile-title">
          <header className={styles.cardHeader}>
            <h2 id="profile-title">Your profile</h2>
          </header>
          <div className={styles.identity}>
            <Avatar name={user.username} src={user.avatarUrl} size={64} />
            <div>
              <p className={styles.identityName}>{user.username}</p>
              <p className={styles.identityMeta}>{user.email}</p>
            </div>
          </div>
          <dl className={styles.details}>
            <div>
              <dt>
                <AtIcon size={16} /> Username
              </dt>
              <dd>{user.username}</dd>
            </div>
            <div>
              <dt>
                <MailIcon size={16} /> Email
              </dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>
                <CalendarIcon size={16} /> Member since
              </dt>
              <dd>{memberSince}</dd>
            </div>
          </dl>
        </article>

        <article className={styles.card} aria-labelledby="security-title">
          <header className={styles.cardHeader}>
            <span className={styles.cardIcon}>
              <ShieldIcon />
            </span>
            <h2 id="security-title">Security</h2>
          </header>
          <ul className={styles.checklist}>
            <li>
              <CheckCircleIcon size={18} />
              <div>
                <p>Session active on this device</p>
                <span>Stays signed in after a page reload until you sign out.</span>
              </div>
            </li>
            <li>
              <CheckCircleIcon size={18} />
              <div>
                <p>Password stored as a secure hash</p>
                <span>Nobody, including us, can read your password.</span>
              </div>
            </li>
          </ul>
        </article>

        <article className={`${styles.card} ${styles.empty}`} aria-labelledby="rooms-title">
          <span className={styles.emptyIcon}>
            <DoorIcon size={22} />
          </span>
          <h2 id="rooms-title">No rooms yet</h2>
          <p>Rooms are on their way. When they arrive, the ones you join will show up here.</p>
        </article>
      </div>
    </div>
  )
}
