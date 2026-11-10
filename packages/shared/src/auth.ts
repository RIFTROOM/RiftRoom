import { z } from 'zod'

export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 24
export const PASSWORD_MIN_LENGTH = 8
// Upper bound keeps password hashing cheap enough to not become a DoS vector.
export const PASSWORD_MAX_LENGTH = 128
export const EMAIL_MAX_LENGTH = 254

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Username is required')
  .min(USERNAME_MIN_LENGTH, `Username must be at least ${USERNAME_MIN_LENGTH} characters`)
  .max(USERNAME_MAX_LENGTH, `Username must be at most ${USERNAME_MAX_LENGTH} characters`)
  .regex(/^[a-z0-9_]+$/, 'Use only letters, numbers and underscores')

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .max(EMAIL_MAX_LENGTH, 'Email is too long')
  .pipe(z.email('Enter a valid email address'))

export const newPasswordSchema = z
  .string()
  .min(1, 'Password is required')
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`)
  .refine((value) => value.trim().length > 0, 'Password cannot be only spaces')

// Login does not re-check the password policy: policies change, old passwords must keep working.
const loginPasswordSchema = z
  .string()
  .min(1, 'Password is required')
  .max(PASSWORD_MAX_LENGTH, 'Invalid email or password')

export const registerRequestSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: newPasswordSchema,
})

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
})

/** What the client sends (before trimming / lowercasing). */
export type RegisterRequest = z.input<typeof registerRequestSchema>
export type LoginRequest = z.input<typeof loginRequestSchema>

/** What the server works with after validation. */
export type RegisterInput = z.output<typeof registerRequestSchema>
export type LoginInput = z.output<typeof loginRequestSchema>

/**
 * Public user shape returned by the API.
 * It intentionally has no password-related fields.
 */
export interface User {
  id: string
  username: string
  email: string
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  user: User
}

export interface CsrfResponse {
  csrfToken: string
}
