import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap, catchError } from 'rxjs';
import { PrometheusService } from '../prometheus/prometheus.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private metrics: PrometheusService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    const method = req.method;
    const route = req.route?.path || req.url;

    const start = process.hrtime();

    const recordMetrics = () => {
      const diff = process.hrtime(start);
      const duration = diff[0] + diff[1] / 1e9;
      const status = res.statusCode.toString();

      // Duration
      this.metrics.httpDuration.labels(method, route, status).observe(duration);

      // Counter
      this.metrics.httpRequests.labels(method, route, status).inc();

      // Response Size
      const contentLengthHeader = res.getHeader('content-length');
      const contentLength = contentLengthHeader
        ? Number(contentLengthHeader)
        : 0;

      this.metrics.httpResponseSize
        .labels(method, route, status)
        .observe(contentLength);
    };

    return next.handle().pipe(
      tap(() => recordMetrics()),
      catchError((err) => {
        recordMetrics();
        throw err;
      }),
    );
  }
}
