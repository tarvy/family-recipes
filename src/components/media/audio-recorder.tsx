/**
 * Audio recorder component using MediaRecorder API.
 *
 * Provides a UI for recording short audio notes, with a recording
 * indicator showing elapsed time, and playback controls for reviewing
 * the recording before saving or discarding.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useMediaStream } from '@/lib/media/use-media-stream';
import { PermissionPrompt } from './permission-prompt';

/** Interval for updating the recording timer display (ms) */
const TIMER_INTERVAL_MS = 1000;

/** Seconds per minute for time formatting */
const SECONDS_PER_MINUTE = 60;

/** SVG icon stroke width */
const ICON_STROKE_WIDTH = 2;

interface AudioRecorderProps {
  /** Whether the recorder is open */
  isOpen: boolean;
  /** Callback when recorder is closed */
  onClose: () => void;
  /** Callback when audio is recorded and confirmed */
  onRecorded: (blob: Blob) => void;
}

type RecorderState = 'idle' | 'recording' | 'recorded';

export function AudioRecorder({ isOpen, onClose, onRecorded }: AudioRecorderProps) {
  const [recorderState, setRecorderState] = useState<RecorderState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const isRecordingRef = useRef(false);

  // Keep audioUrlRef in sync for cleanup in callbacks
  audioUrlRef.current = audioUrl;

  const { stream, permissionState, start, stop } = useMediaStream({
    constraints: { audio: true, video: false },
  });

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const revokeAudioUrl = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
      setAudioUrl(null);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    clearTimer();
    isRecordingRef.current = false;
    stop();
  }, [stop, clearTimer]);

  const resetState = useCallback(() => {
    setRecorderState('idle');
    setElapsedSeconds(0);
    setAudioBlob(null);
    revokeAudioUrl();
    chunksRef.current = [];
    isRecordingRef.current = false;
  }, [revokeAudioUrl]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      stopRecording();
      resetState();
    }
  }, [isOpen, stopRecording, resetState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, [clearTimer]);

  const handleStartRecording = useCallback(async () => {
    resetState();
    await start();
  }, [start, resetState]);

  // When stream becomes available, start the MediaRecorder
  useEffect(() => {
    if (!stream || isRecordingRef.current) {
      return;
    }

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      setAudioBlob(blob);
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      setAudioUrl(url);
      setRecorderState('recorded');
    };

    recorder.start();
    isRecordingRef.current = true;
    setRecorderState('recording');
    setElapsedSeconds(0);

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, TIMER_INTERVAL_MS);
  }, [stream]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleDiscard = useCallback(() => {
    resetState();
  }, [resetState]);

  const handleSave = useCallback(() => {
    if (audioBlob) {
      onRecorded(audioBlob);
      onClose();
    }
  }, [audioBlob, onRecorded, onClose]);

  const handleClose = useCallback(() => {
    stopRecording();
    resetState();
    onClose();
  }, [onClose, stopRecording, resetState]);

  if (!isOpen) {
    return null;
  }

  const minutes = Math.floor(elapsedSeconds / SECONDS_PER_MINUTE);
  const seconds = elapsedSeconds % SECONDS_PER_MINUTE;
  const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="rounded-lg bg-card-nested p-4 ring-1 ring-border">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Audio Note</h3>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close recorder"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Permission denied state */}
      {(permissionState === 'denied' || permissionState === 'unavailable') && (
        <div className="mt-3">
          <PermissionPrompt
            permissionState={permissionState}
            mediaType="microphone"
            onRetry={start}
          />
        </div>
      )}

      {/* Idle state */}
      {recorderState === 'idle' &&
        permissionState !== 'denied' &&
        permissionState !== 'unavailable' && (
          <div className="mt-4 flex justify-center">
            <Button variant="primary" onClick={handleStartRecording}>
              <MicIcon />
              <span className="ml-2">Start Recording</span>
            </Button>
          </div>
        )}

      {/* Recording state */}
      {recorderState === 'recording' && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
            <span className="font-mono text-lg text-foreground">{timeDisplay}</span>
          </div>
          <Button variant="destructive" onClick={handleStopRecording}>
            Stop Recording
          </Button>
        </div>
      )}

      {/* Recorded state with playback */}
      {recorderState === 'recorded' && audioUrl && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <audio controls src={audioUrl} className="w-full">
            <track kind="captions" />
          </audio>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleDiscard}>
              Discard
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save Note
            </Button>
          </div>
        </div>
      )}
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

function MicIcon() {
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
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z"
      />
    </svg>
  );
}
