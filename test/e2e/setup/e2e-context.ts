import { INestApplication } from '@nestjs/common';
import { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export interface E2ETestContext {
  app: INestApplication;
  connection: Connection;
  mongoServer: MongoMemoryServer;
}
