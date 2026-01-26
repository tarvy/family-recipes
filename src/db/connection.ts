/**
 * MongoDB connection for serverless environments.
 *
 * This module implements a connection caching pattern optimized for
 * Vercel serverless functions:
 *
 * - Caches the connection promise in the global object to survive
 *   across warm function invocations
 * - Limits the connection pool size to prevent exhausting MongoDB's
 *   connection limit under concurrent serverless invocations
 * - Uses reasonable timeouts for serverless cold starts
 *
 * Usage:
 *   import { connectDB } from '@/db/connection';
 *
 *   export async function GET() {
 *     await connectDB();
 *     const recipes = await Recipe.find();
 *     return Response.json(recipes);
 *   }
 */

import mongoose from 'mongoose';
import { logger } from '@/lib/logger';

const MONGODB_URI_RAW = process.env['MONGODB_URI'];
const MONGODB_DB_NAME = process.env['MONGODB_DB_NAME'] || 'family_recipes';

if (!MONGODB_URI_RAW) {
  throw new Error('MONGODB_URI environment variable is not set');
}

const MONGODB_URI: string = MONGODB_URI_RAW;

/**
 * Global cache for the MongoDB connection.
 * This survives across serverless function invocations on the same instance.
 */
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

// Initialize the cache if it doesn't exist
global.mongooseCache = global.mongooseCache || { conn: null, promise: null };

const cached = global.mongooseCache;

/**
 * Connection options optimized for serverless environments.
 *
 * - maxPoolSize: Limits connections per function instance to prevent
 *   connection storms when many instances scale up simultaneously
 * - serverSelectionTimeoutMS: Fail fast on cold starts if DB is unreachable
 * - socketTimeoutMS: Standard timeout for operations
 */
const connectionOptions: mongoose.ConnectOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  dbName: MONGODB_DB_NAME,
};

/**
 * Connect to MongoDB Atlas.
 *
 * Returns cached connection if available, otherwise creates a new one.
 * Safe to call multiple times - will not create duplicate connections.
 */
export async function connectDB(): Promise<typeof mongoose> {
  // Return cached connection if available
  if (cached.conn) {
    return cached.conn;
  }

  // Return pending connection promise if one is in progress
  if (cached.promise) {
    cached.conn = await cached.promise;
    return cached.conn;
  }

  // Create new connection
  logger.db.info('Connecting to MongoDB Atlas...');

  cached.promise = mongoose.connect(MONGODB_URI, connectionOptions).then((mongooseInstance) => {
    logger.db.info('MongoDB connection established');
    return mongooseInstance;
  });

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Reset the promise on failure so next call retries
    cached.promise = null;
    logger.db.error('Failed to connect to MongoDB');
    throw error;
  }

  return cached.conn;
}

/**
 * Disconnect from MongoDB.
 * Useful for graceful shutdown in non-serverless contexts.
 */
export async function disconnectDB(): Promise<void> {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
    logger.db.info('MongoDB connection closed');
  }
}

/**
 * Get the current connection state.
 */
export function getConnectionState(): string {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'unknown';
}
