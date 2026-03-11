/**
 * Authentication module exports
 *
 * Usage:
 *   import {
 *     generateMagicLink,
 *     verifyMagicLink,
 *     createSession,
 *     validateSession,
 *     deleteSession,
 *     getSessionFromCookies,
 *     SESSION_COOKIE_NAME,
 *     SESSION_COOKIE_OPTIONS,
 *   } from '@/lib/auth';
 */

export { isFamilyRole } from './authorization';
export type { GenerateMagicLinkResult, VerifyMagicLinkResult } from './magic-link';
export { generateMagicLink, verifyMagicLink } from './magic-link';
export type { CreateSessionResult, SessionUser, ValidateSessionResult } from './session';
export {
  createSession,
  deleteSession,
  getSessionFromCookies,
  getSessionFromRequest,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  validateSession,
} from './session';
