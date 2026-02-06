/**
 * Cover photo button for recipe detail pages.
 *
 * Shows a dropdown with two options: take a photo with the camera,
 * or pick an existing image from the device's camera roll / file system.
 * Uploads the chosen image as the recipe's cover via the photo upload API.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraCapture } from './camera-capture';

/** SVG icon stroke width */
const ICON_STROKE_WIDTH = 2;

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
        const formData = new FormData();
        formData.append('file', file, filename);
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

function GalleryIcon({ className }: { className?: string }) {
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
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function UploadingIndicator() {
  return (
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}
