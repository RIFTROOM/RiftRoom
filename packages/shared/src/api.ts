import type { AuthResponse, CsrfResponse, LoginRequest, RegisterRequest } from './auth.js'

/** All API routes live under this prefix. */
export const API_PREFIX = '/api'

/** Header that must carry the CSRF token on state-changing requests. */
export const CSRF_HEADER = 'x-csrf-token'

export interface HealthResponse {
  status: 'ok'
}

/**
 * Single source of truth for the HTTP contract.
 * Keys are "METHOD /path" relative to API_PREFIX.
 */
export interface ApiContract {
  'GET /health': { body: undefined; response: HealthResponse }
  'GET /auth/csrf': { body: undefined; response: CsrfResponse }
  'POST /auth/register': { body: RegisterRequest; response: AuthResponse }
  'POST /auth/login': { body: LoginRequest; response: AuthResponse }
  'POST /auth/logout': { body: undefined; response: undefined }
  'GET /auth/me': { body: undefined; response: AuthResponse }
}

export type ApiRoute = keyof ApiContract
export type ApiRequestBody<R extends ApiRoute> = ApiContract[R]['body']
export type ApiResponseBody<R extends ApiRoute> = ApiContract[R]['response']
