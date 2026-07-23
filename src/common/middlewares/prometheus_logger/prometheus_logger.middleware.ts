// logger.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrometheusService } from '../../../common/prometheus/prometheus.service';

@Injectable()
export class PrometheusLoggerMiddleware implements NestMiddleware {
  constructor(private prometheusService: PrometheusService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime.bigint(); // high resolution start time

    res.on('finish', () => {
      const durationNs = process.hrtime.bigint() - start;
      const durationSec = Number(durationNs) / 1e9;

      // Record request duration
      this.prometheusService.httpDuration
        .labels(req.method, req.path, res.statusCode.toString())
        .observe(durationSec);

      // Increment total requests counter
      this.prometheusService.httpRequests
        .labels(req.method, req.path, res.statusCode.toString())
        .inc();
    });

    next();
  }
}
