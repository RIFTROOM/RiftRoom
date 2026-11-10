import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common'
import { ApiErrorCode } from '@riftroom/shared'
import type { Request } from 'express'
import { AppException } from '../common/app.exception.js'
import { CsrfService } from './csrf.service.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Applied globally: every state-changing request needs a valid CSRF token. */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly csrf: CsrfService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    if (SAFE_METHODS.has(request.method) || this.csrf.isValid(request)) return true

    throw new AppException(
      HttpStatus.FORBIDDEN,
      ApiErrorCode.CsrfInvalid,
      'Your session security token is missing or expired. Refresh the page and try again.',
    )
  }
}
