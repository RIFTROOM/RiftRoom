import type { z } from 'zod'

export const ApiErrorCode = {
  ValidationError: 'VALIDATION_ERROR',
  InvalidCredentials: 'INVALID_CREDENTIALS',
  EmailTaken: 'EMAIL_TAKEN',
  UsernameTaken: 'USERNAME_TAKEN',
  Unauthorized: 'UNAUTHORIZED',
  CsrfInvalid: 'CSRF_INVALID',
  TooManyRequests: 'TOO_MANY_REQUESTS',
  NotFound: 'NOT_FOUND',
  BadRequest: 'BAD_REQUEST',
  InternalError: 'INTERNAL_ERROR',
} as const

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode]

export type FieldErrors = Partial<Record<string, string>>

/** Body of every non-2xx API response. */
export interface ApiErrorBody {
  statusCode: number
  code: ApiErrorCode
  message: string
  fieldErrors?: FieldErrors
}

/** Keeps the first message for each top-level field. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : '_form'
    result[key] ??= issue.message
  }
  return result
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) return false
  const body = value as Record<string, unknown>
  return (
    typeof body.statusCode === 'number' &&
    typeof body.code === 'string' &&
    typeof body.message === 'string'
  )
}
