import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AuthMailService } from './auth-mail.service.js';
import { MAIL_QUEUE } from './mail.queue.js';
import { MailProcessor } from './mail.processor.js';

@Module({
  imports: [BullModule.registerQueue({ name: MAIL_QUEUE })],
  providers: [AuthMailService, MailProcessor],
  exports: [AuthMailService],
})
export class MailModule {}
