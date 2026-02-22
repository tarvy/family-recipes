/**
 * Invisible client component that sets the random-recipes cookie.
 *
 * Rendered when the server generates a fresh random set (no existing cookie).
 * Sets the cookie via useEffect so subsequent page loads get stable results.
 */

'use client';

import { useEffect } from 'react';
import {
  RANDOM_COOKIE_MAX_AGE_SECONDS,
  RANDOM_RECIPES_COOKIE_NAME,
} from '@/lib/constants/random-recipes';
import { MS_PER_SECOND } from '@/lib/constants/time';

interface RandomRecipeCookieSetterProps {
  slugs: string[];
}

export function RandomRecipeCookieSetter({ slugs }: RandomRecipeCookieSetterProps) {
  useEffect(() => {
    const value = JSON.stringify(slugs);
    const expiresAt = Date.now() + RANDOM_COOKIE_MAX_AGE_SECONDS * MS_PER_SECOND;
    cookieStore
      .set({
        name: RANDOM_RECIPES_COOKIE_NAME,
        value: encodeURIComponent(value),
        path: '/',
        expires: expiresAt,
        sameSite: 'lax',
      })
      .catch(() => {});
  }, [slugs]);

  return null;
}
