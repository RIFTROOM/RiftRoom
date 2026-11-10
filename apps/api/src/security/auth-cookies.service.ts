import { Inject, Injectable } from '@nestjs/common'
import type { CookieOptions, Request, Response } from 'express'
import { APP_CONFIG, type AppConfig } from '../config/app-config.js'

/**
 * Cookie handling for the session and CSRF tokens.
 * In secure mode the `__Host-` prefix makes the browser refuse cookies
 * that are not Secure, not host-only, or not scoped to `/`.
 */
@Injectable()
export class AuthCookiesService {
  readonly sessionCookie: string
  readonly csrfCookie: string

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    const prefix = config.cookieSecure ? '__Host-' : ''
    this.sessionCookie = `${prefix}rr_session`
    this.csrfCookie = `${prefix}rr_csrf`
  }

  readSession(request: Request): string | undefined {
    return readCookie(request, this.sessionCookie)
  }

  setSession(response: Response, token: string, expiresAt: Date): void {
    response.cookie(this.sessionCookie, token, { ...this.baseOptions(), expires: expiresAt })
  }

  clearSession(response: Response): void {
    response.clearCookie(this.sessionCookie, this.baseOptions())
  }

  readCsrf(request: Request): string | undefined {
    return readCookie(request, this.csrfCookie)
  }

  setCsrf(response: Response, token: string): void {
    response.cookie(this.csrfCookie, token, {
      ...this.baseOptions(),
      maxAge: this.config.sessionTtlMs,
    })
  }

  private baseOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.cookieSecure,
      sameSite: 'lax',
      path: '/',
    }
  }
}

function readCookie(request: Request, name: string): string | undefined {
  const cookies = request.cookies as Record<string, unknown> | undefined
  const value = cookies?.[name]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
