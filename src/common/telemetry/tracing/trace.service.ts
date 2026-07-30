import { Injectable } from '@nestjs/common';
import {
  context,
  Span,
  SpanStatusCode,
  Attributes,
  AttributeValue,
  trace,
} from '@opentelemetry/api';
import { TRACE_EVENTS } from './trace.constants';

@Injectable()
export class TraceService {
  private readonly tracer = trace.getTracer('jobseeker-backend');

  async withSpan<T>(
    name: string,
    attributes: Attributes = {},
    callback: (span: Span) => T | Promise<T>
  ): Promise<T> {
    return this.tracer.startActiveSpan(name, async (span) => {
      this.addAttributes(span, attributes);
      this.addEvent(span, TRACE_EVENTS.STARTED);

      return this.executeInSpan(span, callback);
    });
  }

  private async executeInSpan<T>(
    span: Span,
    callback: (span: Span) => T | Promise<T>
  ): Promise<T> {
    try {
      const result = await callback(span);

      this.setSuccess(span);
      this.addEvent(span, TRACE_EVENTS.COMPLETED);

      return result;
    } catch (error) {
      this.setError(span, error);
      this.addEvent(span, TRACE_EVENTS.FAILED);

      throw error;
    } finally {
      span.end();
    }
  }

  getActiveSpan(): Span | undefined {
    return trace.getActiveSpan();
  }

  getTraceContext(): {
    traceId?: string;
    spanId?: string;
  } {
    const span = trace.getSpan(context.active());

    if (!span) {
      return {
        traceId: undefined,
        spanId: undefined,
      };
    }

    const spanContext = span.spanContext();

    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    };
  }

  private setAttribute(
    span: Span,
    key: string,
    value: AttributeValue
  ): void {
    span.setAttribute(key, value);
  }

  setCurrentAttribute(
    key: string,
    value: AttributeValue,
  ): void {
    const span = this.getActiveSpan();

    if (!span) {
      return;
    }

    this.setAttribute(span, key, value);
  }

  private addAttributes(
    span: Span,
    attributes: Attributes,
  ): void {
    span.setAttributes(attributes);
  }

  setCurrentAttributes(
    attributes: Attributes,
  ): void {
    const span = this.getActiveSpan();

    if (!span) {
      return;
    }

    this.addAttributes(span, attributes);
  }

  private addEvent(
    span: Span,
    name: string,
    attributes?: Attributes,
  ): void {
    span.addEvent(name, attributes);
  }

  addCurrentEvent(
    name: string,
    attributes?: Attributes,
  ): void {
    const span = this.getActiveSpan();

    if (!span) {
      return;
    }

    this.addEvent(span, name, attributes);
  }

  private recordException(
    span: Span,
    error: unknown,
  ): void {
    if (error instanceof Error) {
      span.recordException(error);
    }
  }

  recordCurrentException(
    error: unknown,
  ): void {
    const span = this.getActiveSpan();

    if (!span) {
      return;
    }

    this.recordException(span, error);
  }

  private setSuccess(span: Span): void {
    span.setStatus({
      code: SpanStatusCode.OK,
    });
  }

  private setError(span: Span, error: unknown): void {
    this.recordException(span, error);

    span.setStatus({
      code: SpanStatusCode.ERROR,
      message:
        error instanceof Error
          ? error.message
          : 'Unknown Error',
    });
  }

  getCurrentSpanOrThrow(): Span {
    const span = this.getActiveSpan();

    if (!span) {
      throw new Error(
        "No active span available."
      );
    }

    return span;
  }

  setCurrentError(
    error: unknown,
  ): void {
    const span = this.getActiveSpan();

    if (!span) {
      return;
    }

    this.setError(span, error);
  }

  // startSpan(
  //   name: string,
  //   attributes: Attributes = {},
  // ): Span {
  //   const span = this.tracer.startSpan(name);

  //   span.setAttributes(attributes);

  //   return span;
  // }

  // endSpan(span: Span): void {
  //   span.end();
  // }
}
