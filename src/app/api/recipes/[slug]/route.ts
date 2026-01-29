/**
 * Recipe API routes for individual recipes
 *
 * GET /api/recipes/[slug] - Get recipe details (no auth)
 * PUT /api/recipes/[slug] - Update recipe with raw Cooklang content (auth required)
 */

import { cookies } from 'next/headers';
import { getSessionFromCookies } from '@/lib/auth/session';
import {
  HTTP_BAD_REQUEST,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { extractMetadataFromContent, generateSlugFromTitle } from '@/lib/cooklang/metadata';
import { logger } from '@/lib/logger';
import { getRawCooklangContent, getRecipeBySlug } from '@/lib/recipes/loader';
import { deleteRecipeFile, writeRawCooklangContent } from '@/lib/recipes/writer';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

/** Valid recipe categories */
const VALID_CATEGORIES = ['breakfast', 'desserts', 'entrees', 'salads', 'sides', 'soups'];

interface UpdateRecipeRequest {
  /** Raw Cooklang content including metadata */
  content: string;
  /** Target category directory */
  category: string;
}

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/recipes/[slug]
 *
 * Get recipe details by slug. No authentication required.
 */
export async function GET(_request: Request, { params }: RouteParams): Promise<Response> {
  return withTrace('api.recipes.get', async (span) => {
    const { slug } = await params;
    span.setAttribute('slug', slug);

    try {
      const recipe = await getRecipeBySlug(slug);

      if (!recipe) {
        span.setAttribute('error', 'not_found');
        return Response.json({ error: 'Recipe not found' }, { status: HTTP_NOT_FOUND });
      }

      return Response.json(recipe);
    } catch (error) {
      logger.recipes.error('Failed to get recipe', error instanceof Error ? error : undefined);
      span.setAttribute('error', error instanceof Error ? error.message : 'unknown');
      return Response.json(
        { error: 'Failed to get recipe' },
        { status: HTTP_INTERNAL_SERVER_ERROR },
      );
    }
  });
}

/**
 * Validate the request body for Cooklang-first format
 */
function validateRequest(
  body: unknown,
): { valid: true; data: UpdateRecipeRequest } | { valid: false; error: string } {
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

interface ExistingRecipeInfo {
  category: string;
}

/**
 * Handle cleanup when recipe location changes
 */
async function handleRecipeRelocation(
  originalSlug: string,
  newSlug: string,
  newCategory: string,
  existingRecipe: ExistingRecipeInfo,
): Promise<void> {
  const slugChanged = newSlug !== originalSlug;
  const categoryChanged = newCategory !== existingRecipe.category;

  if (slugChanged || categoryChanged) {
    await deleteRecipeFile(originalSlug, existingRecipe.category);
    logger.recipes.info('Deleted old recipe file during update', {
      oldSlug: originalSlug,
      oldCategory: existingRecipe.category,
    });
  }
}

/**
 * PUT /api/recipes/[slug]
 *
 * Update recipe with raw Cooklang content. Auth required.
 */
export async function PUT(request: Request, { params }: RouteParams): Promise<Response> {
  return withTrace('api.recipes.update', async (span) => {
    const { slug: originalSlug } = await params;
    span.setAttribute('original_slug', originalSlug);

    const cookieStore = await cookies();
    const user = await getSessionFromCookies(cookieStore);

    if (!user) {
      span.setAttribute('error', 'unauthorized');
      return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
    }

    span.setAttribute('user_id', user.id);

    try {
      // Check if recipe exists by trying to get raw content
      const existingRecipe = await getRawCooklangContent(originalSlug);
      if (!existingRecipe) {
        span.setAttribute('error', 'not_found');
        return Response.json({ error: 'Recipe not found' }, { status: HTTP_NOT_FOUND });
      }

      const body = await request.json();
      const validation = validateRequest(body);

      if (!validation.valid) {
        span.setAttribute('error', 'validation_failed');
        return Response.json({ error: validation.error }, { status: HTTP_BAD_REQUEST });
      }

      const { content, category } = validation.data;

      // Extract title from content to generate new slug
      const metadata = extractMetadataFromContent(content);
      const newSlug = generateSlugFromTitle(metadata.title);

      span.setAttribute('new_slug', newSlug);
      span.setAttribute('category', category);

      // Handle file relocation if slug or category changed
      await handleRecipeRelocation(originalSlug, newSlug, category, existingRecipe);

      // Write raw content directly to file
      await writeRawCooklangContent(content, category, newSlug);

      logger.recipes.info('Recipe updated (Cooklang-first)', {
        originalSlug,
        newSlug,
        category,
        userId: user.id,
      });

      return Response.json({ success: true, slug: newSlug });
    } catch (error) {
      logger.recipes.error('Failed to update recipe', error instanceof Error ? error : undefined);
      span.setAttribute('error', error instanceof Error ? error.message : 'unknown');
      return Response.json(
        { error: 'Failed to update recipe' },
        { status: HTTP_INTERNAL_SERVER_ERROR },
      );
    }
  });
}
