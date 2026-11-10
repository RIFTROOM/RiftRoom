import { ApiErrorCode, type FieldErrors } from '@riftroom/shared'
import { ApiError } from '../lib/api-client'

/**
 * Splits an API failure into per-field errors (shown under inputs)
 * and a form-level message (shown in the alert).
 */
export function describeAuthError(error: unknown): { fieldErrors: FieldErrors; formError: string | null } {
  if (!(error instanceof ApiError)) {
    return { fieldErrors: {}, formError: 'Something went wrong. Please try again.' }
  }

  const hasFieldErrors = Object.keys(error.fieldErrors).length > 0
  const isFieldProblem =
    error.code === ApiErrorCode.ValidationError ||
    error.code === ApiErrorCode.EmailTaken ||
    error.code === ApiErrorCode.UsernameTaken

  return {
    fieldErrors: error.fieldErrors,
    formError: isFieldProblem && hasFieldErrors ? null : error.message,
  }
}
