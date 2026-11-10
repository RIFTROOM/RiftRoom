import { type FieldErrors, registerRequestSchema, toFieldErrors } from '@riftroom/shared'

export type RegisterField = 'username' | 'email' | 'password' | 'confirmPassword'

export function validateRegister(values: Record<RegisterField, string>): FieldErrors {
  const { confirmPassword, ...request } = values
  const result = registerRequestSchema.safeParse(request)
  const errors = result.success ? {} : toFieldErrors(result.error)

  if (!confirmPassword) errors.confirmPassword = 'Please repeat your password'
  else if (confirmPassword !== values.password) errors.confirmPassword = 'Passwords do not match'
  return errors
}
