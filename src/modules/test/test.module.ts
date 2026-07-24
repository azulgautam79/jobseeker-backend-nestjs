import { Module } from '@nestjs/common';
import { TestService } from './test.service';
import { TestController } from './test.controller';
import { LoggerService } from '../../common/logger/logger.service';

@Module({
  controllers: [TestController],
  providers: [TestService, LoggerService],
})
export class TestModule {}
