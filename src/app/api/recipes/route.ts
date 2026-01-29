/**
 * POST /api/recipes
 *
 * Create a new recipe from raw Cooklang content.
 * Writes the content directly to a .cook file on the filesystem.
 *
 * Auth: Session required.
 */

import { cookies } from 'next/headers';
import { getSessionFromCookies } from '@/lib/auth/session';
import {
  HTTP_BAD_REQUEST,
  HTTP_CONFLICT,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { extractMetadataFromContent, generateSlugFromTitle } from '@/lib/cooklang/metadata';
import { logger } from '@/lib/logger';
import { recipeFileExists, writeRawCooklangContent } from '@/lib/recipes/writer';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

/** Valid recipe categories */
const VALID_CATEGORIES = ['breakfast', 'desserts', 'entrees', 'salads', 'sides', 'soups'];

interface CreateRecipeRequest {
  /** Raw Cooklang content including metadata */
  content: string;
  /** Target category directory */
  category: string;
}

/**
 * Validate the request body for Cooklang-first format
 */
function validateRequest(
  body: unknown,
): { valid: true; data: CreateRecipeRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const data = body as Record<string, unknown>;

  // Check for raw Cooklang content format
  if (typeof data['content'] !== 'string' || !data['content'].trim()) {
    return { valid: false, error: 'Recipe content is required' };
  }

  if (typeof data['category'] !== 'string' || !VALID_CATEGORIES.includes(data['category'])) {
    return { valid: false, error: 'Valid category is required' };
  }

  // Parse content to validate it has required fields
  const metadata = extractMetadataFromContent(data['content']);

  if (!metadata.title?.trim()) {
    return { valid: false, error: 'Recipe content must include a title (>> title: Your Title)' };
  }

  // Check that there's actual recipe content (not just metadata)
  const lines = data['content'].split('\n');
  const hasContent = lines.some((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('>>');
  });

  if (!hasContent) {
    return { valid: false, error: 'Recipe must include at least one step' };
  }

  return {
    valid: true,
    data: {
      content: data['content'],
      category: data['category'],
    },
  };
}

export async function POST(request: Request): Promise<Response> {
  return withTrace('api.recipes.create', async (span) => {
    const cookieStore = await cookies();
    const user = await getSessionFromCookies(cookieStore);

    if (!user) {
      span.setAttribute('error', 'unauthorized');
      return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
    }

    span.setAttribute('user_id', user.id);

    try {
      const body = await request.json();
      const validation = validateRequest(body);

      if (!validation.valid) {
        span.setAttribute('error', 'validation_failed');
        return Response.json({ error: validation.error }, { status: HTTP_BAD_REQUEST });
      }

      const { content, category } = validation.data;

      // Extract title from content to generate slug
      const metadata = extractMetadataFromContent(content);
      const slug = generateSlugFromTitle(metadata.title);

      span.setAttribute('slug', slug);
      span.setAttribute('category', category);

      // Check if recipe already exists
      const exists = await recipeFileExists(slug, category);
      if (exists) {
        span.setAttribute('error', 'conflict');
        return Response.json(
          { error: 'A recipe with this title already exists in this category' },
          { status: HTTP_CONFLICT },
        );
      }

      // Write raw content directly to file
      await writeRawCooklangContent(content, category, slug);

      logger.recipes.info('Recipe created (Cooklang-first)', {
        slug,
        category,
        userId: user.id,
      });

      return Response.json({ success: true, slug });
    } catch (error) {
      logger.recipes.error('Failed to create recipe', error instanceof Error ? error : undefined);
      span.setAttribute('error', error instanceof Error ? error.message : 'unknown');
      return Response.json(
        { error: 'Failed to create recipe' },
        { status: HTTP_INTERNAL_SERVER_ERROR },
      );
    }
  });
}
