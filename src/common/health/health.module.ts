import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';
import { RedisModule } from '../../modules/redis/redis.module';
import { RedisHealthIndicator } from './RedisHealthIndicator';
import { AppLoggerModule } from '../logger/logger.module';
import { HealthService } from './health.service';
import { TraceModule } from '../telemetry/tracing/trace.module';

@Module({
  imports: [TerminusModule, RedisModule, AppLoggerModule, TraceModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator, HealthService],
})
export class HealthModule { }
