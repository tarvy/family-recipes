'use client';

/**
 * Login page with magic link authentication
 */

import {
  browserSupportsWebAuthn,
  type PublicKeyCredentialRequestOptionsJSON,
  startAuthentication,
} from '@simplewebauthn/browser';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

type FormState = 'idle' | 'loading' | 'success' | 'error';

/** Magic link expiry time in minutes - must match TOKEN_EXPIRY_MINUTES in magic-link.ts */
const MAGIC_LINK_EXPIRY_MINUTES = 15;

/** SVG icon stroke width for consistent styling */
const ICON_STROKE_WIDTH = 2;

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
  const [email, setEmail] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);

  // Check for error from redirect
  const urlError = searchParams.get('error');

  useEffect(() => {
    if (urlError) {
      setErrorMessage(ERROR_MESSAGES[urlError] || 'An error occurred. Please try again.');
    }
  }, [urlError]);

  useEffect(() => {
    setPasskeySupported(browserSupportsWebAuthn());
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      return;
    }

    setFormState('loading');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      setFormState('success');
    } catch {
      setFormState('error');
      setErrorMessage('Failed to send login link. Please try again.');
    }
  }

  async function handlePasskeySignIn() {
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

      router.push('/');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Passkey sign-in failed.';
      setPasskeyError(message);
    } finally {
      setPasskeyLoading(false);
    }
  }

  if (formState === 'success') {
    return (
      <div className="text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-label="Email sent"
              role="img"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={ICON_STROKE_WIDTH}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          We sent a login link to <strong className="text-foreground">{email}</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          Click the link in the email to sign in. The link expires in {MAGIC_LINK_EXPIRY_MINUTES}{' '}
          minutes.
        </p>
        <button
          type="button"
          onClick={() => {
            setFormState('idle');
            setEmail('');
          }}
          className="mt-6 text-sm text-primary hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Sign in to Family Recipes</h1>
        <p className="text-muted-foreground">Enter your email to receive a magic link</p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
            Email address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            disabled={formState === 'loading'}
            className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={formState === 'loading' || !email.trim()}
          className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {formState === 'loading' ? 'Sending...' : 'Send magic link'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {passkeyError && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {passkeyError}
        </div>
      )}

      <button
        type="button"
        onClick={handlePasskeySignIn}
        disabled={!passkeySupported || passkeyLoading}
        className="w-full py-3 px-4 border border-input rounded-lg bg-background text-foreground font-medium hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
