import { Inject, Injectable } from '@nestjs/common'
import type { User } from '@riftroom/shared'
import type { RequestMeta } from '../common/request-meta.js'
import { APP_CONFIG, type AppConfig } from '../config/app-config.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { generateToken, hashToken, isWellFormedToken } from '../security/tokens.js'
import { publicUserSelect, toPublicUser } from './user.mapper.js'

export interface IssuedSession {
  token: string
  expiresAt: Date
}

/**
 * Server-side sessions. The raw token only ever exists in the cookie;
 * the database stores its SHA-256 hash, so a leaked DB dump cannot be
 * used to hijack sessions.
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async create(userId: string, meta: RequestMeta): Promise<IssuedSession> {
    const token = generateToken()
    const expiresAt = new Date(Date.now() + this.config.sessionTtlMs)

    await this.prisma.$transaction([
      // Housekeeping: drop this user's expired sessions.
      this.prisma.session.deleteMany({ where: { userId, expiresAt: { lte: new Date() } } }),
      this.prisma.session.create({
        data: {
          tokenHash: hashToken(token),
          userId,
          expiresAt,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      }),
    ])

    return { token, expiresAt }
  }

  async findUser(token: string | undefined): Promise<User | null> {
    if (!isWellFormedToken(token)) return null

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true, expiresAt: true, user: { select: publicUserSelect } },
    })
    if (!session) return null

    if (session.expiresAt <= new Date()) {
      await this.prisma.session.deleteMany({ where: { id: session.id } })
      return null
    }
    return toPublicUser(session.user)
  }

  async revoke(token: string | undefined): Promise<void> {
    if (!isWellFormedToken(token)) return
    await this.prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } })
  }
}
