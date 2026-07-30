import { Module } from '@nestjs/common';
import { TestService } from './test.service';
import { TestController } from './test.controller';
import { AppLoggerModule } from '../../common/logger/logger.module';

@Module({
  imports:[AppLoggerModule],
  controllers: [TestController],
  providers: [TestService],
})
export class TestModule {}
