import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PinoLogger } from 'nestjs-pino';

import { TraceService } from '../telemetry/tracing/trace.service';

import { ContextLogger } from './context-logger';

@Injectable()
export class LoggerFactory {
    constructor(
        private readonly logger: PinoLogger,
        private readonly cls: ClsService,
        private readonly traceService: TraceService,
    ) { }

    create(
        context: string,
    ): ContextLogger {
        return new ContextLogger(
            context,
            this.logger,
            this.cls,
            this.traceService,
        );
    }
}