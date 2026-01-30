'use client';

/**
 * OAuth Authorization Consent Page
 *
 * Displays requested scopes and allows user to approve/deny access.
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { OAUTH_SCOPES, type OAuthScope } from '@/lib/oauth';

type ConsentState = 'loading' | 'ready' | 'submitting' | 'error';

interface ConsentParams {
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  state?: string;
}

const SCOPE_ICONS: Record<OAuthScope, string> = {
  'recipes:read':
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  'shopping:read':
    'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
  'shopping:write': 'M12 6v6m0 0v6m0-6h6m-6 0H6',
};

/** SVG icon stroke width for consistent styling */
const ICON_STROKE_WIDTH = 2;

function isValidScope(scope: string): scope is OAuthScope {
  return scope in OAUTH_SCOPES;
}

function ConsentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ConsentState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<ConsentParams | null>(null);

  useEffect(() => {
    const clientId = searchParams.get('client_id');
    const redirectUri = searchParams.get('redirect_uri');
    const scope = searchParams.get('scope');
    const codeChallenge = searchParams.get('code_challenge');
    const stateParam = searchParams.get('state');

    if (!(clientId && redirectUri && scope && codeChallenge)) {
      setError('Invalid authorization request. Missing required parameters.');
      setState('error');
      return;
    }

    const newParams: ConsentParams = {
      clientId,
      redirectUri,
      scope,
      codeChallenge,
    };
    if (stateParam) {
      newParams.state = stateParam;
    }
    setParams(newParams);

    // Check if user is authenticated
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/status', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          // Redirect to login with return_to
          const returnTo = encodeURIComponent(window.location.href);
          router.push(`/login?return_to=${returnTo}`);
          return;
        }

        setState('ready');
      } catch {
        setError('Failed to verify authentication status.');
        setState('error');
      }
    }

    checkAuth();
  }, [searchParams, router]);

  async function handleSubmit(action: 'approve' | 'deny') {
    if (!params) {
      return;
    }

    setState('submitting');

    try {
      const formData = new FormData();
      formData.append('client_id', params.clientId);
      formData.append('redirect_uri', params.redirectUri);
      formData.append('scope', params.scope);
      formData.append('code_challenge', params.codeChallenge);
      if (params.state) {
        formData.append('state', params.state);
      }
      formData.append('action', action);

      const response = await fetch('/api/oauth/authorize', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      // The endpoint returns a redirect, so we follow it
      if (response.redirected) {
        window.location.href = response.url;
        return;
      }

      // Handle error response
      const result = (await response.json()) as { error?: string; error_description?: string };
      setError(result.error_description ?? result.error ?? 'Authorization failed');
      setState('error');
    } catch {
      setError('Authorization request failed. Please try again.');
      setState('error');
    }
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (state === 'error' || !params) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
            <svg
              className="w-12 h-12 text-destructive mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={ICON_STROKE_WIDTH}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-destructive mb-2">Authorization Error</h2>
            <p className="text-muted-foreground">{error ?? 'An unknown error occurred.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const scopes = params.scope.split(' ').filter(isValidScope);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-label="Authorization"
                role="img"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={ICON_STROKE_WIDTH}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-foreground">Authorize Application</h1>
            <p className="text-sm text-muted-foreground mt-1">
              An application is requesting access to your account
            </p>
          </div>

          {/* Client info */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Client ID:</span>{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">{params.clientId}</code>
            </p>
          </div>

          {/* Requested permissions */}
          <div className="mb-6">
            <h2 className="text-sm font-medium text-foreground mb-3">
              This application will be able to:
            </h2>
            <ul className="space-y-3">
              {scopes.map((scope) => (
                <li key={scope} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={ICON_STROKE_WIDTH}
                        d={SCOPE_ICONS[scope]}
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{scope}</p>
                    <p className="text-xs text-muted-foreground">{OAUTH_SCOPES[scope]}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleSubmit('deny')}
              disabled={state === 'submitting'}
              className="flex-1 py-2.5 px-4 border border-input rounded-lg bg-background text-foreground font-medium hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Deny
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('approve')}
              disabled={state === 'submitting'}
              className="flex-1 py-2.5 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {state === 'submitting' ? 'Authorizing...' : 'Authorize'}
            </button>
          </div>

          {/* Security notice */}
          <p className="mt-4 text-xs text-muted-foreground text-center">
            Authorizing will redirect you back to the application
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthorizePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      }
    >
      <ConsentForm />
    </Suspense>
  );
}
