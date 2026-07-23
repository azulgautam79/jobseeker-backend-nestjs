// test/setup/app.e2e-setup.ts

import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export async function createTestingApp() {
  const mongo = await MongoMemoryServer.create();

  process.env.DATABASE_URL = mongo.getUri();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.init();

  const connection = app.get<Connection>(getConnectionToken());

  return {
    app,
    mongo,
    connection,
  };
}
