import { existsSync } from 'node:fs'
import { defineConfig } from 'prisma/config'

// Prisma 7 does not load .env on its own.
if (existsSync('.env')) process.loadEnvFile('.env')

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Not required for `prisma generate`, so a missing value must not crash it.
  datasource: { url: process.env.DATABASE_URL },
})
