import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrometheusService } from './prometheus.service';
import { MailService } from '../../modules/mail/mail.service';

@Controller('metrics')
export class PrometheusController {
  constructor(
    private readonly prometheusService: PrometheusService,
    private mailService: MailService,
  ) {}

  @Get()
  async getMetrics(@Res() res: Response) {
    const metrics = await this.prometheusService.getMetrics([
      this.mailService['register'],
    ]);
    res.setHeader('Content-Type', 'text/plain');
    res.send(metrics);
  }
}
