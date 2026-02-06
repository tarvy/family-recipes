/**
 * Cover photo button for recipe detail pages.
 *
 * Opens the camera capture modal, uploads the captured photo as the
 * recipe's cover image via the photo upload API with setCover=true.
 */

'use client';

import { useCallback, useState } from 'react';
import { CameraCapture } from './camera-capture';

/** SVG icon stroke width */
const ICON_STROKE_WIDTH = 2;

interface CoverPhotoButtonProps {
  /** Recipe slug for upload association */
  recipeSlug: string;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function CoverPhotoButton({ recipeSlug }: CoverPhotoButtonProps) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');

  const handleCapture = useCallback(
    async (blob: Blob) => {
      setUploadState('uploading');

      try {
        const formData = new FormData();
        formData.append('file', blob, `${recipeSlug}-cover-${Date.now()}.jpg`);
        formData.append('recipeSlug', recipeSlug);
        formData.append('setCover', 'true');

        const response = await fetch('/api/photos/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data: { error?: string } = await response.json();
          throw new Error(data.error ?? 'Upload failed');
        }

        setUploadState('success');
      } catch {
        setUploadState('error');
      }
    },
    [recipeSlug],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setCameraOpen(true)}
        disabled={uploadState === 'uploading'}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1 text-sm font-medium text-muted-foreground hover:border-lavender hover:text-lavender disabled:opacity-50"
      >
        {uploadState === 'uploading' ? <UploadingIndicator /> : <CameraIcon className="h-4 w-4" />}
        {buttonLabel(uploadState)}
      </button>

      <CameraCapture
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCapture}
      />
    </>
  );
}

function buttonLabel(state: UploadState): string {
  switch (state) {
    case 'uploading':
      return 'Uploading...';
    case 'success':
      return 'Cover Set!';
    case 'error':
      return 'Retry Photo';
    default:
      return 'Cover Photo';
  }
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function UploadingIndicator() {
  return (
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}
