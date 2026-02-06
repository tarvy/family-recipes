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
import { CameraIcon, MicIcon } from './icons';

interface MediaCaptureSectionProps {
  /** Recipe slug for associating uploads */
  recipeSlug: string;
  /** Callback when a photo is uploaded successfully */
  onPhotoUploaded?: (url: string) => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function MediaCaptureSection({ recipeSlug, onPhotoUploaded }: MediaCaptureSectionProps) {
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
        formData.append('recipeSlug', recipeSlug);

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
    [recipeSlug, onPhotoUploaded],
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
