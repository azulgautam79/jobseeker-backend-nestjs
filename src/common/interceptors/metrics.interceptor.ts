import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap, catchError, finalize } from 'rxjs';
import { PrometheusService } from '../prometheus/prometheus.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private metrics: PrometheusService) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {

    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();
    const method = req.method;

    const route =
      req.route?.path ??
      req.originalUrl.split('?')[0];

    const controller = context.getClass().name;

    const handler = context.getHandler().name;

    this.metrics.httpInFlight
      .labels(
        method,
        route
      )
      .inc();

    const start = process.hrtime();

    const recordMetrics = () => {
      const diff = process.hrtime(start);
      const duration = diff[0] + diff[1] / 1e9;
      const status = res.statusCode.toString();

      const contentLengthHeader = res.getHeader('content-length');

      const contentLength = contentLengthHeader
        ? Number(contentLengthHeader)
        : 0;

      this.metrics.httpDuration
        .labels(
          method,
          route,
          status,
          controller,
          handler,
        )
        .observe(duration);

      this.metrics.httpRequests
        .labels(
          method,
          route,
          status,
          controller,
          handler,
        )
        .inc();

      this.metrics.httpResponseSize
        .labels(
          method,
          route,
          status,
          controller,
          handler,
        )
        .observe(contentLength);

      this.metrics.httpInFlight
        .labels(method, route)
        .dec();
    };

    return next.handle().pipe(
      finalize(() => {
        recordMetrics();
      }),
    );
  }
}
