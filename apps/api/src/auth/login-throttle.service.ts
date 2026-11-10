import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ApiErrorCode } from '@riftroom/shared'
import { AppException } from '../common/app.exception.js'
import { APP_CONFIG, type AppConfig } from '../config/app-config.js'
import { PrismaService } from '../prisma/prisma.service.js'

/**
 * Account-level brute-force protection: after N failed sign-ins for one email
 * within the window, further attempts for that email are rejected until the
 * oldest failure ages out. Complements the per-IP rate limit, which alone
 * cannot stop attacks spread across many IPs. Stored in Postgres, so it holds
 * across restarts and multiple API instances.
 */
@Injectable()
export class LoginThrottleService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async assertNotLocked(email: string): Promise<void> {
    const windowStart = new Date(Date.now() - this.config.loginFailureWindowMs)
    const failures = await this.prisma.loginFailure.findMany({
      where: { email, createdAt: { gt: windowStart } },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: this.config.loginMaxFailures,
    })
    if (failures.length < this.config.loginMaxFailures) return

    // The lock lifts once the oldest of the last N failures leaves the window.
    const oldest = failures[failures.length - 1].createdAt
    const unlockAt = oldest.getTime() + this.config.loginFailureWindowMs
    const retryAfterSeconds = Math.max(1, Math.ceil((unlockAt - Date.now()) / 1000))
    const minutes = Math.ceil(retryAfterSeconds / 60)

    throw new AppException(
      HttpStatus.TOO_MANY_REQUESTS,
      ApiErrorCode.TooManyRequests,
      `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      undefined,
      retryAfterSeconds,
    )
  }

  async recordFailure(email: string, ipAddress: string | null): Promise<void> {
    const windowStart = new Date(Date.now() - this.config.loginFailureWindowMs)
    await this.prisma.$transaction([
      this.prisma.loginFailure.deleteMany({ where: { email, createdAt: { lte: windowStart } } }),
      this.prisma.loginFailure.create({ data: { email, ipAddress } }),
    ])
  }

  async reset(email: string): Promise<void> {
    await this.prisma.loginFailure.deleteMany({ where: { email } })
  }
}
