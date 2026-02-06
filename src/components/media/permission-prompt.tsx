/**
 * Permission prompt displayed when camera/microphone access is denied.
 *
 * Shows a helpful message explaining why access is needed and
 * provides browser-specific instructions for re-enabling permissions.
 */

'use client';

import { Button } from '@/components/ui/button';
import type { MediaPermissionState } from '@/lib/media/use-media-stream';
import { CameraOffIcon, MicOffIcon } from './icons';

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

  const Icon = mediaType === 'camera' ? CameraOffIcon : MicOffIcon;

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg bg-card-nested p-6 text-center ring-1 ring-border">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
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
