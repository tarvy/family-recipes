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

const MONGODB_DB_NAME = process.env['MONGODB_DB_NAME'] || 'family_recipes';

/**
 * Get MongoDB URI, throwing if not configured.
 * Lazy evaluation allows builds to succeed without env vars.
 */
function getMongoUri(): string {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  return uri;
}

/** Connection pool size per serverless instance */
const MAX_POOL_SIZE = 10;
/** Timeout for selecting a server on cold start (ms) */
const SERVER_SELECTION_TIMEOUT_MS = 5000;
/** Timeout for socket operations (ms) */
const SOCKET_TIMEOUT_MS = 45000;

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
  maxPoolSize: MAX_POOL_SIZE,
  serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
  socketTimeoutMS: SOCKET_TIMEOUT_MS,
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

  cached.promise = mongoose.connect(getMongoUri(), connectionOptions).then((mongooseInstance) => {
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

/** Mongoose connection state codes (from mongoose.connection.readyState) */
const MONGOOSE_STATE_DISCONNECTED = 0;
const MONGOOSE_STATE_CONNECTED = 1;
const MONGOOSE_STATE_CONNECTING = 2;
const MONGOOSE_STATE_DISCONNECTING = 3;

/**
 * Get the current connection state.
 */
export function getConnectionState(): string {
  const states: Record<number, string> = {
    [MONGOOSE_STATE_DISCONNECTED]: 'disconnected',
    [MONGOOSE_STATE_CONNECTED]: 'connected',
    [MONGOOSE_STATE_CONNECTING]: 'connecting',
    [MONGOOSE_STATE_DISCONNECTING]: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'unknown';
}
