import { Injectable, NestMiddleware } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { CLS_KEYS } from '../cls/cls.constants';
import { context, trace } from '@opentelemetry/api';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: any, res: any, next: () => void) {
    this.cls.set(CLS_KEYS.REQUEST_ID, req.id ?? randomUUID());

    const span = trace.getSpan(context.active());
    console.log('SPAN:', span?.spanContext());

    if (span) {
      const spanContext = span.spanContext();

      this.cls.set(CLS_KEYS.TRACE_ID, spanContext.traceId);
      this.cls.set(CLS_KEYS.SPAN_ID, spanContext.spanId);
    }

    next();
  }
}
