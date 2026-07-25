import { Injectable } from '@nestjs/common';
import { Span, SpanStatusCode, trace } from '@opentelemetry/api';

@Injectable()
export class TraceService {
  private readonly tracer = trace.getTracer('jobseeker-backend');

  async withSpan<T>(
    name: string,
    callback: (span: Span) => Promise<T>,
  ): Promise<T> {
    return this.tracer.startActiveSpan(name, async (span) => {
      try {
        const result = await callback(span);

        span.setStatus({
          code: SpanStatusCode.OK,
        });

        return result;
      } catch (error) {
        span.recordException(error as Error);

        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown Error',
        });

        throw error;
      } finally {
        span.end();
      }
    });
  }
}
