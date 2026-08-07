'use client';

import { useState } from 'react';
import { Button, Card } from '@/components/ui';

interface ManualMagicLinkResponse {
  url?: string;
  expiresAt?: string;
  error?: string;
}

export function ManualMagicLinkForm() {
  const [email, setEmail] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsGenerating(true);
    setLink(null);
    setExpiresAt(null);
    setErrorMessage(null);
    setIsCopied(false);

    try {
      const response = await fetch('/api/admin/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as ManualMagicLinkResponse;

      if (!response.ok || !payload.url || !payload.expiresAt) {
        throw new Error(getErrorMessage(payload.error));
      }

      setLink(payload.url);
      setExpiresAt(payload.expiresAt);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to generate a login link.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy(): Promise<void> {
    if (!link) {
      return;
    }

    await navigator.clipboard.writeText(link);
    setIsCopied(true);
  }

  return (
    <Card variant="section" className="mt-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Manual login link</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a one-time link to distribute directly. It expires in 15 minutes.
        </p>
      </div>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-foreground" htmlFor="magic-link-email">
          Allowlisted email
        </label>
        <input
          id="magic-link-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="person@example.com"
          required
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="submit" disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate login link'}
        </Button>
      </form>

      {errorMessage && (
        <p className="mt-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      {link && expiresAt && (
        <div className="mt-4 space-y-3 rounded-md border border-border bg-secondary p-3">
          <p className="break-all text-sm text-secondary-foreground">{link}</p>
          <p className="text-xs text-muted-foreground">
            Expires {new Date(expiresAt).toLocaleString()}
          </p>
          <Button type="button" onClick={handleCopy}>
            {isCopied ? 'Copied' : 'Copy link'}
          </Button>
        </div>
      )}
    </Card>
  );
}

function getErrorMessage(error?: string): string {
  switch (error) {
    case 'forbidden':
      return 'Only the owner can generate login links.';
    case 'invalid_email':
      return 'Enter a valid email address.';
    case 'not_allowed':
      return 'That email is not on the allowlist.';
    default:
      return 'Unable to generate a login link.';
  }
}
