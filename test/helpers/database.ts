import { Connection } from 'mongoose';

export async function clearDatabase(connection: Connection) {
  const collections = connection.collections;

  for (const collection of Object.values(collections)) {
    await collection.deleteMany({});
  }
}

export async function closeDatabase(connection: Connection) {
  await connection.close();
}
