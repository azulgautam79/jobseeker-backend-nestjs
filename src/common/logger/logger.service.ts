import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class LoggerService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly cls: ClsService,
  ) {}

  setContext(context: string) {
    this.logger.setContext(context);
  }

  private context() {
    return {
      requestId: this.cls.get('requestId'),
      userId: this.cls.get('userId'),
      role: this.cls.get('role'),
      trace_id: this.cls.get('traceId'),
      span_id: this.cls.get('spanId'),
    };
  }

  info(message: string, data?: Record<string, any>) {
    this.logger.info(
      {
        ...this.context(),
        ...data,
      },
      message,
    );
  }

  warn(message: string, data?: Record<string, any>) {
    this.logger.warn(
      {
        ...this.context(),
        ...data,
      },
      message,
    );
  }

  error(message: string, error?: unknown, data?: Record<string, any>) {
    this.logger.error(
      {
        err: error,
        ...this.context(),
        ...data,
      },
      message,
    );
  }

  debug(message: string, data?: Record<string, any>) {
    this.logger.debug(
      {
        ...this.context(),
        ...data,
      },
      message,
    );
  }
}
