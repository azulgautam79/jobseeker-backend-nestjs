import { PinoLogger } from 'nestjs-pino';
import { ClsService } from 'nestjs-cls';

import { TraceService } from '../telemetry/tracing/trace.service';
import { CLS_KEYS } from '../cls/cls.constants';

export class ContextLogger {
    constructor(
        private readonly context: string,
        private readonly logger: PinoLogger,
        private readonly cls: ClsService,
        private readonly traceService: TraceService,
    ) { }

    private buildContext() {
        return {
            context: this.context,
            requestId: this.cls.get(CLS_KEYS.REQUEST_ID),
            userId: this.cls.get(CLS_KEYS.USER_ID),
            role: this.cls.get(CLS_KEYS.ROLE),

            // ...this.traceService.getTraceContext(),
        };
    }

    //! Normal Operational Events (App started, user logged in, background jobs)
    // this.loggerService.info('User successfully logged in', { userId });
    info(
        message: string,
        data?: Record<string, any>,
    ) {
        this.logger.info(
            {
                ...this.buildContext(),
                ...data,
            },
            message,
        );
    }

    //! Detailed troubleshooting data (Cache hit/miss, webhook or req, intermediate calculation results)
    // this.loggerService.debug('Parsed incoming webhook payload', { payload });
    debug(
        message: string,
        data?: Record<string, any>,
    ) {
        this.logger.debug(
            {
                ...this.buildContext(),
                ...data,
            },
            message,
        );
    }

    //! Warnings & Potential Issues (deprecated api, slow database query, invalid input)
    // this.loggerService.warn('API rate limit approaching 80% capacity', { currentUsage: 800 });
    warn(
        message: string,
        data?: Record<string, any>,
    ) {
        this.logger.warn(
            {
                ...this.buildContext(),
                ...data,
            },
            message,
        );
    }

    //! For Recoverable Errors (external api failed, unexpected exception, database query threw an error)
    // this.loggerService.error('Failed to process payment with Stripe', error, { orderId });
    error(
        message: string,
        error?: unknown,
        data?: Record<string, any>,
    ) {
        this.logger.error(
            {
                err: error instanceof Error ? error : undefined,

                ...this.buildContext(),
                ...data,
            },
            message,
        );
    }

    //! For Crashes & Catastropic Failures (Uncaught exception, db conn failure, missing critical env variable)
    // this.loggerService.fatal('Database connection failed, shutting down application', error);
    fatal(
        message: string,
        error?: unknown,
        data?: Record<string, any>,
    ) {
        this.logger.fatal(
            {
                err: error instanceof Error ? error : undefined,

                ...this.buildContext(),
                ...data,
            },
            message,
        );
    }
}