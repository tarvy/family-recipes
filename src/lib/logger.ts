/**
 * Structured logging with Pino
 *
 * Features:
 * - JSON output in production, pretty output in development
 * - Automatic trace correlation (traceId, spanId)
 * - Typed context loggers
 *
 * Usage:
 *   import { logger, createLogger } from '@/lib/logger';
 *
 *   // Use pre-configured loggers
 *   logger.api.info('Request received', { path: '/api/recipes' });
 *   logger.db.error('Query failed', queryError, { table: 'recipes' });
 *
 *   // Create custom logger
 *   const log = createLogger('my-module');
 *   log.debug('Processing', { itemId: 123 });
 */

import pino from 'pino';
import { getTraceContext } from './telemetry';

const isDev = process.env.NODE_ENV === 'development';

const baseLogger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
});

type LogData = Record<string, unknown>;

interface Logger {
  debug: (msg: string, data?: LogData) => void;
  info: (msg: string, data?: LogData) => void;
  warn: (msg: string, data?: LogData) => void;
  error: (msg: string, error?: Error, data?: LogData) => void;
}

/**
 * Create a logger with a specific context
 */
export function createLogger(context: string): Logger {
  return {
    debug: (msg: string, data?: LogData) => log('debug', context, msg, data),
    info: (msg: string, data?: LogData) => log('info', context, msg, data),
    warn: (msg: string, data?: LogData) => log('warn', context, msg, data),
    error: (msg: string, error?: Error, data?: LogData) => logError(context, msg, error, data),
  };
}

function log(level: 'debug' | 'info' | 'warn', context: string, msg: string, data?: LogData) {
  const traceContext = getTraceContext();
  baseLogger[level](
    {
      context,
      ...traceContext,
      ...data,
    },
    msg,
  );
}

function logError(context: string, msg: string, error?: Error, data?: LogData) {
  const traceContext = getTraceContext();
  baseLogger.error(
    {
      context,
      ...traceContext,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
      ...data,
    },
    msg,
  );
}

/**
 * Pre-configured loggers for common contexts
 */
export const logger = {
  api: createLogger('api'),
  db: createLogger('db'),
  auth: createLogger('auth'),
  recipes: createLogger('recipes'),
  shopping: createLogger('shopping'),
  mcp: createLogger('mcp'),
};
