import { type ExecutionContext, SetMetadata } from '@nestjs/common'

const AUTH_RATE_LIMITED = 'riftroom:auth-rate-limited'

/** Marks a route for the strict per-IP "auth" throttler (login, register). */
export const AuthRateLimited = () => SetMetadata(AUTH_RATE_LIMITED, true)

export function isAuthRateLimited(context: ExecutionContext): boolean {
  return Reflect.getMetadata(AUTH_RATE_LIMITED, context.getHandler()) === true
}
