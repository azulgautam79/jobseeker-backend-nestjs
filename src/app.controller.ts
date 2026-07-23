import { Controller, Get, Header } from '@nestjs/common';
import { AppService } from './app.service';

/**
 *! App API controller
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   *! Get Hello
   */
  @Get()
  @Header('Content-Type', 'text/html')
  getHello(): string {
    return this.appService.getHello();
  }
}
