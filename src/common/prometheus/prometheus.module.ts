import { Module } from '@nestjs/common';
import { PrometheusService } from './prometheus.service';
import { MetricsInterceptor } from '../interceptors/metrics.interceptor';
import { PrometheusController } from './prometheus.controller';
import { MailService } from '../../modules/mail/mail.service';

@Module({
  providers: [PrometheusService, MetricsInterceptor, MailService],
  controllers: [PrometheusController],
  exports: [MetricsInterceptor],
})
export class PrometheusModule {}
