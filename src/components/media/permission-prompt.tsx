/**
 * Permission prompt displayed when camera/microphone access is denied.
 *
 * Shows a helpful message explaining why access is needed and
 * provides browser-specific instructions for re-enabling permissions.
 */

'use client';

import { Button } from '@/components/ui/button';
import type { MediaPermissionState } from '@/lib/media/use-media-stream';

interface PermissionPromptProps {
  /** Current permission state */
  permissionState: MediaPermissionState;
  /** Type of media access needed */
  mediaType: 'camera' | 'microphone';
  /** Callback to retry requesting permission */
  onRetry: () => void;
}

export function PermissionPrompt({ permissionState, mediaType, onRetry }: PermissionPromptProps) {
  if (permissionState === 'granted' || permissionState === 'prompt') {
    return null;
  }

  const icon = mediaType === 'camera' ? CameraOffIcon : MicOffIcon;

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg bg-card-nested p-6 text-center ring-1 ring-border">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {icon()}
      </div>

      {permissionState === 'denied' && (
        <>
          <div>
            <h3 className="font-semibold text-foreground">
              {mediaType === 'camera' ? 'Camera' : 'Microphone'} Access Denied
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              To use this feature, please enable {mediaType} access in your browser settings.
            </p>
          </div>
          <div className="rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
            <p className="font-medium text-foreground">How to enable:</p>
            <ol className="mt-1 list-inside list-decimal space-y-1">
              <li>Click the lock or site settings icon in your browser address bar</li>
              <li>
                Find &quot;{mediaType === 'camera' ? 'Camera' : 'Microphone'}&quot; permission
              </li>
              <li>Change it to &quot;Allow&quot;</li>
              <li>Refresh the page</li>
            </ol>
          </div>
          <Button variant="outline" onClick={onRetry}>
            Try Again
          </Button>
        </>
      )}

      {permissionState === 'unavailable' && (
        <div>
          <h3 className="font-semibold text-foreground">
            {mediaType === 'camera' ? 'Camera' : 'Microphone'} Not Available
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Your browser or device does not support {mediaType} access. Please try using a modern
            browser like Chrome, Firefox, or Safari.
          </p>
        </div>
      )}
    </div>
  );
}

/** SVG icon stroke width */
const ICON_STROKE_WIDTH = 2;

function CameraOffIcon() {
  return (
    <svg
      className="h-6 w-6 text-muted-foreground"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg
      className="h-6 w-6 text-muted-foreground"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M19 19l-7-7m0 0l-7-7m7 7h8m-8 0V5a2 2 0 00-4 0v6"
      />
    </svg>
  );
}
