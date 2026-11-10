import { HttpException } from '@nestjs/common'
import type { ApiErrorCode, FieldErrors } from '@riftroom/shared'

/** An expected error with a stable code the frontend can rely on. */
export class AppException extends HttpException {
  constructor(
    status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly fieldErrors?: FieldErrors,
    readonly retryAfterSeconds?: number,
  ) {
    super(message, status)
  }
}
