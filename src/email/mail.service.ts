import { EmailTemplateService } from './template.service';

import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { getFrontendUrl, getSmtpConfig } from '../config/env';
import { withOperationLog } from '../common/logger';

@Injectable()
export class MailService {
  private transporter;
  private readonly from: string;

  constructor(private readonly tpl: EmailTemplateService) {
    const smtpConfig = getSmtpConfig();

    this.from = smtpConfig.from;
    this.transporter = nodemailer.createTransport(smtpConfig);
  }

  async sendResetPasswordEmail(to: string, resetToken: string) {
    const html = await this.tpl.render(
      {
        templateName: 'resetPassword',
      },
      {
        resetPasswordUrl: `${getFrontendUrl()}/reset-password/${resetToken}`,
      },
    );

    const mailOptions = {
      from: this.from,
      to,
      subject: 'Password Reset',
      html,
    };

    return withOperationLog('email_send', {
      context: 'MailService',
      emailType: 'password_reset',
      recipientDomain: this.getRecipientDomain(to),
    }, () => this.transporter.sendMail(mailOptions));
  }

  async sendEmailVerification(to: string, verificationLinkToken: string) {
    const html = await this.tpl.render(
      {
        templateName: 'verifyUserEmail',
      },
      {
        verificationUrl: `${getFrontendUrl()}/verify-email/${verificationLinkToken}`,
      },
    );

    const mailOptions = {
      from: this.from,
      to,
      subject: 'Account Activation',
      html,
    };

    return withOperationLog('email_send', {
      context: 'MailService',
      emailType: 'email_verification',
      recipientDomain: this.getRecipientDomain(to),
    }, () => this.transporter.sendMail(mailOptions));
  }

  private getRecipientDomain(email: string): string {
    return email.split('@')[1] || 'unknown';
  }
}
