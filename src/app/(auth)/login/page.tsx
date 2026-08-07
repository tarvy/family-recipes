'use client';

/**
 * Login page with passkey authentication.
 */

import {
  browserSupportsWebAuthn,
  type PublicKeyCredentialRequestOptionsJSON,
  startAuthentication,
} from '@simplewebauthn/browser';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_token: 'This link is invalid or has already been used.',
  missing_token: 'Invalid login link.',
  server_error: 'Something went wrong. Please try again.',
  expired: 'This link has expired. Please request a new one.',
  not_allowed: 'This email is not approved to sign in.',
};

function isAuthenticationOptions(value: unknown): value is PublicKeyCredentialRequestOptionsJSON {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record['challenge'] === 'string';
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);

  const urlError = searchParams.get('error');
  const returnTo = searchParams.get('return_to');

  useEffect(() => {
    if (urlError) {
      setErrorMessage(ERROR_MESSAGES[urlError] || 'An error occurred. Please try again.');
    }
  }, [urlError]);

  useEffect(() => {
    setPasskeySupported(browserSupportsWebAuthn());
  }, []);

  async function handlePasskeySignIn(): Promise<void> {
    setPasskeyLoading(true);
    setPasskeyError(null);

    try {
      const optionsResponse = await fetch('/api/auth/passkey/authenticate', {
        method: 'POST',
      });

      if (!optionsResponse.ok) {
        throw new Error('Unable to start passkey sign-in.');
      }

      const optionsPayload = (await optionsResponse.json()) as { options?: unknown };

      if (!isAuthenticationOptions(optionsPayload.options)) {
        throw new Error('Passkey authentication options were missing.');
      }

      const assertion = await startAuthentication({ optionsJSON: optionsPayload.options });
      const verificationResponse = await fetch('/api/auth/passkey/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: assertion }),
      });

      if (!verificationResponse.ok) {
        const errorPayload = (await verificationResponse.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(errorPayload?.error || 'Passkey sign-in failed.');
      }

      router.push(returnTo ?? '/recipes');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Passkey sign-in failed.';
      setPasskeyError(message);
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Sign in to Family Recipes</h1>
        <p className="text-muted-foreground">Ask the owner for a one-time login link</p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {passkeyError && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {passkeyError}
        </div>
      )}

      <button
        type="button"
        onClick={handlePasskeySignIn}
        disabled={!passkeySupported || passkeyLoading}
        className="w-full rounded-lg border border-input bg-background px-4 py-3 font-medium text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {passkeyLoading ? 'Signing in...' : 'Sign in with passkey'}
      </button>

      {!passkeySupported && (
        <p className="mt-3 text-xs text-muted-foreground">
          Passkeys are not supported in this browser.
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
