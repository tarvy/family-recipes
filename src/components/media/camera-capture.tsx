/**
 * Camera capture component with live viewfinder and photo capture.
 *
 * Opens as a modal overlay, shows a live camera preview via getUserMedia,
 * and allows capturing a still image from the video stream. Uses a hidden
 * canvas element to extract JPEG data from the video feed.
 */

'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useMediaStream } from '@/lib/media/use-media-stream';
import { PermissionPrompt } from './permission-prompt';

/** JPEG quality for captured photos (0-1 range) */
const JPEG_QUALITY = 0.85;

interface CameraCaptureProps {
  /** Whether the camera modal is open */
  isOpen: boolean;
  /** Callback when the modal is closed */
  onClose: () => void;
  /** Callback when a photo is captured and confirmed */
  onCapture: (blob: Blob) => void;
}

/** SVG icon stroke width for consistent styling */
const ICON_STROKE_WIDTH = 2;

export function CameraCapture({ isOpen, onClose, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { stream, error, permissionState, isActive, start, stop, switchCamera } = useMediaStream({
    constraints: {
      video: { facingMode: 'environment' },
      audio: false,
    },
  });

  // Connect stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      start().catch(() => {});
    } else {
      stop();
      setCapturedBlob(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  }, [isOpen, start, stop, previewUrl]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!(video && canvas)) {
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          setPreviewUrl(URL.createObjectURL(blob));
        }
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  }, []);

  const handleRetake = useCallback(() => {
    setCapturedBlob(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  const handleUsePhoto = useCallback(() => {
    if (capturedBlob) {
      onCapture(capturedBlob);
      onClose();
    }
  }, [capturedBlob, onCapture, onClose]);

  const handleClose = useCallback(() => {
    stop();
    setCapturedBlob(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onClose();
  }, [stop, onClose, previewUrl]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-lg bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-semibold text-foreground">Take Photo</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label="Close camera"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Camera area */}
        <div className="relative aspect-[4/3] w-full bg-black">
          {/* Permission denied / error state */}
          {(permissionState === 'denied' || permissionState === 'unavailable') && (
            <div className="flex h-full items-center justify-center p-4">
              <PermissionPrompt
                permissionState={permissionState}
                mediaType="camera"
                onRetry={start}
              />
            </div>
          )}

          {/* Error state */}
          {error && permissionState !== 'denied' && permissionState !== 'unavailable' && (
            <div className="flex h-full items-center justify-center p-4">
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          )}

          {/* Live video preview */}
          {!previewUrl && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover ${isActive && !error ? '' : 'hidden'}`}
            />
          )}

          {/* Captured photo preview */}
          {previewUrl && (
            <Image
              src={previewUrl}
              alt="Captured preview"
              fill
              unoptimized
              className="object-cover"
            />
          )}

          {/* Hidden canvas for image capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 border-t border-border px-4 py-4">
          {previewUrl ? (
            <>
              <Button variant="ghost" onClick={handleRetake}>
                Retake
              </Button>
              <Button variant="primary" onClick={handleUsePhoto}>
                Use Photo
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={switchCamera}
                disabled={!isActive}
                aria-label="Switch camera"
              >
                <SwitchCameraIcon />
              </Button>
              <button
                type="button"
                onClick={handleCapture}
                disabled={!isActive}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                aria-label="Take photo"
              >
                <div className="h-12 w-12 rounded-full border-2 border-gray-300" />
              </button>
              <div className="h-8 w-8" /> {/* Spacer for alignment */}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function SwitchCameraIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}
