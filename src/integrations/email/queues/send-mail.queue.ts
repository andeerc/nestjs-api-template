import { envConfig } from '@/config/env.config';
import { Process, Processor } from '@nestjs/bull';
import { Logger, OnModuleInit } from '@nestjs/common';
import type { Job } from 'bull';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { emailProcessor, sendBulkProcess, sendEmailProcess, sendPasswordResetProcess, sendVerificationProcess, sendWelcomeProcess } from '../constants';
import { EmailResult, SendEmailDto } from '../dto';

export interface SendEmailJob {
  dto: SendEmailDto;
  jobId?: string;
  attempts?: number;
}

@Processor(emailProcessor)
export class EmailConsumer implements OnModuleInit {
  private readonly logger = new Logger(EmailConsumer.name);
  private transporter: Transporter;

  onModuleInit() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      host: envConfig.email.smtp.host,
      port: envConfig.email.smtp.port,
      secure: envConfig.email.smtp.secure,
      auth: {
        user: envConfig.email.smtp.auth.user,
        pass: envConfig.email.smtp.auth.pass,
      },
    });

    this.logger.verbose(
      `Email transporter initialized: ${envConfig.email.smtp.host}:${envConfig.email.smtp.port}`,
    );
  }

  @Process(sendEmailProcess)
  async sendMail(job: Job<SendEmailJob>) {
    this.logger.log(`Processing email job ${job.id} (attempt ${job.attemptsMade + 1}/${job.opts.attempts})`);

    try {
      const { dto } = job.data;
      await job.progress(10);

      const info = await this.transporter.sendMail({
        from: dto.from || envConfig.email.from,
        to: Array.isArray(dto.to) ? dto.to.join(', ') : dto.to,
        subject: dto.subject,
        text: dto.text,
        html: dto.html,
        cc: dto.cc,
        bcc: dto.bcc,
        attachments: dto.attachments,
      });

      await job.progress(100);

      this.logger.log(`Email sent successfully: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process email job ${job.id}: ${error.message}`,
        error.stack,
      );

      if (job.attemptsMade < (job.opts.attempts || 3) - 1) {
        throw error;
      }

      this.logger.error(
        `Email job ${job.id} failed after ${job.attemptsMade + 1} attempts`,
      );
      throw error;
    }
  }

  /**
   * Processa jobs de email de boas-vindas
   */
  @Process(sendWelcomeProcess)
  async sendWelcome(job: Job<{ email: string; userName: string }>) {
    this.logger.log(`Processing welcome email job ${job.id}`);

    const { email, userName } = job.data;

    const html = this.getWelcomeTemplate(userName);

    return this.transporter.sendMail({
      from: envConfig.email.from,
      to: email,
      subject: 'Bem-vindo ao api api!',
      html,
    });
  }

  /**
   * Processa jobs de email de redefinição de senha
   */
  @Process(sendPasswordResetProcess)
  async sendPasswordReset(
    job: Job<{ email: string; resetToken: string }>,
  ) {
    this.logger.log(`Processing password reset email job ${job.id}`);

    const { email, resetToken } = job.data;
    const resetUrl = `${envConfig.email.appUrl}/reset-password?token=${resetToken}`;
    const html = this.getPasswordResetTemplate(resetUrl);

    return this.transporter.sendMail({
      from: envConfig.email.from,
      to: email,
      subject: 'Redefinição de Senha',
      html,
    });
  }

  /**
   * Processa jobs de email de verificação
   */
  @Process(sendVerificationProcess)
  async sendVerification(
    job: Job<{ email: string; verificationToken: string }>,
  ) {
    this.logger.log(`Processing verification email job ${job.id}`);

    const { email, verificationToken } = job.data;
    const verificationUrl = `${envConfig.email.appUrl}/verify?token=${verificationToken}`;
    const html = this.getVerificationTemplate(verificationUrl);

    return this.transporter.sendMail({
      from: envConfig.email.from,
      to: email,
      subject: 'Verificação de Email',
      html,
    });
  }

  /**
   * Processa jobs de email em lote
   */
  @Process(sendBulkProcess)
  async sendBulk(job: Job<{ emails: SendEmailDto[] }>) {
    this.logger.log(`Processing bulk email job ${job.id} with ${job.data.emails.length} emails`);

    const { emails } = job.data;
    const total = emails.length;
    let processed = 0;

    const results: EmailResult[] = [];

    for (const email of emails) {
      try {
        const info = await this.transporter.sendMail({
          from: email.from || envConfig.email.from,
          to: Array.isArray(email.to) ? email.to.join(', ') : email.to,
          subject: email.subject,
          text: email.text,
          html: email.html,
          cc: email.cc,
          bcc: email.bcc,
          attachments: email.attachments,
        });

        results.push({ success: true, messageId: info.messageId });
        processed++;
        await job.progress(Math.floor((processed / total) * 100));
      } catch (error) {
        this.logger.error(`Failed to send bulk email: ${error.message}`);
        results.push({ success: false, error: error.message });
      }
    }

    this.logger.log(`Bulk email job ${job.id} completed: ${results.filter(r => r.success).length}/${total} succeeded`);

    return {
      total,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  // Templates de email
  private getWelcomeTemplate(userName: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .button { background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bem-vindo ao api api!</h1>
            </div>
            <div class="content">
              <p>Olá ${userName},</p>
              <p>Estamos muito felizes em ter você conosco!</p>
              <p>Sua conta foi criada com sucesso e você já pode começar a usar nossa plataforma.</p>
              <p>
                <a href="${envConfig.email.appUrl}/dashboard" class="button">
                  Acessar Dashboard
                </a>
              </p>
              <p>Se você tiver alguma dúvida, não hesite em nos contatar.</p>
              <p>Atenciosamente,<br>Equipe api api</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getPasswordResetTemplate(resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #FF9800; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .button { background: #FF9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; margin: 10px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Redefinição de Senha</h1>
            </div>
            <div class="content">
              <p>Olá,</p>
              <p>Você solicitou a redefinição de sua senha.</p>
              <p>Clique no botão abaixo para criar uma nova senha:</p>
              <p>
                <a href="${resetUrl}" class="button">
                  Redefinir Senha
                </a>
              </p>
              <div class="warning">
                <strong>Atenção:</strong> Este link expira em 1 hora. Se você não solicitou esta redefinição, ignore este email.
              </div>
              <p>Atenciosamente,<br>Equipe api api</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getVerificationTemplate(verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .button { background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verificação de Email</h1>
            </div>
            <div class="content">
              <p>Olá,</p>
              <p>Obrigado por se registrar no api api!</p>
              <p>Por favor, verifique seu email clicando no botão abaixo:</p>
              <p>
                <a href="${verificationUrl}" class="button">
                  Verificar Email
                </a>
              </p>
              <p>Atenciosamente,<br>Equipe api api</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}