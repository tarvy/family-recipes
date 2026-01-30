/**
 * Cryptographic utilities for OAuth.
 */

import crypto from 'node:crypto';

/**
 * Compute SHA-256 hash of a string, returned as hex.
 */
export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Compute SHA-256 hash of a string, returned as base64url.
 */
export function sha256Base64Url(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('base64url');
}

/**
 * Timing-safe string comparison.
 * Returns true if strings are equal, false otherwise.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generate a cryptographically secure random string.
 */
export function generateSecureToken(length: number): string {
  // Use nanoid-compatible alphabet for URL-safe tokens
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const bytes = crypto.randomBytes(length);
  let result = '';

  for (const byte of bytes) {
    result += alphabet[byte % alphabet.length];
  }

  return result;
}
