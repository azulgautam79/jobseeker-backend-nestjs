import { Injectable } from '@nestjs/common';
import { HealthCheckService } from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import {
    MongooseHealthIndicator,
    MemoryHealthIndicator,
    DiskHealthIndicator,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './RedisHealthIndicator';
import { TraceService } from '../telemetry/tracing/trace.service';
import { Trace } from '../telemetry/tracing/trace.decorator';
import { LoggerFactory } from '../logger/logger.factory';
import { ContextLogger } from '../logger/context-logger';

@Injectable()
export class HealthService {
    private readonly logger: ContextLogger;

    constructor(
        private readonly health: HealthCheckService,
        private readonly mongoose: MongooseHealthIndicator,
        private readonly memory: MemoryHealthIndicator,
        private readonly disk: DiskHealthIndicator,
        private readonly redis: RedisHealthIndicator,
        private readonly traceService: TraceService,
        loggerFactory: LoggerFactory,

        @InjectConnection()
        private readonly connection: Connection,
    ) {
        this.logger =
            loggerFactory.create(
                HealthService.name,
            );
    }

    @Trace('health.check', {
        'health.endpoint': '/health',
        'health.type': 'readiness',
    })
    async check() {
        this.logger.info('Health check started');

        const result = await this.health.check([
            () =>
                this.mongoose.pingCheck('mongodb', {
                    connection: this.connection,
                }),

            () => this.redis.isHealthy('redis'),

            () => this.memory.checkHeap(
                'memory_heap',
                500 * 1024 * 1024,
            ),

            () => this.memory.checkRSS(
                'memory_rss',
                1024 * 1024 * 1024,
            ),

            () =>
                this.disk.checkStorage('disk', {
                    path: process.cwd().slice(0, 3),
                    thresholdPercent: 0.9,
                }),
        ]);

        this.logger.info(
            'Health check completed successfully',
            {
                status: result.status,
                details: result.details,
            },
        );

        this.traceService.setCurrentAttribute(
            'health.status',
            result.status,
        );

        this.traceService.setCurrentAttributes({
            'health.mongodb': result.details.mongodb.status,
            'health.redis': result.details.redis.status,
        });

        this.traceService.addCurrentEvent(
            'Health check completed',
            {
                status: result.status,
            },
        );

        return result;
    }
}