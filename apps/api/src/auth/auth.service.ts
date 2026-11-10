import { HttpStatus, Injectable } from '@nestjs/common'
import {
  ApiErrorCode,
  type FieldErrors,
  type LoginInput,
  type RegisterInput,
  type User,
} from '@riftroom/shared'
import { AppException } from '../common/app.exception.js'
import type { RequestMeta } from '../common/request-meta.js'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { LoginThrottleService } from './login-throttle.service.js'
import { PasswordService } from './password.service.js'
import { type IssuedSession, SessionService } from './session.service.js'
import { publicUserSelect, toPublicUser } from './user.mapper.js'

export interface AuthResult {
  user: User
  session: IssuedSession
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly loginThrottle: LoginThrottleService,
  ) {}

  async register(input: RegisterInput, meta: RequestMeta): Promise<AuthResult> {
    await this.assertAvailable(input.email, input.username)

    const passwordHash = await this.passwords.hash(input.password)

    let record
    try {
      record = await this.prisma.user.create({
        data: { username: input.username, email: input.email, passwordHash },
        select: publicUserSelect,
      })
    } catch (error) {
      // Lost a race with a concurrent sign-up for the same email or username.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        await this.assertAvailable(input.email, input.username)
      }
      throw error
    }

    const session = await this.sessions.create(record.id, meta)
    return { user: toPublicUser(record), session }
  }

  async login(input: LoginInput, meta: RequestMeta): Promise<AuthResult> {
    await this.loginThrottle.assertNotLocked(input.email)

    const record = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { ...publicUserSelect, passwordHash: true },
    })

    const valid = record
      ? await this.passwords.verify(input.password, record.passwordHash)
      : await this.passwords.verifyAgainstDummy(input.password)

    if (!record || !valid) {
      await this.loginThrottle.recordFailure(input.email, meta.ipAddress)
      // Same message whether the email exists or not.
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ApiErrorCode.InvalidCredentials,
        'Invalid email or password.',
      )
    }

    await this.loginThrottle.reset(input.email)
    const session = await this.sessions.create(record.id, meta)
    return { user: toPublicUser(record), session }
  }

  async logout(sessionToken: string | undefined): Promise<void> {
    await this.sessions.revoke(sessionToken)
  }

  private async assertAvailable(email: string, username: string): Promise<void> {
    const taken = await this.prisma.user.findMany({
      where: { OR: [{ email }, { username }] },
      select: { email: true, username: true },
    })
    if (taken.length === 0) return

    const fieldErrors: FieldErrors = {}
    if (taken.some((user) => user.email === email)) {
      fieldErrors.email = 'An account with this email already exists'
    }
    if (taken.some((user) => user.username === username)) {
      fieldErrors.username = 'This username is already taken'
    }

    throw new AppException(
      HttpStatus.CONFLICT,
      fieldErrors.email ? ApiErrorCode.EmailTaken : ApiErrorCode.UsernameTaken,
      fieldErrors.email && fieldErrors.username
        ? 'This email and username are already in use.'
        : (fieldErrors.email ?? fieldErrors.username) + '.',
      fieldErrors,
    )
  }
}
