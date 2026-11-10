import { Inject, Injectable } from '@nestjs/common'
import { CSRF_HEADER } from '@riftroom/shared'
import type { Request, Response } from 'express'
import { APP_CONFIG, type AppConfig } from '../config/app-config.js'
import { AuthCookiesService } from './auth-cookies.service.js'
import { generateToken, isWellFormedToken, safeEqual } from './tokens.js'

/**
 * Double-submit CSRF protection.
 *
 * The token lives in an HttpOnly cookie and is also handed to the app in the
 * body of GET /auth/csrf. A state-changing request must echo it in the
 * X-CSRF-Token header. A cross-site attacker can make the browser send the
 * cookie, but cannot read the token, so cannot set the header.
 * On top of that, a request carrying a foreign Origin header is rejected.
 */
@Injectable()
export class CsrfService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly cookies: AuthCookiesService,
  ) {}

  /** Returns the current token, creating one if needed, and refreshes the cookie. */
  issue(request: Request, response: Response): string {
    const existing = this.cookies.readCsrf(request)
    const token = isWellFormedToken(existing) ? existing : generateToken()
    this.cookies.setCsrf(response, token)
    return token
  }

  isValid(request: Request): boolean {
    const origin = request.get('origin')
    if (origin !== undefined && !this.config.webOrigins.includes(origin)) return false

    const cookieToken = this.cookies.readCsrf(request)
    const headerToken = request.get(CSRF_HEADER)
    return (
      isWellFormedToken(cookieToken) &&
      isWellFormedToken(headerToken) &&
      safeEqual(cookieToken, headerToken)
    )
  }
}
