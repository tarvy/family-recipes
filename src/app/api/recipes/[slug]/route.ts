/**
 * PUT /api/recipes/[slug]
 *
 * Update an existing recipe. Writes updated .cook file to the filesystem.
 *
 * Auth: Session required.
 */

import { cookies } from 'next/headers';
import type { IRecipe } from '@/db/types';
import { getSessionFromCookies } from '@/lib/auth/session';
import {
  HTTP_BAD_REQUEST,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { logger } from '@/lib/logger';
import { getRecipeBySlug } from '@/lib/recipes/loader';
import { deleteRecipeFile, writeRecipe } from '@/lib/recipes/writer';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

/** Valid recipe categories */
const VALID_CATEGORIES = ['breakfast', 'desserts', 'entrees', 'salads', 'sides', 'soups'];

interface UpdateRecipeRequest {
  title: string;
  category: string;
  description?: string;
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  difficulty?: string;
  cuisine?: string;
  course?: string;
  tags?: string[];
  ingredients: Array<{ name: string; quantity?: string; unit?: string }>;
  cookware?: Array<{ name: string; quantity?: number }>;
  steps: Array<{ text: string }>;
}

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * Generate URL-safe slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Check if an ingredient object is valid
 */
function isValidIngredient(ing: unknown): boolean {
  return (
    !!ing && typeof ing === 'object' && typeof (ing as Record<string, unknown>)['name'] === 'string'
  );
}

/**
 * Check if a step object is valid
 */
function isValidStep(step: unknown): boolean {
  return (
    !!step &&
    typeof step === 'object' &&
    typeof (step as Record<string, unknown>)['text'] === 'string'
  );
}

/**
 * Validate the request body
 */
function validateRequest(
  body: unknown,
): { valid: true; data: UpdateRecipeRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const data = body as Record<string, unknown>;

  if (typeof data['title'] !== 'string' || !data['title'].trim()) {
    return { valid: false, error: 'Title is required' };
  }

  if (typeof data['category'] !== 'string' || !VALID_CATEGORIES.includes(data['category'])) {
    return { valid: false, error: 'Valid category is required' };
  }

  if (!Array.isArray(data['ingredients']) || data['ingredients'].length === 0) {
    return { valid: false, error: 'At least one ingredient is required' };
  }

  if (!Array.isArray(data['steps']) || data['steps'].length === 0) {
    return { valid: false, error: 'At least one step is required' };
  }

  const ingredientsValid = data['ingredients'].every(isValidIngredient);
  if (!ingredientsValid) {
    return { valid: false, error: 'Each ingredient must have a name' };
  }

  const stepsValid = data['steps'].every(isValidStep);
  if (!stepsValid) {
    return { valid: false, error: 'Each step must have text' };
  }

  return { valid: true, data: data as unknown as UpdateRecipeRequest };
}

/**
 * Apply optional fields to recipe object
 */
function applyOptionalFields(recipe: IRecipe, data: UpdateRecipeRequest): void {
  if (data.description) {
    recipe.description = data.description;
  }
  if (data.servings !== undefined) {
    recipe.servings = data.servings;
  }
  if (data.prepTime !== undefined) {
    recipe.prepTime = data.prepTime;
  }
  if (data.cookTime !== undefined) {
    recipe.cookTime = data.cookTime;
  }
  if (data.prepTime !== undefined && data.cookTime !== undefined) {
    recipe.totalTime = data.prepTime + data.cookTime;
  }
  if (data.difficulty) {
    recipe.difficulty = data.difficulty;
  }
  if (data.cuisine) {
    recipe.cuisine = data.cuisine;
  }
  if (data.course) {
    recipe.course = data.course;
  }
}

/**
 * Build recipe object from request data
 */
function buildRecipe(data: UpdateRecipeRequest, slug: string): IRecipe {
  const now = new Date();
  const recipe: IRecipe = {
    filePath: `${data.category}/${slug}.cook`,
    gitCommitHash: 'pending',
    title: data.title.trim(),
    slug,
    ingredients: data.ingredients,
    cookware: data.cookware ?? [],
    steps: data.steps,
    tags: data.tags ?? [],
    photoUrls: [],
    createdAt: now,
    updatedAt: now,
  };

  applyOptionalFields(recipe, data);
  return recipe;
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
      const existingRecipe = await getRecipeBySlug(originalSlug);
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

      const data = validation.data;
      const newSlug = generateSlug(data.title);

      span.setAttribute('new_slug', newSlug);
      span.setAttribute('category', data.category);

      const recipe = buildRecipe(data, newSlug);

      await handleRecipeRelocation(originalSlug, newSlug, data.category, existingRecipe);
      await writeRecipe(recipe, data.category);

      logger.recipes.info('Recipe updated', {
        originalSlug,
        newSlug,
        category: data.category,
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
