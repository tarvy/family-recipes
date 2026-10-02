import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildVerificationUrl } from '../magic-link';

const APP_URL = 'https://recipes.example';
const APP_URL_ENV = 'NEXT_PUBLIC_APP_URL';

describe('buildVerificationUrl', () => {
  const original = process.env[APP_URL_ENV];

  beforeEach(() => {
    process.env[APP_URL_ENV] = APP_URL;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env[APP_URL_ENV];
    } else {
      process.env[APP_URL_ENV] = original;
    }
  });

  it('builds a plain verify URL without return_to', () => {
    expect(buildVerificationUrl('tok123')).toBe(`${APP_URL}/api/auth/verify?token=tok123`);
  });

  it('carries a safe return_to (e.g. the OAuth consent page) through the link', () => {
    const returnTo = '/authorize?client_id=abc&scope=recipes%3Aread&code_challenge=xyz';
    const url = new URL(buildVerificationUrl('tok123', returnTo));
    expect(url.origin).toBe(APP_URL);
    expect(url.pathname).toBe('/api/auth/verify');
    expect(url.searchParams.get('token')).toBe('tok123');
    expect(url.searchParams.get('return_to')).toBe(returnTo);
  });

  it('drops unsafe return_to values', () => {
    const url = new URL(buildVerificationUrl('tok123', 'https://evil.example/'));
    expect(url.searchParams.has('return_to')).toBe(false);
  });
});
