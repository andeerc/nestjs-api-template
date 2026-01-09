import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { emailProcessor } from './constants';
import { EmailService } from './email.service';
import { EmailConsumer } from './queues/send-mail.queue';

@Module({
  imports: [
    BullModule.registerQueue({
      name: emailProcessor,
      defaultJobOptions: {
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
  ],
  providers: [EmailService, EmailConsumer],
  exports: [EmailService],
})
export class EmailModule { }
