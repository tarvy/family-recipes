'use client';

import {
  browserSupportsWebAuthn,
  type PublicKeyCredentialCreationOptionsJSON,
  startRegistration,
} from '@simplewebauthn/browser';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Card } from '@/components/ui';

interface PasskeySummary {
  id: string;
  createdAt: string;
  lastUsedAt?: string | null;
  deviceType?: string;
  backedUp: boolean;
  transports: string[];
}

interface PasskeyManagerProps {
  initialPasskeys: PasskeySummary[];
}

function isRegistrationOptions(value: unknown): value is PublicKeyCredentialCreationOptionsJSON {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record['challenge'] === 'string';
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return 'Never';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return date.toLocaleString();
}

export function PasskeyManager({ initialPasskeys }: PasskeyManagerProps) {
  const router = useRouter();
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsSupported(browserSupportsWebAuthn());
  }, []);

  async function handleRegister() {
    setIsRegistering(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const optionsResponse = await fetch('/api/auth/passkey/register', {
        method: 'POST',
      });

      if (!optionsResponse.ok) {
        throw new Error('Unable to start passkey registration.');
      }

      const optionsPayload = (await optionsResponse.json()) as { options?: unknown };

      if (!isRegistrationOptions(optionsPayload.options)) {
        throw new Error('Passkey registration options were missing.');
      }

      const attestation = await startRegistration({
        optionsJSON: optionsPayload.options,
      });

      const verificationResponse = await fetch('/api/auth/passkey/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: attestation }),
      });

      if (!verificationResponse.ok) {
        const errorPayload = (await verificationResponse.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(errorPayload?.error || 'Passkey registration failed.');
      }

      setSuccessMessage('Passkey added successfully.');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Passkey registration failed.';
      setErrorMessage(message);
    } finally {
      setIsRegistering(false);
    }
  }

  return (
    <Card variant="section" className="mt-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Passkeys</h2>
          <p className="text-sm text-muted-foreground">
            Register a passkey to sign in faster on this device.
          </p>
        </div>
        <Button type="button" onClick={handleRegister} disabled={!isSupported || isRegistering}>
          {isRegistering ? 'Creating...' : 'Add passkey'}
        </Button>
      </div>

      {!isSupported && (
        <div className="mt-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          Passkeys are not supported in this browser.
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mt-4 rounded-md border border-border bg-secondary p-3 text-sm text-secondary-foreground">
          {successMessage}
        </div>
      )}

      <div className="mt-6">
        {initialPasskeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No passkeys registered yet.</p>
        ) : (
          <ul className="space-y-4">
            {initialPasskeys.map((passkey) => (
              <li
                key={passkey.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-background p-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                    {passkey.deviceType || 'device'}
                  </span>
                  <span className="text-muted-foreground">
                    Added: <span className="text-foreground">{formatDate(passkey.createdAt)}</span>
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last used:{' '}
                  <span className="text-foreground">{formatDate(passkey.lastUsedAt)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Backed up:{' '}
                  <span className="text-foreground">{passkey.backedUp ? 'Yes' : 'No'}</span>
                </div>
                {passkey.transports.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Transports:{' '}
                    <span className="text-foreground">{passkey.transports.join(', ')}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
