import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bull';
import { emailProcessor, sendEmailProcess, sendPasswordResetProcess, sendVerificationProcess, sendWelcomeProcess } from './constants';
import { SendEmailDto } from './dto';

@Injectable()
export class EmailService {
  constructor(@InjectQueue(emailProcessor) private emailQueue: Queue) { }

  async send(dto: SendEmailDto, priority = 5) {
    const job = await this.emailQueue.add(sendEmailProcess, { dto }, { priority });
    return { jobId: job.id, status: 'queued' };
  }

  async sendWelcomeEmail(to: string, userName: string, priority = 7) {
    const job = await this.emailQueue.add(
      sendWelcomeProcess,
      { email: to, userName },
      { priority },
    );
    return { jobId: job.id, status: 'queued' };
  }

  async sendPasswordReset(to: string, resetToken: string, priority = 10) {
    const job = await this.emailQueue.add(
      sendPasswordResetProcess,
      { email: to, resetToken },
      { priority },
    );
    return { jobId: job.id, status: 'queued' };
  }

  async sendVerificationEmail(
    to: string,
    verificationToken: string,
    priority = 8,
  ) {
    const job = await this.emailQueue.add(
      sendVerificationProcess,
      { email: to, verificationToken },
      { priority },
    );
    return { jobId: job.id, status: 'queued' };
  }

  async sendBulk(emails: SendEmailDto[], priority = 1) {
    const job = await this.emailQueue.add('send-bulk', { emails }, { priority });
    return { jobId: job.id, status: 'queued', totalEmails: emails.length };
  }

  async getJobStatus(jobId: string) {
    const job = await this.emailQueue.getJob(jobId);
    if (!job) return { found: false };

    const state = await job.getState();
    return {
      found: true,
      id: job.id,
      state,
      progress: job.progress(),
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
    };
  }

  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getCompletedCount(),
      this.emailQueue.getFailedCount(),
      this.emailQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }
}
