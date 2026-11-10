import './load-env.js'

import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { API_PREFIX } from '@riftroom/shared'
import { AppModule } from './app.module.js'
import { configureApp } from './app.setup.js'
import { APP_CONFIG, type AppConfig } from './config/app-config.js'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const config = app.get<AppConfig>(APP_CONFIG)
  configureApp(app, config)

  await app.listen(config.port)
  Logger.log(`API ready at http://localhost:${config.port}${API_PREFIX}`, 'Bootstrap')
}

await bootstrap()
