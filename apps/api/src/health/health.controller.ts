import { Controller, Get } from '@nestjs/common'
import type { HealthResponse } from '@riftroom/shared'
import { PrismaService } from '../prisma/prisma.service.js'

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Also checks the database, so it fails when Postgres is unreachable. */
  @Get()
  async check(): Promise<HealthResponse> {
    await this.prisma.$queryRaw`SELECT 1`
    return { status: 'ok' }
  }
}
