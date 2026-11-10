import { describe, expect, it } from 'vitest'
import { loadConfig } from '../config/app-config.js'
import { PasswordService } from './password.service.js'

const passwords = new PasswordService(loadConfig({ DATABASE_URL: 'unused', PASSWORD_HASH_COST: '12' }))

describe('PasswordService', () => {
  it('verifies the original password and rejects others', async () => {
    const hash = await passwords.hash('correct-horse')

    expect(hash).toMatch(/^scrypt\$ln=12,r=8,p=1\$/)
    expect(hash).not.toContain('correct-horse')
    await expect(passwords.verify('correct-horse', hash)).resolves.toBe(true)
    await expect(passwords.verify('correct-horsE', hash)).resolves.toBe(false)
  })

  it('salts every hash', async () => {
    const [first, second] = await Promise.all([passwords.hash('same'), passwords.hash('same')])
    expect(first).not.toBe(second)
  })

  it('treats malformed hashes as a failed check, not a crash', async () => {
    await expect(passwords.verify('x', 'plain-text')).resolves.toBe(false)
    await expect(passwords.verify('x', '')).resolves.toBe(false)
  })

  it('reads the cost from the stored hash, so old hashes survive a cost change', async () => {
    const stronger = new PasswordService(loadConfig({ DATABASE_URL: 'unused', PASSWORD_HASH_COST: '13' }))
    const oldHash = await passwords.hash('legacy')
    await expect(stronger.verify('legacy', oldHash)).resolves.toBe(true)
  })
})
