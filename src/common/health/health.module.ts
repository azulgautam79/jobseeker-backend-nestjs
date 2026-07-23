import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';
import { RedisModule } from '../../modules/redis/redis.module';
import { RedisHealthIndicator } from './RedisHealthIndicator';
import { AppLoggerModule } from '../logger/logger.module';

@Module({
  imports: [TerminusModule, RedisModule, AppLoggerModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator],
})
export class HealthModule {}
