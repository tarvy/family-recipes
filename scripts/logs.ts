#!/usr/bin/env npx tsx
/**
 * Audit log CLI.
 *
 * Usage:
 *   npm run logs -- list
 *   npm run logs -- list --source mcp --since 24h --limit 20
 *   npm run logs -- list --operation recipe:create --format json
 *   npm run logs -- search --slug baked-ziti
 *   npm run logs -- stats
 */

import nextEnv from '@next/env';
import { disconnectDB } from '@/db/connection';
import { AuditLog } from '@/db/models/audit-log.model';
import type { AuditOperation, AuditSource, IAuditLogDocument } from '@/db/types';
import { createLogger } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

const scriptLogger = createLogger('logs-cli');

const PROJECT_DIR = process.cwd();
const ARG_START_INDEX = 2;

const COMMAND_LIST = 'list';
const COMMAND_SEARCH = 'search';
const COMMAND_STATS = 'stats';
const COMMANDS = [COMMAND_LIST, COMMAND_SEARCH, COMMAND_STATS] as const;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;
const HOURS_PER_DAY = 24;
const MS_PER_HOUR = 3600000;

type Command = (typeof COMMANDS)[number];
type OutputFormat = 'table' | 'json';

interface CliOptions {
  source?: AuditSource;
  operation?: AuditOperation;
  since?: string;
  slug?: string;
  limit?: number;
  format?: OutputFormat;
}

const VALID_OPERATIONS: AuditOperation[] = ['recipe:create', 'recipe:update', 'recipe:delete'];
const VALID_SOURCES: AuditSource[] = ['mcp', 'api', 'web', 'sync', 'cli', 'import'];
const VALID_FORMATS: OutputFormat[] = ['table', 'json'];

const { loadEnvConfig } = nextEnv;

loadEnvConfig(PROJECT_DIR);

function printUsage(): void {
  scriptLogger.info('Audit Log CLI usage:');
  scriptLogger.info(
    '  npm run logs -- list [--source mcp] [--operation recipe:create] [--since 24h] [--limit 20] [--format json]',
  );
  scriptLogger.info('  npm run logs -- search --slug <recipe-slug>');
  scriptLogger.info('  npm run logs -- stats');
}

function parseCommand(args: string[]): Command | null {
  const command = args[0];
  if (!command) {
    return null;
  }
  if (COMMANDS.includes(command as Command)) {
    return command as Command;
  }
  return null;
}

function handleHelp(): never {
  printUsage();
  process.exitCode = 0;
  throw new Error('Help requested');
}

function parseSince(value: string): Date {
  const match = /^(\d+)(h|d)$/.exec(value);
  if (!(match && match[1] && match[2])) {
    throw new Error(
      `Invalid --since format: "${value}". Use Nh (hours) or Nd (days), e.g. 24h, 7d`,
    );
  }
  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];
  const hours = unit === 'd' ? amount * HOURS_PER_DAY : amount;
  return new Date(Date.now() - hours * MS_PER_HOUR);
}

