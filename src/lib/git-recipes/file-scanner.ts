/**
 * File scanner for .cook recipe files
 *
 * Scans a directory for Cooklang recipe files.
 *
 * Usage:
 *   import { scanCooklangFiles } from '@/lib/git-recipes';
 *
 *   const files = await scanCooklangFiles('recipes');
 */

import type { Dirent } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { logger } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

export interface CookFile {
  /** Absolute path to the file */
  absolutePath: string;
  /** Path relative to the recipes directory */
  relativePath: string;
  /** Filename without extension */
  baseName: string;
}

/**
 * Recursively scan a directory for .cook files
 */
async function scanDirectory(dir: string, baseDir: string): Promise<CookFile[]> {
  const files: CookFile[] = [];
  const directories = [dir];

  for (const currentDir of directories) {
    const entries = await readDirectoryEntries(currentDir);
    const { subdirectories, cookFiles } = collectEntries(entries, currentDir, baseDir);
    directories.push(...subdirectories);
    files.push(...cookFiles);
  }

  return files;
}

function isSkippableDirectory(name: string): boolean {
  return name.startsWith('.') || name === 'node_modules';
}

function isCookFile(name: string): boolean {
  return name.endsWith('.cook');
}

async function readDirectoryEntries(dir: string): Promise<Dirent[]> {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    // Directory might not exist or be inaccessible
    logger.recipes.warn('Failed to scan directory', {
      dir,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

function collectEntries(
  entries: Dirent[],
  currentDir: string,
  baseDir: string,
): { subdirectories: string[]; cookFiles: CookFile[] } {
  const subdirectories: string[] = [];
  const cookFiles: CookFile[] = [];

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      if (isSkippableDirectory(entry.name)) {
        continue;
      }
      subdirectories.push(fullPath);
      continue;
    }

    if (!(entry.isFile() && isCookFile(entry.name))) {
      continue;
    }

    cookFiles.push({
      absolutePath: fullPath,
      relativePath: path.relative(baseDir, fullPath),
      baseName: entry.name.replace(/\.cook$/, ''),
    });
  }

  return { subdirectories, cookFiles };
}

/**
 * Scan a directory for Cooklang (.cook) files
 *
 * @param directory - Path to the recipes directory (relative to cwd or absolute)
 * @returns Array of cook file info
 */
export async function scanCooklangFiles(directory: string): Promise<CookFile[]> {
  return withTrace('git-recipes.scan', async (span) => {
    // Resolve to absolute path
    const absoluteDir = path.isAbsolute(directory)
      ? directory
      : path.resolve(process.cwd(), directory);

    span.setAttribute('directory', absoluteDir);

    // Check if directory exists
    try {
      const stat = await fs.stat(absoluteDir);
      if (!stat.isDirectory()) {
        logger.recipes.error('Not a directory', undefined, { path: absoluteDir });
        return [];
      }
    } catch {
      logger.recipes.warn('Recipes directory does not exist', { path: absoluteDir });
      return [];
    }

    const files = await scanDirectory(absoluteDir, absoluteDir);

    span.setAttribute('files_found', files.length);
    logger.recipes.info('Scanned for cook files', {
      directory: absoluteDir,
      filesFound: files.length,
    });

    return files;
  });
}

/** Milliseconds per second */
const MS_PER_SECOND = 1000;

/** Git command timeout in seconds */
const GIT_COMMAND_TIMEOUT_SECONDS = 5;

/**
 * Get the current git commit hash
 */
export async function getGitCommitHash(): Promise<string> {
  try {
    const { execSync } = await import('node:child_process');
    const hash = execSync('git rev-parse HEAD', {
      encoding: 'utf-8',
      timeout: MS_PER_SECOND * GIT_COMMAND_TIMEOUT_SECONDS,
    }).trim();
    return hash;
  } catch {
    logger.recipes.warn('Could not get git commit hash, using placeholder');
    return 'unknown';
  }
}

/**
 * Read the content of a .cook file
 */
export async function readCookFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}
