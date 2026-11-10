import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common'
import {
  type AuthResponse,
  type CsrfResponse,
  type LoginInput,
  loginRequestSchema,
  type RegisterInput,
  registerRequestSchema,
  type User,
} from '@riftroom/shared'
import type { Request, Response } from 'express'
import { getRequestMeta } from '../common/request-meta.js'
import { ZodValidationPipe } from '../common/zod-validation.pipe.js'
import { AuthCookiesService } from '../security/auth-cookies.service.js'
import { AuthRateLimited } from '../security/auth-rate-limit.js'
import { CsrfService } from '../security/csrf.service.js'
import { AuthService } from './auth.service.js'
import { CurrentUser, SessionGuard } from './session.guard.js'
import type { IssuedSession } from './session.service.js'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: AuthCookiesService,
    private readonly csrf: CsrfService,
  ) {}

  @Get('csrf')
  getCsrfToken(@Req() request: Request, @Res({ passthrough: true }) response: Response): CsrfResponse {
    return { csrfToken: this.csrf.issue(request, response) }
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @AuthRateLimited()
  async register(
    @Body(new ZodValidationPipe(registerRequestSchema)) body: RegisterInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const { user, session } = await this.auth.register(body, getRequestMeta(request))
    await this.replaceSession(request, response, session)
    return { user }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimited()
  async login(
    @Body(new ZodValidationPipe(loginRequestSchema)) body: LoginInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const { user, session } = await this.auth.login(body, getRequestMeta(request))
    await this.replaceSession(request, response, session)
    return { user }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.auth.logout(this.cookies.readSession(request))
    this.cookies.clearSession(response)
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@CurrentUser() user: User): AuthResponse {
    return { user }
  }

  /** Always issues a fresh session on sign-in and ends the previous one (no session fixation). */
  private async replaceSession(request: Request, response: Response, session: IssuedSession) {
    await this.auth.logout(this.cookies.readSession(request))
    this.cookies.setSession(response, session.token, session.expiresAt)
  }
}
