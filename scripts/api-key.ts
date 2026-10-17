#!/usr/bin/env npx tsx
/**
 * Device API key CLI. One key per phone or script.
 *
 * Usage:
 *   npm run api-key -- create --email sam@family.example --label "Sam's iPhone"
 *   npm run api-key -- list
 *   npm run api-key -- revoke --key-id <keyId>
 */

import { loadEnvConfig } from '@next/env';
import { disconnectDB } from '@/db/connection';
import { listApiKeys, mintApiKey, revokeApiKey } from '@/lib/auth/api-key';
import { createLogger } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

const scriptLogger = createLogger('api-key-cli');

const ARG_START_INDEX = 2;
const COMMANDS = ['create', 'list', 'revoke'] as const;
const FLAGS = ['--email', '--label', '--key-id'] as const;

type Command = (typeof COMMANDS)[number];
type Flag = (typeof FLAGS)[number];
type CliOptions = Partial<Record<Flag, string>>;

loadEnvConfig(process.cwd());

function printUsage(): void {
  scriptLogger.info('API key CLI usage:');
  scriptLogger.info(
    '  npm run api-key -- create --email sam@family.example --label "Sam\'s iPhone"',
  );
  scriptLogger.info('  npm run api-key -- list');
  scriptLogger.info('  npm run api-key -- revoke --key-id <keyId>');
}

function isCommand(value: string | undefined): value is Command {
  return COMMANDS.some((command) => command === value);
}

function isFlag(value: string): value is Flag {
  return FLAGS.some((flag) => flag === value);
}

function parseOptions(args: readonly string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index] ?? '';
    if (!isFlag(flag)) {
      throw new Error(`Unknown argument: ${flag}`);
    }
    options[flag] = args[index + 1];
  }
  return options;
}

function required(options: CliOptions, flag: Flag): string {
  const value = options[flag]?.trim();
  if (!value) {
    throw new Error(`${flag} is required`);
  }
  return value;
}

async function handleCreate(options: CliOptions): Promise<void> {
  const minted = await mintApiKey({
    email: required(options, '--email'),
    label: required(options, '--label'),
    scopes: ['captures:write'],
  });
  scriptLogger.info('API key created. Copy the token now; it is not stored.', {
    keyId: minted.keyId,
    label: minted.label,
    token: minted.token,
  });
}

async function handleList(): Promise<void> {
  const keys = await listApiKeys();
  if (keys.length === 0) {
    scriptLogger.info('No API keys found');
    return;
  }
  for (const key of keys) {
    scriptLogger.info(`- ${key.keyId} ${key.label}`, {
      email: key.email,
      role: key.role,
      scopes: key.scopes,
      lastUsedAt: key.lastUsedAt,
      revokedAt: key.revokedAt,
    });
  }
}

async function handleRevoke(options: CliOptions): Promise<void> {
  const keyId = required(options, '--key-id');
  if (!(await revokeApiKey(keyId))) {
    scriptLogger.warn('API key not found', { keyId });
    process.exitCode = 1;
    return;
  }
  scriptLogger.info('API key revoked', { keyId });
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(ARG_START_INDEX);
  if (!isCommand(command)) {
    printUsage();
    process.exitCode = 1;
    return;
  }
  const options = parseOptions(rest);

  await withTrace('scripts.apiKey', async (span) => {
    span.setAttribute('command', command);
    switch (command) {
      case 'create':
        return handleCreate(options);
      case 'list':
        return handleList();
      case 'revoke':
        return handleRevoke(options);
      default: {
        const unhandled: never = command;
        throw new Error(`Unsupported command: ${String(unhandled)}`);
      }
    }
  });
}

main()
  .catch((error: unknown) => {
    scriptLogger.error('API key CLI failed', error instanceof Error ? error : undefined);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
