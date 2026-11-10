import { Inject, Injectable } from '@nestjs/common'
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { APP_CONFIG, type AppConfig } from '../config/app-config.js'

const KEY_LENGTH = 64
const SALT_LENGTH = 16
const BLOCK_SIZE = 8
const PARALLELIZATION = 1

// Stored as: scrypt$ln=<log2 N>,r=<r>,p=<p>$<salt>$<hash> (base64url).
// Parameters live in the hash, so the cost can be raised later without breaking old hashes.
const HASH_PATTERN = /^scrypt\$ln=(\d{1,2}),r=(\d{1,2}),p=(\d{1,2})\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/

interface ScryptParams {
  logN: number
  r: number
  p: number
}

function deriveKey(password: string, salt: Buffer, params: ScryptParams, keyLength: number) {
  const N = 2 ** params.logN
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      keyLength,
      // scrypt needs ~128 * N * r bytes; leave headroom above Node's 32 MiB default.
      { N, r: params.r, p: params.p, maxmem: 256 * N * params.r },
      (error, key) => (error ? reject(error) : resolve(key)),
    )
  })
}

/**
 * Password hashing with scrypt from node:crypto: memory-hard, salted,
 * recommended by OWASP, and needs no native dependency.
 */
@Injectable()
export class PasswordService {
  private dummyHash?: Promise<string>

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async hash(password: string): Promise<string> {
    const params: ScryptParams = { logN: this.config.passwordHashCost, r: BLOCK_SIZE, p: PARALLELIZATION }
    const salt = randomBytes(SALT_LENGTH)
    const key = await deriveKey(password, salt, params, KEY_LENGTH)
    return `scrypt$ln=${params.logN},r=${params.r},p=${params.p}$${salt.toString('base64url')}$${key.toString('base64url')}`
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    const match = HASH_PATTERN.exec(storedHash)
    if (!match) return false

    const [, logN, r, p, salt, expected] = match
    const expectedKey = Buffer.from(expected, 'base64url')
    const actualKey = await deriveKey(
      password,
      Buffer.from(salt, 'base64url'),
      { logN: Number(logN), r: Number(r), p: Number(p) },
      expectedKey.length,
    )
    return timingSafeEqual(actualKey, expectedKey)
  }

  /**
   * Burns the same CPU time as a real check. Used when the account does not
   * exist, so response time does not reveal which emails are registered.
   */
  async verifyAgainstDummy(password: string): Promise<false> {
    this.dummyHash ??= this.hash('riftroom-timing-equalizer')
    await this.verify(password, await this.dummyHash)
    return false
  }
}
