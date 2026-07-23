// mail/mail.service.ts
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Counter, Registry } from 'prom-client';

/**
 *! Mail Service
 */
@Injectable()
export class MailService {
  private transporter;
  private emailsSentCounter: Counter<string>;
  private register: Registry;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // e.g. smtp.gmail.com
      port: Number(process.env.SMTP_PORT), // 587 or 465
      secure: false, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Prometheus registry
    this.register = new Registry();
    this.register.setDefaultLabels({ app: 'nestjs-prometheus' });

    // Counter for emails sent
    this.emailsSentCounter = new Counter({
      name: 'emails_sent_total',
      help: 'Total number of emails sent by the app',
      labelNames: ['status'], // success or failed
      registers: [this.register],
    });

    // Pre-create label series with zero value
    this.emailsSentCounter.labels({ status: 'success' });
    this.emailsSentCounter.labels({ status: 'failed' });
  }

  async sendMail(to: string, subject: string, text: string, html?: string) {
    try {
      const info = await this.transporter.sendMail({
        from: `"Job Seeker" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });
      // console.log('Email sent:', info.messageId);
      this.logger.debug(`Email sent to ${to} with subject "${subject}"`);
      // Increment success counter
      this.emailsSentCounter.inc({ status: 'success' });
    } catch (err) {
      console.error(err);
      // Increment failure counter
      this.emailsSentCounter.inc({ status: 'failed' });
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  // Expose metrics for Prometheus
  getMetrics(): Promise<string> {
    return this.register.metrics();
  }
}
