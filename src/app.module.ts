import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { TranslationsModule } from './translations/module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { MailModule } from './email/mail.module';
import { ValidationModule } from './validation/validation.module';
import { TrackingModule } from './tracking/tracking.module';

@Module({
  imports: [ConfigModule.forRoot(), TranslationsModule, AuthModule, UserModule, MailModule, ValidationModule, TrackingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
