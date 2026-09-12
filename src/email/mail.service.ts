import { EmailTemplateService } from './template.service';

import { Injectable } from '@nestjs/common';
import { SendMailOptions, SentMessageInfo } from 'nodemailer';
import * as nodemailer from 'nodemailer';
import { getApiConfig } from '../config/env';
import { getLogger, withOperationLog } from '../common/logger';

@Injectable()
export class MailService {
  private transporter;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private readonly tpl: EmailTemplateService) {
    const config = getApiConfig();

    this.from = config.SMTP.from;
    this.frontendUrl = config.FRONTEND_URL;
    this.transporter = nodemailer.createTransport(config.SMTP);
  }

  async sendResetPasswordEmail(to: string, resetToken: string) {
    const html = await this.tpl.render(
      {
        templateName: 'resetPassword',
      },
      {
        resetPasswordUrl: `${this.frontendUrl}/reset-password/${resetToken}`,
      },
    );

    const mailOptions = {
      from: this.from,
      to,
      subject: 'Password Reset',
      html,
    };

    return this.sendMailWithLog(mailOptions, 'password_reset', to);
  }

  async sendEmailVerification(to: string, verificationLinkToken: string) {
    const html = await this.tpl.render(
      {
        templateName: 'verifyUserEmail',
      },
      {
        verificationUrl: `${this.frontendUrl}/verify-email/${verificationLinkToken}`,
      },
    );

    const mailOptions = {
      from: this.from,
      to,
      subject: 'Account Activation',
      html,
    };

    return this.sendMailWithLog(mailOptions, 'email_verification', to);
  }

  private sendMailWithLog(mailOptions: SendMailOptions, emailType: string, to: string) {
    const recipientDomain = this.getRecipientDomain(to);

    return withOperationLog(
      'email_send',
      {
        context: 'MailService',
        emailType,
        recipientDomain,
      },
      async () => {
        const result = await this.transporter.sendMail(mailOptions) as SentMessageInfo;

        getLogger({
          operation: 'email_send',
          context: 'MailService',
          emailType,
          recipientDomain,
        }).info(
          {
            event: 'email_send_result',
            messageId: result.messageId,
            acceptedCount: this.getRecipientCount(result.accepted),
            rejectedCount: this.getRecipientCount(result.rejected),
            acceptedDomains: this.getRecipientDomains(result.accepted),
            rejectedDomains: this.getRecipientDomains(result.rejected),
            response: result.response,
          },
          'email_send result',
        );

        return result;
      },
    );
  }

  private getRecipientDomain(email: string): string {
    return email.split('@')[1] || 'unknown';
  }

  private getRecipientCount(recipients?: unknown): number {
    return Array.isArray(recipients) ? recipients.length : 0;
  }

  private getRecipientDomains(recipients?: unknown): string[] {
    if (!Array.isArray(recipients)) {
      return [];
    }

    return recipients.map((recipient) => this.getRecipientDomain(String(recipient)));
  }
}
