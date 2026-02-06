/**
 * Cover photo button for recipe detail pages.
 *
 * Shows a dropdown with two options: take a photo with the camera,
 * or pick an existing image from the device's camera roll / file system.
 * Uploads the chosen image as the recipe's cover via the photo upload API.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadRecipePhoto } from '@/lib/media/upload-photo';
import { CameraCapture } from './camera-capture';
import { CameraIcon, GalleryIcon } from './icons';

/** Accepted image MIME types for the file picker */
const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

interface CoverPhotoButtonProps {
  /** Recipe slug for upload association */
  recipeSlug: string;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function CoverPhotoButton({ recipeSlug }: CoverPhotoButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const uploadPhoto = useCallback(
    async (file: Blob, filename: string) => {
      setUploadState('uploading');

      try {
        await uploadRecipePhoto({ file, filename, recipeSlug, setCover: true });
        setUploadState('success');
      } catch {
        setUploadState('error');
      }
    },
    [recipeSlug],
  );

  const handleCameraCapture = useCallback(
    async (blob: Blob) => {
      await uploadPhoto(blob, `${recipeSlug}-cover-${Date.now()}.jpg`);
    },
    [recipeSlug, uploadPhoto],
  );

  const handleFileSelected = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      await uploadPhoto(file, file.name);

      // Reset file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [uploadPhoto],
  );

  const openCamera = useCallback(() => {
    setMenuOpen(false);
    setCameraOpen(true);
  }, []);

  const openFilePicker = useCallback(() => {
    setMenuOpen(false);
    fileInputRef.current?.click();
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        disabled={uploadState === 'uploading'}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1 text-sm font-medium text-muted-foreground hover:border-lavender hover:text-lavender disabled:opacity-50"
      >
        {uploadState === 'uploading' ? <UploadingIndicator /> : <CameraIcon className="h-4 w-4" />}
        {buttonLabel(uploadState)}
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <div className="absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <button
            type="button"
            onClick={openCamera}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-pink-light"
          >
            <CameraIcon className="h-4 w-4 text-muted-foreground" />
            Take Photo
          </button>
          <button
            type="button"
            onClick={openFilePicker}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-pink-light"
          >
            <GalleryIcon className="h-4 w-4 text-muted-foreground" />
            Choose from Library
          </button>
        </div>
      )}

      {/* Hidden file input for camera roll / file picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        onChange={handleFileSelected}
        className="hidden"
        aria-label="Choose a photo from your device"
      />

      <CameraCapture
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </div>
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

function UploadingIndicator() {
  return (
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}
