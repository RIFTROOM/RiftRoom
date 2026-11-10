import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common'
import { ApiErrorCode, type User } from '@riftroom/shared'
import type { Request, Response } from 'express'
import { AppException } from '../common/app.exception.js'
import { AuthCookiesService } from '../security/auth-cookies.service.js'
import { SessionService } from './session.service.js'

type RequestWithUser = Request & { user?: User }

/** Protects a route: requires a valid, unexpired session cookie. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    private readonly cookies: AuthCookiesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp()
    const request = http.getRequest<RequestWithUser>()
    const token = this.cookies.readSession(request)

    const user = await this.sessions.findUser(token)
    if (!user) {
      // Drop a stale cookie so the browser stops sending it.
      if (token) this.cookies.clearSession(http.getResponse<Response>())
      throw new AppException(HttpStatus.UNAUTHORIZED, ApiErrorCode.Unauthorized, 'You are not signed in.')
    }

    request.user = user
    return true
  }
}

/** The user attached by SessionGuard. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): User => {
  const user = context.switchToHttp().getRequest<RequestWithUser>().user
  if (!user) throw new Error('CurrentUser used on a route without SessionGuard')
  return user
})
