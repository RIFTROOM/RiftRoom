import type { NestExpressApplication } from '@nestjs/platform-express'
import { API_PREFIX, CSRF_HEADER } from '@riftroom/shared'
import cookieParser from 'cookie-parser'
import type { NextFunction, Request, Response } from 'express'
import helmet from 'helmet'
import { AllExceptionsFilter } from './common/all-exceptions.filter.js'
import type { AppConfig } from './config/app-config.js'

/** HTTP-level setup shared by main.ts and the e2e tests. */
export function configureApp(app: NestExpressApplication, config: AppConfig): void {
  app.setGlobalPrefix(API_PREFIX.replace(/^\//, ''))
  // Needed for correct client IPs (rate limits, lockouts) behind a reverse proxy.
  app.set('trust proxy', config.trustProxy ? 1 : false)

  app.use(helmet())
  app.use(cookieParser())
  // Auth responses carry personal data and Set-Cookie headers: never cache them.
  app.use(`${API_PREFIX}/auth`, (_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store')
    next()
  })

  // Only needed when the web app is served from a different origin than the API.
  app.enableCors({
    origin: config.webOrigins,
    credentials: true,
    allowedHeaders: ['content-type', CSRF_HEADER],
  })

  app.useGlobalFilters(new AllExceptionsFilter())
  app.enableShutdownHooks()
}
