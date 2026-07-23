import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer;

export async function connectMongo() {
  mongod = await MongoMemoryServer.create();

  process.env.DATABASE_URL = mongod.getUri();
}

export async function disconnectMongo() {
  if (mongod) {
    await mongod.stop();
  }
}
