import { resolveTestDatabaseUrl } from './test-database.js'

Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: resolveTestDatabaseUrl(),
  WEB_ORIGIN: 'http://localhost:5173',
  // Lower cost keeps the suite fast; production uses the default (17).
  PASSWORD_HASH_COST: '12',
  LOGIN_MAX_FAILURES: '3',
  LOGIN_FAILURE_WINDOW_MINUTES: '15',
  // Rate limits are tested explicitly; keep them out of the way elsewhere.
  AUTH_RATE_LIMIT_PER_MINUTE: '1000',
  GLOBAL_RATE_LIMIT_PER_MINUTE: '10000',
})
