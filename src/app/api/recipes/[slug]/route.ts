/**
 * Recipe API routes for individual recipes
 *
 * GET /api/recipes/[slug] - Get recipe details (no auth)
 * PUT /api/recipes/[slug] - Update recipe with raw Cooklang content (auth required)
 * DELETE /api/recipes/[slug] - Delete recipe (auth required)
 */

import { cookies } from 'next/headers';
import { getSessionFromCookies } from '@/lib/auth/session';
import {
  HTTP_BAD_REQUEST,
  HTTP_CONFLICT,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { extractMetadataFromContent } from '@/lib/cooklang/metadata';
import { toError, toErrorMessage } from '@/lib/errors';
import { logger, withRequestContext } from '@/lib/logger';
import {
  createRecipe,
  deleteRecipe,
  getRecipeDetail,
  type RecipeWriteResult,
  updateRecipe,
} from '@/lib/recipes/repository';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

/** Valid recipe categories */
const VALID_CATEGORIES = [
  'breakfast',
  'cocktails',
  'desserts',
  'entrees',
  'salads',
  'sides',
  'soups',
];

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
export async function GET(request: Request, { params }: RouteParams): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.recipes.get', async (span) => {
      const { slug } = await params;
      span.setAttribute('slug', slug);

      try {
        const recipe = await getRecipeDetail(slug);

        if (!recipe) {
          span.setAttribute('error', 'not_found');
          return Response.json({ error: 'Recipe not found' }, { status: HTTP_NOT_FOUND });
        }

        return Response.json(recipe);
      } catch (error) {
        logger.recipes.error('Failed to get recipe', toError(error));
        span.setAttribute('error', toErrorMessage(error));
        return Response.json(
          { error: 'Failed to get recipe' },
          { status: HTTP_INTERNAL_SERVER_ERROR },
        );
      }
    }),
  );
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

/**
 * Map repository error codes to HTTP status codes
 */
function mapErrorCodeToStatus(code: string | undefined): number {
  if (code === 'NOT_FOUND') {
    return HTTP_NOT_FOUND;
  }
  if (code === 'DUPLICATE_SLUG') {
    return HTTP_CONFLICT;
  }
  return HTTP_BAD_REQUEST;
}

/**
 * Update or create a recipe in MongoDB.
 *
 * Attempts an update first. If the recipe is not yet in MongoDB
 * (e.g. filesystem-only), falls back to creating it.
 */
async function updateOrCreateRecipe(
  slug: string,
  content: string,
  category: string,
): Promise<RecipeWriteResult> {
  const result = await updateRecipe(slug, content, category);

  if (!result.success && result.code === 'NOT_FOUND') {
    logger.recipes.info('Recipe not in MongoDB, creating from edit', { slug, category });
    return createRecipe(content, category, 'api');
  }

  return result;
}

/**
 * PUT /api/recipes/[slug]
 *
 * Update recipe with raw Cooklang content. Auth required.
 * Saves directly to MongoDB (source of truth).
 */
export async function PUT(request: Request, { params }: RouteParams): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.recipes.update', async (span) => {
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
        const body = await request.json();
        const validation = validateRequest(body);

        if (!validation.valid) {
          span.setAttribute('error', 'validation_failed');
          return Response.json({ error: validation.error }, { status: HTTP_BAD_REQUEST });
        }

        const { content, category } = validation.data;
        span.setAttribute('category', category);

        const result = await updateOrCreateRecipe(originalSlug, content, category);

        if (!result.success) {
          span.setAttribute('error', result.code ?? 'update_failed');
          return Response.json(
            { error: result.error },
            { status: mapErrorCodeToStatus(result.code) },
          );
        }

        span.setAttribute('new_slug', result.slug);
        logger.recipes.info('Recipe updated via API', {
          originalSlug,
          newSlug: result.slug,
          category,
          userId: user.id,
        });

        return Response.json({ success: true, slug: result.slug });
      } catch (error) {
        logger.recipes.error('Failed to update recipe', toError(error));
        span.setAttribute('error', toErrorMessage(error));
        return Response.json(
          { error: 'Failed to update recipe' },
          { status: HTTP_INTERNAL_SERVER_ERROR },
        );
      }
    }),
  );
}

/**
 * DELETE /api/recipes/[slug]
 *
 * Delete a recipe. Auth required.
 */
export async function DELETE(request: Request, { params }: RouteParams): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.recipes.delete', async (span) => {
      const { slug } = await params;
      span.setAttribute('slug', slug);

      const cookieStore = await cookies();
      const user = await getSessionFromCookies(cookieStore);

      if (!user) {
        span.setAttribute('error', 'unauthorized');
        return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
      }

      span.setAttribute('user_id', user.id);

      try {
        const result = await deleteRecipe(slug);

        if (!result.success) {
          span.setAttribute('error', 'not_found');
          return Response.json({ error: result.error }, { status: HTTP_NOT_FOUND });
        }

        logger.recipes.info('Recipe deleted via API', {
          slug,
          userId: user.id,
        });

        return Response.json({ success: true });
      } catch (error) {
        logger.recipes.error('Failed to delete recipe', toError(error));
        span.setAttribute('error', toErrorMessage(error));
        return Response.json(
          { error: 'Failed to delete recipe' },
          { status: HTTP_INTERNAL_SERVER_ERROR },
        );
      }
    }),
  );
}
