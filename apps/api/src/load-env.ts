import { existsSync } from 'node:fs'

// Load apps/api/.env for local runs. Real environment variables take precedence.
if (existsSync('.env')) process.loadEnvFile('.env')
