import type { NestExpressApplication } from '@nestjs/platform-express'
import { ApiErrorCode, CSRF_HEADER, type AuthResponse } from '@riftroom/shared'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaService } from '../src/prisma/prisma.service.js'
import { hashToken } from '../src/security/tokens.js'
import { createTestApp, findSetCookie, resetDatabase, TestClient, validUser, WEB_ORIGIN } from './helpers.js'

const SESSION_COOKIE = 'rr_session'

describe('Auth API (e2e)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService
  let client: TestClient

  beforeAll(async () => {
    ;({ app, prisma } = await createTestApp())
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await resetDatabase(prisma)
    client = await new TestClient(app).init()
  })

  describe('POST /api/auth/register', () => {
    it('creates the user in Postgres, signs them in and never exposes the password hash', async () => {
      const response = await client.post('/api/auth/register', validUser).expect(201)
      const { user } = response.body as AuthResponse

      expect(user).toEqual({
        id: expect.any(String),
        username: 'rift_walker',
        email: 'walker@example.com',
        avatarUrl: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
      expect(JSON.stringify(response.body)).not.toMatch(/password/i)

      const cookie = findSetCookie(response.headers, SESSION_COOKIE)
      expect(cookie).toMatch(/HttpOnly/)
      expect(cookie).toMatch(/SameSite=Lax/)
      expect(response.headers['cache-control']).toBe('no-store')

      const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
      expect(stored.passwordHash).toMatch(/^scrypt\$/)
      expect(stored.passwordHash).not.toContain(validUser.password)
    })

    it('returns field errors for invalid input', async () => {
      const response = await client
        .post('/api/auth/register', { username: 'x', email: 'nope', password: '123' })
        .expect(400)

      expect(response.body).toMatchObject({
        code: ApiErrorCode.ValidationError,
        fieldErrors: {
          username: expect.stringContaining('at least 3'),
          email: expect.stringContaining('valid email'),
          password: expect.stringContaining('at least 8'),
        },
      })
    })

    it('rejects a taken email (case-insensitive) and a taken username', async () => {
      await client.register()
      const other = await new TestClient(app).init()

      const sameEmail = await other
        .post('/api/auth/register', { ...validUser, username: 'someone_else', email: 'WALKER@example.com' })
        .expect(409)
      expect(sameEmail.body).toMatchObject({ code: ApiErrorCode.EmailTaken, fieldErrors: { email: expect.any(String) } })

      const sameUsername = await other
        .post('/api/auth/register', { ...validUser, email: 'other@example.com' })
        .expect(409)
      expect(sameUsername.body).toMatchObject({
        code: ApiErrorCode.UsernameTaken,
        fieldErrors: { username: expect.any(String) },
      })
    })
  })

  describe('session', () => {
    it('keeps the user signed in across requests (like a page reload)', async () => {
      const { user } = await client.register()

      const me = await client.get('/api/auth/me').expect(200)
      expect((me.body as AuthResponse).user).toEqual(user)
    })

    it('returns 401 without a session', async () => {
      const response = await request(app.getHttpServer()).get('/api/auth/me').expect(401)
      expect(response.body).toMatchObject({ code: ApiErrorCode.Unauthorized })
    })

    it('stores only a hash of the session token', async () => {
      const response = await client.post('/api/auth/register', validUser).expect(201)
      const token = findSetCookie(response.headers, SESSION_COOKIE)!.split(';')[0].split('=')[1]

      const sessions = await prisma.session.findMany()
      expect(sessions).toHaveLength(1)
      expect(sessions[0].tokenHash).toBe(hashToken(token))
      expect(sessions[0].tokenHash).not.toBe(token)
    })

    it('rejects an expired session and clears the cookie', async () => {
      await client.register()
      await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } })

      const response = await client.get('/api/auth/me').expect(401)
      expect(findSetCookie(response.headers, SESSION_COOKIE)).toMatch(/Expires=Thu, 01 Jan 1970/)
      expect(await prisma.session.count()).toBe(0)
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await client.register()
      await client.post('/api/auth/logout').expect(204)
    })

    it('signs in with valid credentials (email is case-insensitive)', async () => {
      const response = await client
        .post('/api/auth/login', { email: ' WALKER@example.com ', password: validUser.password })
        .expect(200)

      expect((response.body as AuthResponse).user.username).toBe('rift_walker')
      await client.get('/api/auth/me').expect(200)
    })

    it('gives the same answer for a wrong password and an unknown email', async () => {
      const wrongPassword = await client
        .post('/api/auth/login', { email: validUser.email, password: 'wrong-password' })
        .expect(401)
      const unknownEmail = await client
        .post('/api/auth/login', { email: 'ghost@example.com', password: 'wrong-password' })
        .expect(401)

      expect(wrongPassword.body).toEqual(unknownEmail.body)
      expect(wrongPassword.body).toMatchObject({ code: ApiErrorCode.InvalidCredentials })
    })

    it('replaces the previous session instead of reusing it', async () => {
      await client.post('/api/auth/login', { email: validUser.email, password: validUser.password }).expect(200)
      await client.post('/api/auth/login', { email: validUser.email, password: validUser.password }).expect(200)
      expect(await prisma.session.count()).toBe(1)
    })

    it('locks the account after repeated failures, even for the right password', async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        await client.post('/api/auth/login', { email: validUser.email, password: 'wrong-password' }).expect(401)
      }

      const locked = await client
        .post('/api/auth/login', { email: validUser.email, password: validUser.password })
        .expect(429)
      expect(locked.body).toMatchObject({ code: ApiErrorCode.TooManyRequests })
      expect(Number(locked.headers['retry-after'])).toBeGreaterThan(0)
    })

    it('resets the failure counter after a successful sign-in', async () => {
      const wrong = { email: validUser.email, password: 'wrong-password' }
      await client.post('/api/auth/login', wrong).expect(401)
      await client.post('/api/auth/login', wrong).expect(401)
      await client.post('/api/auth/login', { email: validUser.email, password: validUser.password }).expect(200)
      await client.post('/api/auth/login', wrong).expect(401)
      await client.post('/api/auth/login', wrong).expect(401)
      await client.post('/api/auth/login', { email: validUser.email, password: validUser.password }).expect(200)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('ends the session on the server, so the old cookie stops working', async () => {
      const response = await client.post('/api/auth/register', validUser).expect(201)
      const sessionCookie = findSetCookie(response.headers, SESSION_COOKIE)!.split(';')[0]

      await client.post('/api/auth/logout').expect(204)
      await client.get('/api/auth/me').expect(401)
      expect(await prisma.session.count()).toBe(0)

      // Replaying the stolen/old cookie must not work either.
      await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', sessionCookie).expect(401)
    })
  })

  describe('CSRF protection', () => {
    it('rejects writes without a CSRF token', async () => {
      const response = await client.agent.post('/api/auth/register').send(validUser).expect(403)
      expect(response.body).toMatchObject({ code: ApiErrorCode.CsrfInvalid })
    })

    it('rejects a token that does not match the cookie', async () => {
      await client.agent
        .post('/api/auth/register')
        .set(CSRF_HEADER, 'A'.repeat(43))
        .send(validUser)
        .expect(403)
    })

    it('rejects requests from a foreign origin even with a valid token', async () => {
      await client.agent
        .post('/api/auth/register')
        .set('Origin', 'https://evil.example')
        .set(CSRF_HEADER, client.csrfToken)
        .send(validUser)
        .expect(403)
      expect(await prisma.user.count()).toBe(0)
    })

    it('keeps the same token across page loads', async () => {
      const again = await client.get('/api/auth/csrf').expect(200)
      expect(again.body).toEqual({ csrfToken: client.csrfToken })
    })
  })

  describe('error handling', () => {
    it('returns the shared error shape for malformed JSON', async () => {
      const response = await client
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email":')
        .expect(400)
      expect(response.body).toMatchObject({ statusCode: 400, code: ApiErrorCode.BadRequest })
    })

    it('returns the shared error shape for unknown routes', async () => {
      const response = await client.get('/api/does-not-exist').expect(404)
      expect(response.body).toMatchObject({ code: ApiErrorCode.NotFound })
    })
  })
})

describe('Per-IP rate limit (e2e)', () => {
  it('blocks bursts of sign-in attempts from one IP', async () => {
    const { app, prisma } = await createTestApp({ AUTH_RATE_LIMIT_PER_MINUTE: '2' })
    try {
      await resetDatabase(prisma)
      const client = await new TestClient(app).init()
      const body = { email: 'ghost@example.com', password: 'whatever-pass' }

      await client.post('/api/auth/login', body).expect(401)
      await client.post('/api/auth/login', body).expect(401)
      const blocked = await client.post('/api/auth/login', body).expect(429)
      expect(blocked.body).toMatchObject({ code: ApiErrorCode.TooManyRequests })

      // Reading the session is not affected by the auth limit.
      await client.get('/api/auth/me').expect(401)
    } finally {
      await app.close()
    }
  })
})

describe('Health (e2e)', () => {
  it('reports ok when the database is reachable', async () => {
    const { app } = await createTestApp()
    try {
      await request(app.getHttpServer()).get('/api/health').set('Origin', WEB_ORIGIN).expect(200, { status: 'ok' })
    } finally {
      await app.close()
    }
  })
})
