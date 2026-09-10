import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { EmailTemplateService } from './template.service';

@Module({
  providers: [MailService, EmailTemplateService],
})
export class MailModule {}
