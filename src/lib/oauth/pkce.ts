/**
 * PKCE (Proof Key for Code Exchange) implementation for OAuth 2.1.
 *
 * Only S256 method is supported as per OAuth 2.1 requirements.
 */

import { sha256Base64Url, timingSafeEqual } from './crypto';

/** Minimum code verifier length per RFC 7636 */
const MIN_VERIFIER_LENGTH = 43;

/** Maximum code verifier length per RFC 7636 */
const MAX_VERIFIER_LENGTH = 128;

/** Allowed characters in code verifier: [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~" */
const VERIFIER_REGEX = /^[A-Za-z0-9\-._~]+$/;

/**
 * Verify that a code verifier matches the stored code challenge.
 *
 * Uses S256 method: BASE64URL(SHA256(code_verifier)) == code_challenge
 *
 * @param verifier - The code_verifier provided in token request
 * @param challenge - The code_challenge stored during authorization
 * @returns true if verifier matches challenge, false otherwise
 */
export function verifyCodeChallenge(verifier: string, challenge: string): boolean {
  if (!isValidVerifier(verifier)) {
    return false;
  }

  const computedChallenge = sha256Base64Url(verifier);
  return timingSafeEqual(computedChallenge, challenge);
}

/**
 * Validate code verifier format per RFC 7636.
 */
export function isValidVerifier(verifier: string): boolean {
  if (typeof verifier !== 'string') {
    return false;
  }

  if (verifier.length < MIN_VERIFIER_LENGTH || verifier.length > MAX_VERIFIER_LENGTH) {
    return false;
  }

  return VERIFIER_REGEX.test(verifier);
}

/**
 * Validate that the code challenge method is S256.
 * OAuth 2.1 only allows S256 (plain is deprecated).
 */
export function isValidChallengeMethod(method: string): boolean {
  return method === 'S256';
}
