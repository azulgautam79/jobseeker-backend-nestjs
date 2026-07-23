import { Test } from '@nestjs/testing';
import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import cookieParser from 'cookie-parser';

import { AppModule } from '../../../src/app.module';
import { MailService } from '../../../src/modules/mail/mail.service';
import { FakeMailService } from './fake-mail.service';
import { E2ETestContext } from './e2e-context';

export async function createTestingApp(): Promise<E2ETestContext> {
  const mongoServer = await MongoMemoryServer.create();

  process.env.ENV_FILE = '.env.test';
  process.env.DATABASE_URL = mongoServer.getUri();

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(MailService)
    .useClass(FakeMailService)
    .compile();

  const app = moduleFixture.createNestApplication();

  app.use(cookieParser());

  app.setGlobalPrefix('api', {
    exclude: [{ path: '', method: RequestMethod.GET }],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.init();

  const connection = app.get<Connection>(getConnectionToken());

  return {
    app,
    connection,
    mongoServer,
  };
}

export async function closeTestingApp(ctx: E2ETestContext) {
  await ctx.connection.close();
  await ctx.mongoServer.stop();
  await ctx.app.close();
}
