import { ApiErrorCode, CSRF_HEADER } from '@riftroom/shared'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CSRF_TOKEN, errorReply, fakeApi, testUser } from './fake-api'
import { renderApp } from './render-app'

const signedOut = { 'GET /auth/me': () => errorReply(401, ApiErrorCode.Unauthorized, 'You are not signed in.') }
const signedIn = { 'GET /auth/me': () => ({ status: 200, body: { user: testUser } }) }

function type(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('protected routes', () => {
  it('sends anonymous visitors from /dashboard to /login', async () => {
    fakeApi(signedOut)
    const router = renderApp('/dashboard')

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeTruthy()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('restores the session on load and shows the dashboard', async () => {
    fakeApi(signedIn)
    renderApp('/dashboard')

    expect(await screen.findByRole('heading', { name: /nova_rift/ })).toBeTruthy()
  })

  it('sends signed-in users away from /login', async () => {
    fakeApi(signedIn)
    const router = renderApp('/login')

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'))
  })

  it('shows a retry screen when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    renderApp('/dashboard')

    expect(await screen.findByText('We couldn’t check your session')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })
})

describe('login', () => {
  it('validates on submit without calling the API', async () => {
    const api = fakeApi(signedOut)
    renderApp('/login')
    await screen.findByRole('heading', { name: 'Welcome back' })

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Email is required')).toBeTruthy()
    expect(screen.getByText('Password is required')).toBeTruthy()
    expect(api.calls.map((call) => call.route)).toEqual(['GET /auth/me'])
  })

  it('does not show errors when leaving an untouched field (no layout jump under the pointer)', async () => {
    fakeApi(signedOut)
    renderApp('/login')
    await screen.findByRole('heading', { name: 'Welcome back' })

    fireEvent.blur(screen.getByLabelText(/email/i))
    expect(screen.queryByText('Email is required')).toBeNull()
  })

  it('signs in with a CSRF token and lands on the page the user wanted', async () => {
    const api = fakeApi({
      ...signedOut,
      'POST /auth/login': () => ({ status: 200, body: { user: testUser } }),
    })
    const router = renderApp('/dashboard')
    await screen.findByRole('heading', { name: 'Welcome back' })

    type(/email/i, 'nova@riftroom.dev')
    type(/^password$/i, 'Stardust-2026!')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: /nova_rift/ })).toBeTruthy()
    expect(router.state.location.pathname).toBe('/dashboard')

    const login = api.calls.find((call) => call.route === 'POST /auth/login')!
    expect(login.body).toEqual({ email: 'nova@riftroom.dev', password: 'Stardust-2026!' })
    expect(login.headers.get(CSRF_HEADER)).toBe(CSRF_TOKEN)
  })

  it('shows the server message for wrong credentials', async () => {
    fakeApi({
      ...signedOut,
      'POST /auth/login': () => errorReply(401, ApiErrorCode.InvalidCredentials, 'Invalid email or password.'),
    })
    renderApp('/login')
    await screen.findByRole('heading', { name: 'Welcome back' })

    type(/email/i, 'nova@riftroom.dev')
    type(/^password$/i, 'wrong-password')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Invalid email or password.')
    // A failed login must not sign the user out of the app state.
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeTruthy()
  })

  it('retries once with a fresh token when the CSRF token was rejected', async () => {
    let attempts = 0
    const api = fakeApi({
      ...signedOut,
      'POST /auth/login': () =>
        ++attempts === 1
          ? errorReply(403, ApiErrorCode.CsrfInvalid, 'Invalid token')
          : { status: 200, body: { user: testUser } },
    })
    renderApp('/login')
    await screen.findByRole('heading', { name: 'Welcome back' })

    type(/email/i, 'nova@riftroom.dev')
    type(/^password$/i, 'Stardust-2026!')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: /nova_rift/ })).toBeTruthy()
    expect(api.calls.filter((call) => call.route === 'GET /auth/csrf')).toHaveLength(2)
  })
})

describe('register', () => {
  it('shows server field errors under the matching input', async () => {
    fakeApi({
      ...signedOut,
      'POST /auth/register': () =>
        errorReply(409, ApiErrorCode.EmailTaken, 'An account with this email already exists.', {
          email: 'An account with this email already exists',
        }),
    })
    renderApp('/register')
    await screen.findByRole('heading', { name: 'Create your account' })

    type(/username/i, 'second_player')
    type(/email/i, 'nova@riftroom.dev')
    type(/^password$/i, 'another-pass-123')
    type(/confirm password/i, 'another-pass-123')
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('An account with this email already exists')).toBeTruthy()
    expect(screen.getByLabelText(/email/i).getAttribute('aria-invalid')).toBe('true')
  })

  it('requires matching passwords and never sends confirmPassword', async () => {
    const api = fakeApi({
      ...signedOut,
      'POST /auth/register': () => ({ status: 201, body: { user: testUser } }),
    })
    renderApp('/register')
    await screen.findByRole('heading', { name: 'Create your account' })

    type(/username/i, 'nova_rift')
    type(/email/i, 'nova@riftroom.dev')
    type(/^password$/i, 'Stardust-2026!')
    type(/confirm password/i, 'Stardust-2025!')
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Passwords do not match')).toBeTruthy()

    type(/confirm password/i, 'Stardust-2026!')
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { name: /nova_rift/ })).toBeTruthy()
    const register = api.calls.find((call) => call.route === 'POST /auth/register')!
    expect(register.body).toEqual({ username: 'nova_rift', email: 'nova@riftroom.dev', password: 'Stardust-2026!' })
  })
})

describe('logout', () => {
  it('ends the session and returns to the login page', async () => {
    const api = fakeApi({ ...signedIn, 'POST /auth/logout': () => ({ status: 204 }) })
    const router = renderApp('/dashboard')
    await screen.findByRole('heading', { name: /nova_rift/ })

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(api.calls.some((call) => call.route === 'POST /auth/logout')).toBe(true)
  })
})
