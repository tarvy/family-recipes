/**
 * React hook for managing MediaStream lifecycle via getUserMedia.
 *
 * Wraps the W3C Media Capture and Streams API to provide a clean
 * interface for requesting camera/microphone access, handling
 * permissions, and cleaning up streams on unmount.
 *
 * Usage:
 *   const { stream, error, permissionState, start, stop, switchCamera } =
 *     useMediaStream({ video: { facingMode: 'environment' } });
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Possible states for media permission */
export type MediaPermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable';

/** Error types that can occur during media stream operations */
export type MediaStreamErrorType =
  | 'NotAllowedError'
  | 'NotFoundError'
  | 'NotReadableError'
  | 'OverconstrainedError'
  | 'TypeError'
  | 'unknown';

export interface MediaStreamError {
  type: MediaStreamErrorType;
  message: string;
}

export interface UseMediaStreamOptions {
  /** MediaStreamConstraints for getUserMedia */
  constraints: MediaStreamConstraints;
  /** Whether to start the stream immediately on mount */
  autoStart?: boolean;
}

export interface UseMediaStreamResult {
  /** The active MediaStream, or null if not started */
  stream: MediaStream | null;
  /** Error information if stream failed to start */
  error: MediaStreamError | null;
  /** Current permission state */
  permissionState: MediaPermissionState;
  /** Whether the stream is currently active */
  isActive: boolean;
  /** Start the media stream */
  start: () => Promise<void>;
  /** Stop the media stream and release all tracks */
  stop: () => void;
  /** Switch between front and rear cameras */
  switchCamera: () => Promise<void>;
}

/**
 * Map a DOMException name to a typed error
 */
function mapError(error: unknown): MediaStreamError {
  if (error instanceof DOMException) {
    const knownTypes: MediaStreamErrorType[] = [
      'NotAllowedError',
      'NotFoundError',
      'NotReadableError',
      'OverconstrainedError',
      'TypeError',
    ];
    const type = knownTypes.includes(error.name as MediaStreamErrorType)
      ? (error.name as MediaStreamErrorType)
      : 'unknown';
    return { type, message: error.message };
  }
  if (error instanceof Error) {
    return { type: 'unknown', message: error.message };
  }
  return { type: 'unknown', message: 'An unknown error occurred' };
}

/**
 * Check if getUserMedia is available in the current browser
 */
function isMediaSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

export function useMediaStream({
  constraints,
  autoStart = false,
}: UseMediaStreamOptions): UseMediaStreamResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<MediaStreamError | null>(null);
  const [permissionState, setPermissionState] = useState<MediaPermissionState>('prompt');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const streamRef = useRef<MediaStream | null>(null);
  const constraintsRef = useRef(constraints);
  constraintsRef.current = constraints;

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  const startStream = useCallback(
    async (overrideFacingMode?: 'user' | 'environment') => {
      if (!isMediaSupported()) {
        setPermissionState('unavailable');
        setError({ type: 'unknown', message: 'Media devices are not supported in this browser' });
        return;
      }

      // Stop any existing stream first
      stopStream();
      setError(null);

      const currentFacing = overrideFacingMode ?? facingMode;
      const currentConstraints = { ...constraintsRef.current };

      // Apply facingMode if video constraints are present
      if (currentConstraints.video && typeof currentConstraints.video === 'object') {
        currentConstraints.video = { ...currentConstraints.video, facingMode: currentFacing };
      } else if (currentConstraints.video === true) {
        currentConstraints.video = { facingMode: currentFacing };
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia(currentConstraints);
        streamRef.current = mediaStream;
        setStream(mediaStream);
        setPermissionState('granted');
        setError(null);
      } catch (err) {
        const mappedError = mapError(err);
        setError(mappedError);

        if (mappedError.type === 'NotAllowedError') {
          setPermissionState('denied');
        }
      }
    },
    [facingMode, stopStream],
  );

  const switchCamera = useCallback(async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    if (streamRef.current) {
      await startStream(newFacing);
    }
  }, [facingMode, startStream]);

  // Auto-start if requested
  useEffect(() => {
    if (autoStart) {
      startStream().catch(() => {});
    }
  }, [autoStart, startStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    stream,
    error,
    permissionState,
    isActive: stream !== null,
    start: startStream,
    stop: stopStream,
    switchCamera,
  };
}
