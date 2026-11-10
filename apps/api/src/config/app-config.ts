import { z } from 'zod'

export const APP_CONFIG = Symbol('APP_CONFIG')

const flag = z
  .enum(['0', '1', 'true', 'false'])
  .transform((value) => value === '1' || value === 'true')

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  TRUST_PROXY: flag.default(false),
  // Defaults to true in production. Only override for unusual setups.
  COOKIE_SECURE: flag.optional(),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  LOGIN_MAX_FAILURES: z.coerce.number().int().min(1).default(5),
  LOGIN_FAILURE_WINDOW_MINUTES: z.coerce.number().int().min(1).default(15),
  AUTH_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(10),
  GLOBAL_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(300),
  // scrypt cost as log2(N). 17 matches the OWASP recommendation (N = 131072).
  PASSWORD_HASH_COST: z.coerce.number().int().min(10).max(20).default(17),
})

export interface AppConfig {
  env: 'development' | 'test' | 'production'
  isProduction: boolean
  port: number
  databaseUrl: string
  webOrigins: string[]
  trustProxy: boolean
  cookieSecure: boolean
  sessionTtlMs: number
  loginMaxFailures: number
  loginFailureWindowMs: number
  authRateLimitPerMinute: number
  globalRateLimitPerMinute: number
  passwordHashCost: number
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${details}`)
  }

  const env = result.data
  const isProduction = env.NODE_ENV === 'production'

  return {
    env: env.NODE_ENV,
    isProduction,
    port: env.API_PORT,
    databaseUrl: env.DATABASE_URL,
    webOrigins: env.WEB_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    trustProxy: env.TRUST_PROXY,
    cookieSecure: env.COOKIE_SECURE ?? isProduction,
    sessionTtlMs: env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    loginMaxFailures: env.LOGIN_MAX_FAILURES,
    loginFailureWindowMs: env.LOGIN_FAILURE_WINDOW_MINUTES * 60 * 1000,
    authRateLimitPerMinute: env.AUTH_RATE_LIMIT_PER_MINUTE,
    globalRateLimitPerMinute: env.GLOBAL_RATE_LIMIT_PER_MINUTE,
    passwordHashCost: env.PASSWORD_HASH_COST,
  }
}
