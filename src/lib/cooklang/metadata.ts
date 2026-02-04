/**
 * Cooklang metadata utilities
 *
 * Functions for extracting, parsing, and building metadata from Cooklang content.
 * Used by the Cooklang-first editor to sync metadata fields with content.
 */

import { DECIMAL_RADIX, METADATA_KEYS, normalizeMetadataKey, parseTimeString } from './constants';

/** Regex match group indices for metadata line parsing */
const METADATA_KEY_GROUP = 1;
const METADATA_VALUE_GROUP = 2;

/** Metadata fields extracted from Cooklang content */
export interface CooklangMetadata {
  title: string;
  description?: string;
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  difficulty?: string;
  cuisine?: string;
  course?: string;
  source?: string;
  tags?: string[];
  // Extended metadata fields
  author?: string;
  diet?: string[];
  locale?: string;
}

/** Result of splitting content into metadata and body */
export interface ContentParts {
  metadata: CooklangMetadata;
  body: string;
}

/** Regex to match metadata lines: >> key: value */
const METADATA_LINE_REGEX = /^>>\s*([^:]+):\s*(.*)$/;

/**
 * Extract metadata from a single line
 */
function parseMetadataLine(line: string): { key: string; value: string } | null {
  const match = line.match(METADATA_LINE_REGEX);
  if (!match?.[METADATA_KEY_GROUP] || match[METADATA_VALUE_GROUP] === undefined) {
    return null;
  }
  return {
    key: match[METADATA_KEY_GROUP].trim().toLowerCase(),
    value: match[METADATA_VALUE_GROUP].trim(),
  };
}

/**
 * Parse servings from various formats
 * "4" → 4, "4 servings" → 4, "12 cookies" → 12
 */
function parseServings(value: string): number | undefined {
  const match = value.match(/^(\d+)/);
  return match?.[1] ? Number.parseInt(match[1], DECIMAL_RADIX) : undefined;
}

/**
 * Parse comma-separated list (for tags, diet)
 */
function parseCommaSeparatedList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Extract all metadata from Cooklang content
 *
 * Parses >> key: value lines and returns structured metadata object.
 * Handles aliases (serves → servings, time → total time, etc.)
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Parser switch-case complexity is inherent
export function extractMetadataFromContent(content: string): CooklangMetadata {
  const lines = content.split('\n');
  const metadata: CooklangMetadata = { title: '' };

  for (const line of lines) {
    const parsed = parseMetadataLine(line);
    if (!parsed) {
      continue;
    }

    // Normalize key to handle aliases (serves → servings, time → total time, etc.)
    const normalizedKey = normalizeMetadataKey(parsed.key);
    const { value } = parsed;

    switch (normalizedKey) {
      case METADATA_KEYS.TITLE:
        metadata.title = value;
        break;
      case METADATA_KEYS.DESCRIPTION:
        metadata.description = value;
        break;
      case METADATA_KEYS.SERVINGS: {
        const servings = parseServings(value);
        if (servings !== undefined) {
          metadata.servings = servings;
        }
        break;
      }
      case METADATA_KEYS.PREP_TIME: {
        const prepTime = parseTimeString(value);
        if (prepTime !== undefined) {
          metadata.prepTime = prepTime;
        }
        break;
      }
      case METADATA_KEYS.COOK_TIME: {
        const cookTime = parseTimeString(value);
        if (cookTime !== undefined) {
          metadata.cookTime = cookTime;
        }
        break;
      }
      case METADATA_KEYS.TOTAL_TIME: {
        const totalTime = parseTimeString(value);
        if (totalTime !== undefined) {
          metadata.totalTime = totalTime;
        }
        break;
      }
      case METADATA_KEYS.DIFFICULTY:
        metadata.difficulty = value;
        break;
      case METADATA_KEYS.CUISINE:
        metadata.cuisine = value;
        break;
      case METADATA_KEYS.COURSE:
        metadata.course = value;
        break;
      case METADATA_KEYS.SOURCE:
        metadata.source = value;
        break;
      case METADATA_KEYS.TAGS:
        metadata.tags = parseCommaSeparatedList(value);
        break;
      // Extended metadata fields
      case 'author':
        metadata.author = value;
        break;
      case 'diet':
        metadata.diet = parseCommaSeparatedList(value);
        break;
      case 'locale':
        metadata.locale = value;
        break;
    }
  }

  return metadata;
}

/**
 * Split Cooklang content into metadata and body
 *
 * Returns the metadata object and the body (non-metadata lines).
 * Body excludes leading empty lines after metadata section.
 */
