import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import { type AuthResponse, CSRF_HEADER, type CsrfResponse, type RegisterRequest } from '@riftroom/shared'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { configureApp } from '../src/app.setup.js'
import { APP_CONFIG, loadConfig } from '../src/config/app-config.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

export const WEB_ORIGIN = 'http://localhost:5173'

export async function createTestApp(env: Record<string, string> = {}) {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(APP_CONFIG)
    .useValue(loadConfig({ ...process.env, ...env }))
    .compile()

  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false })
  configureApp(app, app.get(APP_CONFIG))
  await app.init()

  return { app, prisma: app.get(PrismaService) }
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE users, sessions, login_failures CASCADE')
}

/** A browser-like client: keeps cookies and sends the CSRF header on writes. */
export class TestClient {
  readonly agent: ReturnType<typeof request.agent>
  csrfToken = ''

  constructor(app: NestExpressApplication) {
    this.agent = request.agent(app.getHttpServer())
  }

  async init(): Promise<this> {
    const response = await this.agent.get('/api/auth/csrf').expect(200)
    this.csrfToken = (response.body as CsrfResponse).csrfToken
    return this
  }

  get(path: string) {
    return this.agent.get(path)
  }

  post(path: string, body?: object) {
    const call = this.agent.post(path).set('Origin', WEB_ORIGIN).set(CSRF_HEADER, this.csrfToken)
    return body ? call.send(body) : call
  }

  async register(overrides: Partial<RegisterRequest> = {}) {
    const response = await this.post('/api/auth/register', { ...validUser, ...overrides }).expect(201)
    return response.body as AuthResponse
  }
}

export const validUser: RegisterRequest = {
  username: 'Rift_Walker',
  email: 'Walker@Example.com',
  password: 'correct-horse-battery',
}

/** Value of a Set-Cookie header for the given cookie name. */
export function findSetCookie(headers: Record<string, unknown>, name: string): string | undefined {
  const raw = headers['set-cookie']
  const cookies = Array.isArray(raw) ? (raw as string[]) : []
  return cookies.find((cookie) => cookie.startsWith(`${name}=`))
}
