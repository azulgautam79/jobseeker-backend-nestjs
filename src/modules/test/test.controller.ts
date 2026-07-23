import { Controller, Get } from '@nestjs/common';
import { TestService } from './test.service';

@Controller('test')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Get('slow')
  slow() {
    return this.testService.slow();
  }

  @Get('fast')
  fast() {
    return this.testService.fast();
  }
}
