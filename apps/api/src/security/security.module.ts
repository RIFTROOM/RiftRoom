import { Global, Module } from '@nestjs/common'
import { AuthCookiesService } from './auth-cookies.service.js'
import { CsrfService } from './csrf.service.js'

@Global()
@Module({
  providers: [AuthCookiesService, CsrfService],
  exports: [AuthCookiesService, CsrfService],
})
export class SecurityModule {}
