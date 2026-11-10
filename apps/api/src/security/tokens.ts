import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** 256-bit random token, URL-safe. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export function isWellFormedToken(value: string | undefined): value is string {
  return value !== undefined && TOKEN_PATTERN.test(value)
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}
