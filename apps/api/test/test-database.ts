import { existsSync } from 'node:fs'

const DEFAULT_TEST_DATABASE_URL = 'postgresql://riftroom:riftroom@localhost:5433/riftroom_test'

/**
 * Tests wipe their database. To make it impossible to point them at real data
 * by accident, the database name must end with "_test".
 */
export function resolveTestDatabaseUrl(): string {
  if (!process.env.TEST_DATABASE_URL && existsSync('.env')) process.loadEnvFile('.env')

  const url = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL
  const databaseName = new URL(url).pathname.replace(/^\//, '')
  if (!databaseName.endsWith('_test')) {
    throw new Error(`Refusing to run tests against "${databaseName}": the name must end with "_test".`)
  }
  return url
}
