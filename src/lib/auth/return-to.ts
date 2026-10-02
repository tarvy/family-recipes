/**
 * Post-login `return_to` handling.
 *
 * Login flows (magic link, passkey, middleware bounce) may send the user back
 * to the page that asked them to sign in - most importantly the OAuth consent
 * page at `/authorize?...`, which must survive login for MCP clients to finish
 * their authorization flow. To avoid open redirects, only same-origin relative
 * paths are accepted.
 *
 * Pure and dependency-free so it can run in middleware (edge), client
 * components, and Node route handlers alike.
 */

/** Query parameter name carrying the post-login destination. */
export const RETURN_TO_PARAM = 'return_to';

/** Default destination after login when no valid `return_to` is present. */
export const DEFAULT_POST_LOGIN_PATH = '/recipes';

/** Upper bound on accepted `return_to` length (keeps magic-link URLs sane). */
const MAX_RETURN_TO_LENGTH = 2048;

/** Placeholder origin used only to parse/normalize relative paths. */
const PARSE_BASE = 'http://return-to.invalid';

/** Paths that must never be used as a destination (would loop back to login). */
const DISALLOWED_PATH = '/login';

/** First printable ASCII code point; anything below is a C0 control char. */
const FIRST_PRINTABLE_CHAR_CODE = 0x20;

/** ASCII DEL control character. */
const DEL_CHAR_CODE = 0x7f;

function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code < FIRST_PRINTABLE_CHAR_CODE || code === DEL_CHAR_CODE) {
      return true;
    }
  }
  return false;
}

/**
 * Return `value` if it is a safe same-origin relative path, otherwise `null`.
 *
 * Accepted: must start with a single `/` (not `//` or `/\`), contain no
 * backslashes or control characters, stay on the same origin once parsed,
 * and not point at `/login` itself.
 */
export function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_RETURN_TO_LENGTH) {
    return null;
  }

  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return null;
  }

  if (hasControlCharacters(value)) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(value, PARSE_BASE);
  } catch {
    return null;
  }

  if (parsed.origin !== PARSE_BASE) {
    return null;
  }

  if (parsed.pathname === DISALLOWED_PATH || parsed.pathname.startsWith(`${DISALLOWED_PATH}/`)) {
    return null;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

/**
 * Resolve the post-login destination: a sanitized `return_to` or the default.
 */
export function resolvePostLoginPath(value: string | null | undefined): string {
  return sanitizeReturnTo(value) ?? DEFAULT_POST_LOGIN_PATH;
}
