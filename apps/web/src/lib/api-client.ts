import {
  API_PREFIX,
  ApiErrorCode,
  type ApiRequestBody,
  type ApiResponseBody,
  type ApiRoute,
  CSRF_HEADER,
  type CsrfResponse,
  type FieldErrors,
  isApiErrorBody,
} from '@riftroom/shared'

export const NETWORK_ERROR = 'NETWORK_ERROR'
export type ClientErrorCode = ApiErrorCode | typeof NETWORK_ERROR

export class ApiError extends Error {
  readonly status: number
  readonly code: ClientErrorCode
  readonly fieldErrors: FieldErrors

  constructor(status: number, code: ClientErrorCode, message: string, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

// Empty by default: in dev the Vite server proxies /api to the backend.
const API_BASE = `${import.meta.env.VITE_API_URL ?? ''}${API_PREFIX}`

let csrfToken: string | null = null
let csrfRequest: Promise<string> | null = null
let onUnauthorized: (() => void) | null = null

/** Called when an authenticated request finds the session gone (expired or revoked). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

async function send<T>(method: string, path: string, body?: unknown, headers?: HeadersInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(API_BASE + path, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, NETWORK_ERROR, 'Cannot reach the server. Check your connection and try again.')
  }

  if (response.status === 204) return undefined as T

  const data: unknown = await response.json().catch(() => null)
  if (response.ok) return data as T

  if (isApiErrorBody(data)) {
    throw new ApiError(data.statusCode, data.code, data.message, data.fieldErrors)
  }
  // No JSON body: usually the API is down behind a proxy.
  throw new ApiError(
    response.status,
    response.status >= 500 ? ApiErrorCode.InternalError : ApiErrorCode.BadRequest,
    response.status >= 500
      ? 'The server is unavailable right now. Please try again shortly.'
      : 'Unexpected response from the server.',
  )
}

async function getCsrfToken(refresh = false): Promise<string> {
  if (csrfToken && !refresh) return csrfToken
  csrfRequest ??= send<CsrfResponse>('GET', '/auth/csrf')
    .then(({ csrfToken: token }) => (csrfToken = token))
    .finally(() => (csrfRequest = null))
  return csrfRequest
}

type BodyArgs<R extends ApiRoute> = ApiRequestBody<R> extends undefined ? [] : [body: ApiRequestBody<R>]

/**
 * Typed call into the API. The route string, request body and response type
 * all come from the shared ApiContract, so a contract change breaks the build.
 */
export async function apiRequest<R extends ApiRoute>(route: R, ...args: BodyArgs<R>): Promise<ApiResponseBody<R>> {
  const [method, path] = route.split(' ') as [string, string]
  const body: unknown = args[0]

  try {
    if (method === 'GET') return await send(method, path)

    try {
      return await send(method, path, body, { [CSRF_HEADER]: await getCsrfToken() })
    } catch (error) {
      // The token may have rotated (e.g. cookies cleared): fetch a fresh one and retry once.
      if (error instanceof ApiError && error.code === ApiErrorCode.CsrfInvalid) {
        return await send(method, path, body, { [CSRF_HEADER]: await getCsrfToken(true) })
      }
      throw error
    }
  } catch (error) {
    if (error instanceof ApiError && error.code === ApiErrorCode.Unauthorized) onUnauthorized?.()
    throw error
  }
}

/** Test helper. */
export function resetApiClientState(): void {
  csrfToken = null
  csrfRequest = null
  onUnauthorized = null
}
