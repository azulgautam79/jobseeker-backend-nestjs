import { repl } from '@nestjs/core';
import { AppModule } from './app.module';
import { TestModule } from './modules/test/test.module';

async function bootstrap() {
  await repl(TestModule);
}

bootstrap();
