import type { Request } from 'express'

export interface RequestMeta {
  ipAddress: string | null
  userAgent: string | null
}

export function getRequestMeta(request: Request): RequestMeta {
  return {
    ipAddress: request.ip?.slice(0, 64) ?? null,
    userAgent: request.get('user-agent')?.slice(0, 512) ?? null,
  }
}
