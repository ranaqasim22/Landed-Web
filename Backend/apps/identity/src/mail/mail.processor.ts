import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import { createTransport, type Transporter } from 'nodemailer';
import { MAIL_QUEUE, type MailJob } from './mail.queue.js';

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    super();
    this.from = config.getOrThrow<string>('MAIL_FROM');
    this.transporter = createTransport({
      host: config.getOrThrow<string>('SMTP_HOST'),
      port: Number(config.getOrThrow<string>('SMTP_PORT')),
    });
  }

  async process({ data }: Job<MailJob>) {
    await this.transporter.sendMail({ from: this.from, ...data });
  }
}
