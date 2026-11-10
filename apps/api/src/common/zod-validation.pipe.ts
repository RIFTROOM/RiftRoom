import { HttpStatus, type PipeTransform } from '@nestjs/common'
import { ApiErrorCode, toFieldErrors } from '@riftroom/shared'
import type { z } from 'zod'
import { AppException } from './app.exception.js'

/** Validates and normalizes a request body with a shared zod schema. */
export class ZodValidationPipe<TSchema extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.output<TSchema> {
    const result = this.schema.safeParse(value ?? {})
    if (!result.success) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.ValidationError,
        'Please fix the highlighted fields.',
        toFieldErrors(result.error),
      )
    }
    return result.data
  }
}
