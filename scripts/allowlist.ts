#!/usr/bin/env npx tsx
/**
 * Allowlist management CLI.
 *
 * Usage:
 *   npm run allowlist -- list
 *   npm run allowlist -- add --email person@example.com --role family
 *   npm run allowlist -- remove --email person@example.com
 */

import nextEnv from '@next/env';
import { disconnectDB } from '@/db/connection';
import type { AllowedEmailRole } from '@/db/models';
import {
  addAllowedEmail,
  isValidEmail,
  listAllowedEmails,
  normalizeEmail,
  removeAllowedEmail,
} from '@/lib/auth/allowlist';
import { createLogger } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

const scriptLogger = createLogger('allowlist-cli');

const PROJECT_DIR = process.cwd();
const ARG_START_INDEX = 2;
const COMMAND_LIST = 'list';
const COMMAND_ADD = 'add';
const COMMAND_REMOVE = 'remove';
const COMMANDS = [COMMAND_LIST, COMMAND_ADD, COMMAND_REMOVE] as const;
const ROLE_VALUES: AllowedEmailRole[] = ['owner', 'family', 'friend'];

const { loadEnvConfig } = nextEnv;

loadEnvConfig(PROJECT_DIR);

type Command = (typeof COMMANDS)[number];

type CliOptions = {
  email?: string;
  role?: AllowedEmailRole;
};

function printUsage(): void {
  scriptLogger.info('Allowlist CLI usage:');
  scriptLogger.info('  npm run allowlist -- list');
  scriptLogger.info('  npm run allowlist -- add --email person@example.com --role family');
  scriptLogger.info('  npm run allowlist -- remove --email person@example.com');
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

function parseRole(value?: string): AllowedEmailRole | undefined {
  if (!value) {
    return undefined;
  }
  if (ROLE_VALUES.includes(value as AllowedEmailRole)) {
    return value as AllowedEmailRole;
  }
  throw new Error(`Invalid role: ${value}`);
}

function parseOptions(args: string[]): CliOptions {
  const options: CliOptions = {};
  const handlers: Record<string, (value?: string) => void> = {
    '--email': (value) => {
      options.email = value;
    },
    '--role': (value) => {
      options.role = parseRole(value);
    },
  };

  const helpFlags = new Set(['--help', '-h']);
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

function normalizeInputEmail(email?: string): string {
  const trimmed = email?.trim();
  if (!trimmed) {
    throw new Error('Email is required');
  }
  if (!isValidEmail(trimmed)) {
    throw new Error('Invalid email');
  }
  return normalizeEmail(trimmed);
}

async function handleList(): Promise<void> {
  const entries = await listAllowedEmails();
  if (entries.length === 0) {
    scriptLogger.info('No allowlist entries found');
    return;
  }

  scriptLogger.info(`Found ${entries.length} allowlist entries`);
  for (const entry of entries) {
    scriptLogger.info(`- ${entry.email} (${entry.role})`);
  }
}

async function handleAdd(options: CliOptions): Promise<void> {
  const email = normalizeInputEmail(options.email);
  const role = options.role;

  if (!role) {
    throw new Error('Role is required');
  }

  const entry = await addAllowedEmail({
    email,
    role,
  });

  scriptLogger.info('Allowlist entry added', {
    email: entry.email,
    role: entry.role,
  });
}

async function handleRemove(options: CliOptions): Promise<void> {
  const email = normalizeInputEmail(options.email);
  const removed = await removeAllowedEmail(email);

  if (!removed) {
    scriptLogger.warn('Allowlist entry not found', { email });
    return;
  }

  scriptLogger.info('Allowlist entry removed', { email });
}

async function main(): Promise<void> {
  const args = process.argv.slice(ARG_START_INDEX);
  const command = parseCommand(args);

  if (!command) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const options = parseOptions(args.slice(1));

  await withTrace('scripts.allowlist', async (span) => {
    span.setAttribute('command', command);

    if (options.email) {
      span.setAttribute('email', options.email);
    }

    switch (command) {
      case COMMAND_LIST:
        await handleList();
        break;
      case COMMAND_ADD:
        await handleAdd(options);
        break;
      case COMMAND_REMOVE:
        await handleRemove(options);
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
  scriptLogger.error('Allowlist CLI failed', error instanceof Error ? error : undefined);
  process.exitCode = 1;
});
