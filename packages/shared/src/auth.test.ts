import { describe, expect, it } from 'vitest'
import { loginRequestSchema, registerRequestSchema } from './auth.js'
import { toFieldErrors } from './errors.js'

describe('registerRequestSchema', () => {
  const valid = { username: 'Rift_User', email: '  Player@Example.COM ', password: 'correct-horse' }

  it('normalizes username and email', () => {
    const result = registerRequestSchema.parse(valid)
    expect(result).toEqual({
      username: 'rift_user',
      email: 'player@example.com',
      password: 'correct-horse',
    })
  })

  it('does not trim or alter the password', () => {
    const result = registerRequestSchema.parse({ ...valid, password: '  spaced pass  ' })
    expect(result.password).toBe('  spaced pass  ')
  })

  it.each([
    ['username', 'ab', 'at least 3'],
    ['username', 'bad name!', 'letters, numbers and underscores'],
    ['username', 'a'.repeat(25), 'at most 24'],
    ['email', 'not-an-email', 'valid email'],
    ['password', 'short', 'at least 8'],
    ['password', ' '.repeat(10), 'only spaces'],
    ['password', 'x'.repeat(129), 'at most 128'],
  ])('rejects invalid %s %j', (field, value, message) => {
    const result = registerRequestSchema.safeParse({ ...valid, [field]: value })
    expect(result.success).toBe(false)
    expect(toFieldErrors(result.error!)[field]).toContain(message)
  })

  it('reports "required" first for empty fields', () => {
    const result = registerRequestSchema.safeParse({ username: '', email: '', password: '' })
    expect(toFieldErrors(result.error!)).toEqual({
      username: 'Username is required',
      email: 'Email is required',
      password: 'Password is required',
    })
  })
})

describe('loginRequestSchema', () => {
  it('accepts passwords that predate the current policy', () => {
    expect(loginRequestSchema.safeParse({ email: 'a@b.co', password: 'short' }).success).toBe(true)
  })

  it('rejects an empty password', () => {
    const result = loginRequestSchema.safeParse({ email: 'a@b.co', password: '' })
    expect(toFieldErrors(result.error!).password).toBe('Password is required')
  })
})
