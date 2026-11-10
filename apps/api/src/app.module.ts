import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { AuthModule } from './auth/auth.module.js'
import { APP_CONFIG, type AppConfig } from './config/app-config.js'
import { ConfigModule } from './config/config.module.js'
import { HealthController } from './health/health.controller.js'
import { PrismaModule } from './prisma/prisma.module.js'
import { isAuthRateLimited } from './security/auth-rate-limit.js'
import { CsrfGuard } from './security/csrf.guard.js'
import { SecurityModule } from './security/security.module.js'

const ONE_MINUTE_MS = 60_000

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    SecurityModule,
    ThrottlerModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        throttlers: [
          { name: 'default', ttl: ONE_MINUTE_MS, limit: config.globalRateLimitPerMinute },
          {
            name: 'auth',
            ttl: ONE_MINUTE_MS,
            limit: config.authRateLimitPerMinute,
            skipIf: (context) => !isAuthRateLimited(context),
          },
        ],
      }),
    }),
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: rate limiting runs before CSRF checks.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule {}
