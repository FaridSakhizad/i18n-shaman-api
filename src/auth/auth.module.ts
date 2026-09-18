import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { MailService } from '../email/mail.service';
import { EmailTemplateService } from '../email/template.service';
import { ValidationService } from '../validation/validation.service';
import { DatabaseModule } from '../database/database.module';
import { Providers } from '../database/providers';
import { VerifiedEmailGuard } from './verified-email.guard';
import { RateLimitGuard } from '../common/rate-limit.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [AuthService, TokenService, MailService, EmailTemplateService, ValidationService, VerifiedEmailGuard, RateLimitGuard, ...Providers],
})
export class AuthModule {}
