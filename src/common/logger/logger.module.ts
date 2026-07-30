import { Module } from '@nestjs/common';
import { LoggerFactory } from './logger.factory';
import { TraceModule } from '../telemetry/tracing/trace.module';

@Module({
  imports: [TraceModule],
  providers: [LoggerFactory],
  exports: [LoggerFactory],
})
export class AppLoggerModule {}
