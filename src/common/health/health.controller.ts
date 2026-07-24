import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import {
  MongooseHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { RedisService } from '../../modules/redis/redis.service';
import { RedisHealthIndicator } from './RedisHealthIndicator';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { LoggerService } from '../logger/logger.service';
import { TraceService } from '../telemetry/tracing/trace.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly logger: LoggerService,
    private readonly traceService: TraceService,

    @InjectConnection()
    private readonly connection: Connection,
  ) {
    this.logger.setContext('HealthCheck');
  }

  @Get()
  @HealthCheck()
  async check() {
    return this.traceService.withSpan('health.check', async (span) => {
      this.logger.info('Health check started');

      span.setAttribute('health.endpoint', '/health');
      span.setAttribute('health.type', 'readiness');

      const result = await this.health.check([
        () =>
          this.mongoose.pingCheck('mongodb', {
            connection: this.connection,
          }),

        () => this.redis.isHealthy('redis'),

        () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024),

        () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),

        () =>
          this.disk.checkStorage('disk', {
            path: process.cwd().slice(0, 3),
            thresholdPercent: 0.9,
          }),
      ]);

      this.logger.info('Health check completed successfully', {
        status: result.status,
        details: result.details,
      });

      span.setAttribute('health.status', result.status);

      return result;
    });
  }
}
