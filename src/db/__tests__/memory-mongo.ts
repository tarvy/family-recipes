/**
 * In-memory MongoDB for tests that depend on real indexes and update semantics.
 *
 * Starts one mongod per test file, builds every registered model's indexes,
 * and empties all collections between tests.
 *
 * Usage:
 *   import { setupMemoryMongo } from '@/db/__tests__/memory-mongo';
 *
 *   setupMemoryMongo();
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { connectDB, disconnectDB } from '@/db/connection';

const MONGODB_URI_ENV = 'MONGODB_URI';

export function setupMemoryMongo(): void {
  let server: MongoMemoryServer | null = null;
  const originalUri = process.env[MONGODB_URI_ENV];

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    process.env[MONGODB_URI_ENV] = server.getUri();
    await connectDB();
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  });

  afterEach(async () => {
    const collections = Object.values(mongoose.connection.collections);
    await Promise.all(collections.map((collection) => collection.deleteMany({})));
  });

  afterAll(async () => {
    await disconnectDB();
    await server?.stop();
    if (originalUri === undefined) {
      Reflect.deleteProperty(process.env, MONGODB_URI_ENV);
    } else {
      process.env[MONGODB_URI_ENV] = originalUri;
    }
  });
}
