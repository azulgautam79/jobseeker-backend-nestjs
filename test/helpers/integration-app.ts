import {
  DynamicModule,
  INestApplication,
  ModuleMetadata,
  Type,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { MailService } from '../../src/modules/mail/mail.service';
import { connectMongo } from './mongodb-memory';

type ModuleImport = Type<any> | DynamicModule;

export async function createIntegrationApp(imports: ModuleImport[]): Promise<{
  app: INestApplication;
  module: TestingModule;
}> {
  await connectMongo();

  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [
          () => ({
            DATABASE_URL: process.env.DATABASE_URL,

            JWT_SECRET: 'test-secret',

            JWT_EXPIRES_IN: 3600,

            ACCESS_TOKEN_TIME: '1h',

            REFRESH_TOKEN_TIME: '7d',

            OTP_EXPIRY_TIME: 10,

            SMTP_HOST: 'localhost',
            SMTP_PORT: 587,
            SMTP_USER: 'test',
            SMTP_PASS: 'test',
          }),
        ],
      }),

      MongooseModule.forRoot(process.env.DATABASE_URL!),

      ...imports,
    ],
  })
    .overrideProvider(MailService)
    .useValue({
      sendMail: jest.fn(),
    })
    .compile();

  const app = module.createNestApplication();

  await app.init();

  return {
    app,
    module,
  };
}
