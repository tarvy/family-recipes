/**
 * Recipe rating API route
 *
 * POST /api/recipes/[slug]/rate - Set or clear the family star rating
 */

import { cookies } from 'next/headers';
import { getSessionFromCookies } from '@/lib/auth/session';
import {
  HTTP_BAD_REQUEST,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { toError, toErrorMessage } from '@/lib/errors';
import { logger, withRequestContext } from '@/lib/logger';
import { rateRecipe } from '@/lib/recipes/repository';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

/** Minimum allowed star rating */
const MIN_RATING = 1;

/** Maximum allowed star rating */
const MAX_RATING = 5;

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * Validate rating from request body.
 * Returns the parsed rating (number | null) or an error string.
 */
function validateRating(
  body: unknown,
): { valid: true; rating: number | null } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const data = body as Record<string, unknown>;
  const rating = data['rating'];

  if (rating === null) {
    return { valid: true, rating: null };
  }

  if (typeof rating !== 'number' || !Number.isInteger(rating)) {
    return { valid: false, error: 'Rating must be an integer or null' };
  }

  if (rating < MIN_RATING || rating > MAX_RATING) {
    return { valid: false, error: `Rating must be between ${MIN_RATING} and ${MAX_RATING}` };
  }

  return { valid: true, rating };
}

/**
 * POST /api/recipes/[slug]/rate
 *
 * Set or clear the family rating for a recipe.
 * Body: { rating: number (1-5) | null }
 */
export async function POST(request: Request, { params }: RouteParams): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.recipes.rate', async (span) => {
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
        const body: unknown = await request.json();
        const validation = validateRating(body);

        if (!validation.valid) {
          return Response.json({ error: validation.error }, { status: HTTP_BAD_REQUEST });
        }

        span.setAttribute('rating', validation.rating ?? 0);

        const updated = await rateRecipe(slug, validation.rating);

        if (!updated) {
          span.setAttribute('error', 'not_found');
          return Response.json({ error: 'Recipe not found' }, { status: HTTP_NOT_FOUND });
        }

        logger.recipes.info('Recipe rated via API', {
          slug,
          rating: validation.rating,
          userId: user.id,
        });
        return Response.json({ success: true, rating: validation.rating });
      } catch (error) {
        logger.recipes.error('Failed to rate recipe', toError(error));
        span.setAttribute('error', toErrorMessage(error));
        return Response.json(
          { error: 'Failed to rate recipe' },
          { status: HTTP_INTERNAL_SERVER_ERROR },
        );
      }
    }),
  );
}