function requireValue(flag: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function validateEnum<T extends string>(flag: string, value: string, valid: readonly T[]): T {
  if (!valid.includes(value as T)) {
    throw new Error(`Invalid ${flag}. Valid: ${valid.join(', ')}`);
  }
  return value as T;
}

function parseOptions(args: string[]): CliOptions {
  const options: CliOptions = {};
  const helpFlags = new Set(['--help', '-h']);

  const handlers: Record<string, (value: string | undefined) => void> = {
    '--source': (v) => {
      options.source = validateEnum('source', requireValue('--source', v), VALID_SOURCES);
    },
    '--operation': (v) => {
      options.operation = validateEnum(
        'operation',
        requireValue('--operation', v),
        VALID_OPERATIONS,
      );
    },
    '--since': (v) => {
      options.since = requireValue('--since', v);
    },
    '--slug': (v) => {
      options.slug = requireValue('--slug', v);
    },
    '--limit': (v) => {
      options.limit = Math.min(Number.parseInt(requireValue('--limit', v), 10), MAX_LIMIT);
    },
    '--format': (v) => {
      options.format = validateEnum('format', requireValue('--format', v), VALID_FORMATS);
    },
  };

  let index = 0;
  while (index < args.length) {
    const arg = args[index];
    if (!arg) {
      index += 1;
      continue;
    }

    if (helpFlags.has(arg)) {
      handleHelp();
    }

    const handler = handlers[arg];
    if (!handler) {
      throw new Error(`Unknown argument: ${arg}`);
    }

    handler(args[index + 1]);
    index += 2;
  }

  return options;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatTimestamp(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function padEnd(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

const COL_TIMESTAMP = 19;
const COL_OPERATION = 15;
const COL_SOURCE = 6;
const COL_MESSAGE = 40;

function printTable(docs: IAuditLogDocument[]): void {
  const header = `${padEnd('TIMESTAMP', COL_TIMESTAMP)} | ${padEnd('OPERATION', COL_OPERATION)} | ${padEnd('SOURCE', COL_SOURCE)} | ${padEnd('MESSAGE', COL_MESSAGE)} | SLUG`;
  const separator = '-'.repeat(header.length);

  scriptLogger.info(separator);
  scriptLogger.info(header);
  scriptLogger.info(separator);

  for (const doc of docs) {
    const ts = formatTimestamp(doc.timestamp);
    const line = `${padEnd(ts, COL_TIMESTAMP)} | ${padEnd(doc.operation, COL_OPERATION)} | ${padEnd(doc.source, COL_SOURCE)} | ${padEnd(doc.message.slice(0, COL_MESSAGE), COL_MESSAGE)} | ${doc.resource.slug}`;
    scriptLogger.info(line);
  }

  scriptLogger.info(separator);
  scriptLogger.info(`${docs.length} event(s)`);
}

function printJson(docs: IAuditLogDocument[]): void {
  const plain = docs.map((d) => ({
    operation: d.operation,
    source: d.source,
    level: d.level,
    message: d.message,
    resource: d.resource,
    actor: d.actor,
    metadata: d.metadata,
    timestamp: d.timestamp,
  }));
  // Use logger to output JSON — no console.log
  scriptLogger.info(JSON.stringify(plain, null, 2));
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

type FilterQuery = Record<string, unknown>;

async function handleList(options: CliOptions): Promise<void> {
  const filter: FilterQuery = {};

  if (options.source) {
    filter.source = options.source;
  }
  if (options.operation) {
    filter.operation = options.operation;
  }
  if (options.since) {
    filter.timestamp = { $gte: parseSince(options.since) };
  }

  const limit = options.limit ?? DEFAULT_LIMIT;
  const docs = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(limit).exec();

  if (options.format === 'json') {
    printJson(docs);
  } else {
    printTable(docs);
  }
}

async function handleSearch(options: CliOptions): Promise<void> {
  if (!options.slug) {
    throw new Error('--slug is required for search command');
  }

  const docs = await AuditLog.find({ 'resource.slug': options.slug })
    .sort({ timestamp: -1 })
    .limit(options.limit ?? DEFAULT_LIMIT)
    .exec();

  if (options.format === 'json') {
    printJson(docs);
  } else {
    printTable(docs);
  }
}

interface FacetResult {
  byOperation: Array<{ _id: string; count: number }>;
  bySource: Array<{ _id: string; count: number }>;
  total: Array<{ count: number }>;
}

async function handleStats(): Promise<void> {
  const results = await AuditLog.aggregate<FacetResult>([
    {
      $facet: {
        byOperation: [{ $group: { _id: '$operation', count: { $sum: 1 } } }],
        bySource: [{ $group: { _id: '$source', count: { $sum: 1 } } }],
        total: [{ $group: { _id: null, count: { $sum: 1 } } }],
      },
    },
  ]).exec();

  const facets = results[0];
  if (!facets) {
    scriptLogger.info('No audit data');
    return;
  }

  const totalCount = facets.total[0]?.count ?? 0;
  scriptLogger.info(`Total audit events: ${totalCount}`);

  scriptLogger.info('');
  scriptLogger.info('By operation:');
  for (const item of facets.byOperation) {
    scriptLogger.info(`  ${item._id}: ${item.count}`);
  }

  scriptLogger.info('');
  scriptLogger.info('By source:');
  for (const item of facets.bySource) {
    scriptLogger.info(`  ${item._id}: ${item.count}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(ARG_START_INDEX);
  const command = parseCommand(args);

  if (!command) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const options = parseOptions(args.slice(1));

  await withTrace('scripts.logs', async (span) => {
    span.setAttribute('command', command);

    switch (command) {
      case COMMAND_LIST:
        await handleList(options);
        break;
      case COMMAND_SEARCH:
        await handleSearch(options);
        break;
      case COMMAND_STATS:
        await handleStats();
        break;
      default:
        throw new Error(`Unsupported command: ${command}`);
    }
  });
}

async function run(): Promise<void> {
  try {
    await main();
  } finally {
    await disconnectDB();
  }
}

run().catch((error) => {
  if (error instanceof Error && error.message === 'Help requested') {
    return;
  }
  scriptLogger.error('Logs CLI failed', error instanceof Error ? error : undefined);
  process.exitCode = 1;
});
