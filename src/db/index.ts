/**
 * Database client setup using Drizzle ORM and postgres-js.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { logger } from '@/lib/logger';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  logger.db.error('DATABASE_URL is not set');
  throw new Error('DATABASE_URL is not set');
}

const client = postgres(databaseUrl, { max: 1 });

export const db = drizzle(client, { schema });
export { schema };

logger.db.info('Database client initialized');
