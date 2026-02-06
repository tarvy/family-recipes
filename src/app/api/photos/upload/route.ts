/**
 * POST /api/photos/upload
 *
 * Upload a photo to Vercel Blob storage and associate it with a recipe.
 * Accepts multipart/form-data with a file and recipeId.
 *
 * Auth: Session required.
 */

import { put } from '@vercel/blob';
import { cookies } from 'next/headers';
import { connectDB } from '@/db/connection';
import { Recipe } from '@/db/models/recipe.model';
import { getSessionFromCookies } from '@/lib/auth/session';
import {
  HTTP_BAD_REQUEST,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { logger, withRequestContext } from '@/lib/logger';
import type { MinimalSpan } from '@/lib/telemetry';
import { traceDbQuery, withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

/** Maximum upload file size in bytes (10 MB) */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Allowed MIME types for photo uploads */
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface PhotoUploadResponse {
  url: string;
  recipeId: string;
}

interface PhotoUploadError {
  error: string;
}

interface ValidatedUpload {
  file: File;
  recipeId: string;
}

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message } satisfies PhotoUploadError, { status });
}

/**
 * Extract and validate file and recipeId from form data.
 */
function validateFormData(formData: FormData, span: MinimalSpan): ValidatedUpload | Response {
  const file = formData.get('file');
  const recipeId = formData.get('recipeId');

  if (!(file && file instanceof File)) {
    span.setAttribute('error', 'missing_file');
    return errorResponse('No file provided', HTTP_BAD_REQUEST);
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    span.setAttribute('error', 'invalid_type');
    return errorResponse('File must be an image (JPEG, PNG, or WebP)', HTTP_BAD_REQUEST);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    span.setAttribute('error', 'file_too_large');
    return errorResponse('File exceeds 10MB size limit', HTTP_BAD_REQUEST);
  }

  if (!recipeId || typeof recipeId !== 'string') {
    span.setAttribute('error', 'missing_recipe_id');
    return errorResponse('Recipe ID is required', HTTP_BAD_REQUEST);
  }

  return { file, recipeId };
}

/**
 * Upload file to Vercel Blob and update the recipe in MongoDB.
 */
async function uploadAndAttach(file: File, recipeId: string, span: MinimalSpan): Promise<Response> {
  span.setAttribute('recipe_id', recipeId);
  span.setAttribute('file_size', file.size);
  span.setAttribute('file_type', file.type);

  logger.recipes.info('Photo upload started', {
    recipeId,
    fileSize: file.size,
    mimeType: file.type,
  });

  await connectDB();

  const recipe = await traceDbQuery('findById', 'recipes', async () => {
    return Recipe.findById(recipeId);
  });

  if (!recipe) {
    span.setAttribute('error', 'recipe_not_found');
    return errorResponse('Recipe not found', HTTP_NOT_FOUND);
  }

  const timestamp = Date.now();
  const extension = file.type.split('/')[1] ?? 'jpg';
  const pathname = `recipes/${recipe.slug}/${timestamp}.${extension}`;

  const blob = await put(pathname, file, {
    access: 'public',
    contentType: file.type,
  });

  await traceDbQuery('updateOne', 'recipes', async () => {
    return Recipe.updateOne(
      { _id: recipeId },
      {
        $push: { photoUrls: blob.url },
        ...(recipe.primaryPhotoUrl ? {} : { $set: { primaryPhotoUrl: blob.url } }),
      },
    );
  });

  logger.recipes.info('Photo upload completed', {
    recipeId,
    blobUrl: blob.url,
  });

  return Response.json({
    url: blob.url,
    recipeId,
  } satisfies PhotoUploadResponse);
}

/**
 * Handle the photo upload after authentication is verified.
 */
async function handleUpload(request: Request, span: MinimalSpan): Promise<Response> {
  const formData = await request.formData();
  const validation = validateFormData(formData, span);

  if (validation instanceof Response) {
    return validation;
  }

  return uploadAndAttach(validation.file, validation.recipeId, span);
}

function handleUploadError(error: unknown, span: MinimalSpan): Response {
  logger.recipes.error('Photo upload failed', error instanceof Error ? error : undefined);
  span.setAttribute('error', error instanceof Error ? error.message : 'unknown');
  return errorResponse('Failed to upload photo', HTTP_INTERNAL_SERVER_ERROR);
}

export async function POST(request: Request): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.photos.upload', async (span) => {
      const cookieStore = await cookies();
      const user = await getSessionFromCookies(cookieStore);

      if (!user) {
        span.setAttribute('error', 'unauthorized');
        return errorResponse('Authentication required', HTTP_UNAUTHORIZED);
      }

      span.setAttribute('user_id', user.id);

      try {
        return await handleUpload(request, span);
      } catch (error) {
        return handleUploadError(error, span);
      }
    }),
  );
}
