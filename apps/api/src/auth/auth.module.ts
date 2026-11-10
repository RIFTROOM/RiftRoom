import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller.js'
import { AuthService } from './auth.service.js'
import { LoginThrottleService } from './login-throttle.service.js'
import { PasswordService } from './password.service.js'
import { SessionGuard } from './session.guard.js'
import { SessionService } from './session.service.js'

@Module({
  controllers: [AuthController],
  providers: [AuthService, PasswordService, SessionService, LoginThrottleService, SessionGuard],
  exports: [SessionService, SessionGuard],
})
export class AuthModule {}
