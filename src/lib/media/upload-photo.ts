/**
 * Client-side photo upload utility.
 *
 * Sends an image file to the photo upload API endpoint and returns
 * the resulting blob URL. Used by CoverPhotoButton and MediaCaptureSection
 * to avoid duplicating the fetch / error-handling logic.
 */

interface UploadPhotoOptions {
  /** Image file or blob to upload */
  file: Blob;
  /** Filename for the upload */
  filename: string;
  /** Recipe slug to associate the photo with */
  recipeSlug: string;
  /** Whether to set this photo as the recipe cover */
  setCover?: boolean;
}

interface UploadPhotoResult {
  url: string;
}

/**
 * Upload a photo to the recipe photo API.
 *
 * @throws {Error} If the upload fails or the server returns an error.
 */
export async function uploadRecipePhoto({
  file,
  filename,
  recipeSlug,
  setCover = false,
}: UploadPhotoOptions): Promise<UploadPhotoResult> {
  const formData = new FormData();
  formData.append('file', file, filename);
  formData.append('recipeSlug', recipeSlug);

  if (setCover) {
    formData.append('setCover', 'true');
  }

  const response = await fetch('/api/photos/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const data: { error?: string } = await response.json();
    throw new Error(data.error ?? 'Upload failed');
  }

  const data: { url: string } = await response.json();
  return { url: data.url };
}