export function splitMetadataAndBody(content: string): ContentParts {
  const lines = content.split('\n');
  const bodyLines: string[] = [];
  let inMetadataSection = true;

  for (const line of lines) {
    const isMetadataLine = METADATA_LINE_REGEX.test(line);
    const isEmptyLine = line.trim() === '';

    if (isMetadataLine) {
      // Stay in metadata section
      continue;
    }

    if (inMetadataSection && isEmptyLine) {
      // Skip empty lines between metadata and body
      continue;
    }

    // First non-metadata, non-empty line marks start of body
    inMetadataSection = false;
    bodyLines.push(line);
  }

  const metadata = extractMetadataFromContent(content);
  const body = bodyLines.join('\n').trimEnd();

  return { metadata, body };
}

/**
 * Build metadata lines from metadata object
 *
 * Returns array of >> key: value lines
 */
function buildMetadataLines(metadata: CooklangMetadata): string[] {
  const lines: string[] = [];

  // Title is always first and required
  if (metadata.title) {
    lines.push(`>> ${METADATA_KEYS.TITLE}: ${metadata.title}`);
  }

  if (metadata.description) {
    lines.push(`>> ${METADATA_KEYS.DESCRIPTION}: ${metadata.description}`);
  }

  if (metadata.servings !== undefined) {
    lines.push(`>> ${METADATA_KEYS.SERVINGS}: ${metadata.servings}`);
  }

  if (metadata.prepTime !== undefined) {
    lines.push(`>> ${METADATA_KEYS.PREP_TIME}: ${metadata.prepTime} minutes`);
  }

  if (metadata.cookTime !== undefined) {
    lines.push(`>> ${METADATA_KEYS.COOK_TIME}: ${metadata.cookTime} minutes`);
  }

  if (metadata.totalTime !== undefined) {
    lines.push(`>> ${METADATA_KEYS.TOTAL_TIME}: ${metadata.totalTime} minutes`);
  }

  if (metadata.difficulty) {
    lines.push(`>> ${METADATA_KEYS.DIFFICULTY}: ${metadata.difficulty}`);
  }

  if (metadata.cuisine) {
    lines.push(`>> ${METADATA_KEYS.CUISINE}: ${metadata.cuisine}`);
  }

  if (metadata.course) {
    lines.push(`>> ${METADATA_KEYS.COURSE}: ${metadata.course}`);
  }

  if (metadata.source) {
    lines.push(`>> ${METADATA_KEYS.SOURCE}: ${metadata.source}`);
  }

  if (metadata.tags && metadata.tags.length > 0) {
    lines.push(`>> ${METADATA_KEYS.TAGS}: ${metadata.tags.join(', ')}`);
  }

  return lines;
}

/**
 * Build complete Cooklang content from metadata and body
 *
 * Combines metadata lines with body, separated by blank line.
 */
export function buildCooklangContent(metadata: CooklangMetadata, body: string): string {
  const metadataLines = buildMetadataLines(metadata);
  const trimmedBody = body.trim();

  if (metadataLines.length === 0 && trimmedBody === '') {
    return '';
  }

  if (metadataLines.length === 0) {
    return `${trimmedBody}\n`;
  }

  if (trimmedBody === '') {
    return `${metadataLines.join('\n')}\n`;
  }

  return `${metadataLines.join('\n')}\n\n${trimmedBody}\n`;
}

/**
 * Format an ingredient for Cooklang syntax
 *
 * Returns properly formatted @ingredient{qty%unit} string
 */
export function formatIngredient(name: string, quantity?: string, unit?: string): string {
  const trimmedName = name.trim();
  const hasMultipleWords = trimmedName.includes(' ');

  if (quantity && unit) {
    return `@${trimmedName}{${quantity}%${unit}}`;
  }

  if (quantity) {
    return `@${trimmedName}{${quantity}}`;
  }

  // Multi-word names without quantity need empty braces
  if (hasMultipleWords) {
    return `@${trimmedName}{}`;
  }

  return `@${trimmedName}`;
}

/**
 * Format cookware for Cooklang syntax
 *
 * Returns properly formatted #cookware{qty} string
 */
export function formatCookware(name: string, quantity?: number): string {
  const trimmedName = name.trim();
  const hasMultipleWords = trimmedName.includes(' ');

  if (quantity && quantity > 1) {
    return `#${trimmedName}{${quantity}}`;
  }

  if (hasMultipleWords) {
    return `#${trimmedName}{}`;
  }

  return `#${trimmedName}`;
}

/**
 * Format timer for Cooklang syntax
 *
 * Returns properly formatted ~{duration%unit} string
 */
export function formatTimer(duration: number, unit: string): string {
  return `~{${duration}%${unit}}`;
}

/**
 * Generate URL-safe slug from title
 */
export function generateSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
