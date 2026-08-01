import { Module } from '@nestjs/common';
import { TestService } from './test.service';
import { TestController } from './test.controller';
import { AppLoggerModule } from '../../common/logger/logger.module';
import { TraceModule } from '../../common/telemetry/tracing/trace.module';

@Module({
  imports: [
    AppLoggerModule,
    TraceModule
  ],
  controllers: [TestController],
  providers: [TestService],
})
export class TestModule { }
