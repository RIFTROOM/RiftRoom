import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { ThrottlerException } from '@nestjs/throttler'
import { ApiErrorCode, type ApiErrorBody } from '@riftroom/shared'
import type { Response } from 'express'
import { AppException } from './app.exception.js'

const CODE_BY_STATUS: Partial<Record<number, ApiErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ApiErrorCode.BadRequest,
  [HttpStatus.UNAUTHORIZED]: ApiErrorCode.Unauthorized,
  [HttpStatus.NOT_FOUND]: ApiErrorCode.NotFound,
  [HttpStatus.TOO_MANY_REQUESTS]: ApiErrorCode.TooManyRequests,
}

/** Turns every error into the shared ApiErrorBody shape and never leaks internals. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    const body = this.toBody(exception)

    if (body.statusCode >= 500) {
      this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : exception)
    }
    if (exception instanceof AppException && exception.retryAfterSeconds) {
      response.setHeader('Retry-After', String(exception.retryAfterSeconds))
    }

    response.status(body.statusCode).json(body)
  }

  private toBody(exception: unknown): ApiErrorBody {
    if (exception instanceof AppException) {
      return {
        statusCode: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        ...(exception.fieldErrors && { fieldErrors: exception.fieldErrors }),
      }
    }

    if (exception instanceof ThrottlerException) {
      return {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: ApiErrorCode.TooManyRequests,
        message: 'Too many requests. Please wait a moment and try again.',
      }
    }

    if (exception instanceof HttpException && exception.getStatus() < 500) {
      const statusCode = exception.getStatus()
      return {
        statusCode,
        code: CODE_BY_STATUS[statusCode] ?? ApiErrorCode.BadRequest,
        message: statusCode === HttpStatus.BAD_REQUEST ? 'Malformed request' : exception.message,
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ApiErrorCode.InternalError,
      message: 'Something went wrong on our side. Please try again.',
    }
  }
}
