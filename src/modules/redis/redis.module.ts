import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { TraceModule } from '../../common/telemetry/tracing/trace.module';
import { AppLoggerModule } from '../../common/logger/logger.module';

@Global()
@Module({
  imports:[
    TraceModule,
    AppLoggerModule
  ],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
