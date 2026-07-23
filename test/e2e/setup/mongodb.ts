import { Connection } from 'mongoose';

export async function clearDatabase(connection: Connection) {
  const collections = connection.collections;

  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}
