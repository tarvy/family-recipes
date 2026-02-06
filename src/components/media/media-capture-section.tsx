/**
 * Container component for media capture on recipe pages.
 *
 * Wraps CameraCapture and AudioRecorder, handles the upload flow
 * after capture, and provides the UI entry points (buttons) for
 * opening the camera or recorder.
 */

'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AudioRecorder } from './audio-recorder';
import { CameraCapture } from './camera-capture';

/** SVG icon stroke width */
const ICON_STROKE_WIDTH = 2;

interface MediaCaptureSectionProps {
  /** Recipe ID for associating uploads */
  recipeId: string;
  /** Recipe slug for display and upload context */
  recipeSlug: string;
  /** Callback when a photo is uploaded successfully */
  onPhotoUploaded?: (url: string) => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function MediaCaptureSection({
  recipeId,
  recipeSlug,
  onPhotoUploaded,
}: MediaCaptureSectionProps) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handlePhotoCapture = useCallback(
    async (blob: Blob) => {
      setUploadState('uploading');
      setUploadError(null);

      try {
        const formData = new FormData();
        formData.append('file', blob, `${recipeSlug}-${Date.now()}.jpg`);
        formData.append('recipeId', recipeId);

        const response = await fetch('/api/photos/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data: { error?: string } = await response.json();
          throw new Error(data.error ?? 'Upload failed');
        }

        const data: { url: string } = await response.json();
        setUploadState('success');
        onPhotoUploaded?.(data.url);
      } catch (err) {
        setUploadState('error');
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
      }
    },
    [recipeId, recipeSlug, onPhotoUploaded],
  );

  const handleAudioRecorded = useCallback((_blob: Blob) => {
    // Audio storage will be implemented in a future PR.
    // For now, this captures the recording flow.
  }, []);

  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground">Capture</h3>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setCameraOpen(true)}>
          <CameraIcon />
          <span className="ml-2">Take Photo</span>
        </Button>
        <Button variant="outline" onClick={() => setAudioOpen(true)}>
          <MicIcon />
          <span className="ml-2">Record Note</span>
        </Button>
      </div>

      {/* Upload state feedback */}
      {uploadState === 'uploading' && (
        <p className="text-sm text-muted-foreground">Uploading photo...</p>
      )}
      {uploadState === 'success' && (
        <p className="text-sm text-green-600">Photo uploaded successfully!</p>
      )}
      {uploadState === 'error' && (
        <p className="text-sm text-red-600">{uploadError ?? 'Upload failed'}</p>
      )}

      {/* Camera modal */}
      <CameraCapture
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handlePhotoCapture}
      />

      {/* Audio recorder (inline) */}
      {audioOpen && (
        <AudioRecorder
          isOpen={audioOpen}
          onClose={() => setAudioOpen(false)}
          onRecorded={handleAudioRecorded}
        />
      )}
    </section>
  );
}

function CameraIcon() {
  return (
    <svg
      className="h-4 w-4"
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

function MicIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z"
      />
    </svg>
  );
}
