import { execFileSync } from 'node:child_process'
import { resolveTestDatabaseUrl } from './test-database.js'

/** Brings the test database schema up to date before any test runs. */
export default function setup(): void {
  try {
    execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
      env: { ...process.env, DATABASE_URL: resolveTestDatabaseUrl() },
      stdio: 'pipe',
    })
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? ''
    throw new Error(`Could not migrate the test database. Is Postgres running (npm run db:up)?\n${stderr}`)
  }
}
