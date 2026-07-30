import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ClsService } from 'nestjs-cls';
import { TraceService } from '../telemetry/tracing/trace.service';
import { CLS_KEYS } from '../cls/cls.constants';

@Injectable()
export class LoggerService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly cls: ClsService,
    private readonly traceService: TraceService,
  ) { }


  private buildContext(
    context?: string,
  ) {
    const traceContext = this.traceService.getTraceContext();

    return {
      context,
      requestId: this.cls.get(CLS_KEYS.REQUEST_ID),
      userId: this.cls.get(CLS_KEYS.USER_ID),
      role: this.cls.get(CLS_KEYS.ROLE),

      ...traceContext,
    };
  }

  //! Normal Operational Events (App started, user logged in, background jobs)
  // this.loggerService.info('User successfully logged in', { userId });
  info(context: string, message: string, data?: Record<string, any>) {
    this.logger.info(
      {
        ...this.buildContext(context),
        ...data,
      },
      message,
    );
  }

  //! Detailed troubleshooting data (Cache hit/miss, webhook or req, intermediate calculation results)
  // this.loggerService.debug('Parsed incoming webhook payload', { payload });
  debug(context: string, message: string, data?: Record<string, any>) {
    this.logger.debug(
      {
        ...this.buildContext(context),
        ...data,
      },
      message,
    );
  }

  //! Warnings & Potential Issues (deprecated api, slow database query, invalid input)
  // this.loggerService.warn('API rate limit approaching 80% capacity', { currentUsage: 800 });
  warn(context: string, message: string, data?: Record<string, any>) {
    this.logger.warn(
      {
        ...this.buildContext(context),
        ...data,
      },
      message,
    );
  }

  //! For Recoverable Errors (external api failed, unexpected exception, database query threw an error)
  // this.loggerService.error('Failed to process payment with Stripe', error, { orderId });
  error(context: string, message: string, error?: unknown, data?: Record<string, any>) {
    this.logger.error(
      {
        err: error instanceof Error ? error : undefined,
        ...this.buildContext(context),
        ...data,
      },
      message,
    );
  }

  //! For Crashes & Catastropic Failures (Uncaught exception, db conn failure, missing critical env variable)
  // this.loggerService.fatal('Database connection failed, shutting down application', error);
  fatal(context: string, message: string, error?: unknown, data?: Record<string, any>) {
    this.logger.fatal(
      {
        err: error instanceof Error ? error : undefined,
        ...this.buildContext(context),
        ...data,
      },
      message,
    );
  }
}
