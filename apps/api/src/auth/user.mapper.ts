import type { User } from '@riftroom/shared'

/** Columns safe to read for API responses. Never includes passwordHash. */
export const publicUserSelect = {
  id: true,
  username: true,
  email: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
} as const

interface PublicUserRecord {
  id: string
  username: string
  email: string
  avatarUrl: string | null
  createdAt: Date
  updatedAt: Date
}

/** Copies only whitelisted fields, so extra columns on the record never leak. */
export function toPublicUser(record: PublicUserRecord): User {
  return {
    id: record.id,
    username: record.username,
    email: record.email,
    avatarUrl: record.avatarUrl,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}
