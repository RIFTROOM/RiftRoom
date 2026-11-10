import { type ApiErrorBody, type ApiRoute, CSRF_HEADER, type User } from '@riftroom/shared'
import { vi } from 'vitest'

export const testUser: User = {
  id: '3f1c0d2e-8a4b-4c5d-9e6f-7a8b9c0d1e2f',
  username: 'nova_rift',
  email: 'nova@riftroom.dev',
  avatarUrl: null,
  createdAt: '2026-11-10T21:00:00.000Z',
  updatedAt: '2026-11-10T21:00:00.000Z',
}

export const CSRF_TOKEN = 'c'.repeat(43)

type Reply = { status: number; body?: unknown }
type Handler = (request: { body: unknown; headers: Headers }) => Reply

export function errorReply(status: number, code: ApiErrorBody['code'], message: string, fieldErrors?: ApiErrorBody['fieldErrors']): Reply {
  return { status, body: { statusCode: status, code, message, fieldErrors } }
}

/**
 * Stubs global fetch with handlers keyed by the shared ApiContract routes.
 * Unhandled routes fail the test loudly.
 */
export function fakeApi(handlers: Partial<Record<ApiRoute, Handler>>) {
  const calls: { route: string; body: unknown; headers: Headers }[] = []

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost')
    const route = `${init.method ?? 'GET'} ${url.pathname.replace(/^\/api/, '')}`
    const headers = new Headers(init.headers)
    const body: unknown = init.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ route, body, headers })

    if (route === 'GET /auth/csrf' && !handlers['GET /auth/csrf']) {
      return Response.json({ csrfToken: CSRF_TOKEN })
    }

    const handler = handlers[route as ApiRoute]
    if (!handler) throw new Error(`Unexpected API call: ${route}`)

    const reply = handler({ body, headers })
    return reply.body === undefined
      ? new Response(null, { status: reply.status })
      : Response.json(reply.body, { status: reply.status })
  })

  vi.stubGlobal('fetch', fetchMock)
  return { calls, csrfHeaderOf: (index: number) => calls[index]?.headers.get(CSRF_HEADER) }
}
