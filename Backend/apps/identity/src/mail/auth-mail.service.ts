import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { MAIL_QUEUE, type MailJob } from './mail.queue.js';

@Injectable()
export class AuthMailService {
  constructor(
    @InjectQueue(MAIL_QUEUE) private readonly queue: Queue<MailJob>,
    private readonly config: ConfigService,
  ) {}

  sendEmailVerification(to: string, token: string) {
    const apiUrl = this.config.getOrThrow<string>('PUBLIC_API_URL');
    return this.enqueue({
      to,
      subject: 'Confirm your email for Landed',
      text: `Welcome to Landed!\n\nConfirm your email with this link. It works for 24 hours:\n${apiUrl}/auth/verify-email?token=${token}\n\nIf you didn't sign up, you can ignore this email.`,
    });
  }

  sendPasswordReset(to: string, token: string) {
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    return this.enqueue({
      to,
      subject: 'Reset your Landed password',
      text: `Use this link to choose a new password. It works for 1 hour:\n${frontendUrl}/reset-password/${token}\n\nIf you didn't ask for this, you can ignore this email and your password stays the same.`,
    });
  }

  // Finished jobs are removed straight away because they contain live one-time links.
  private enqueue(job: MailJob) {
    return this.queue.add('send', job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: true,
    });
  }
}
