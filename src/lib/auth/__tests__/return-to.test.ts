import { describe, expect, it } from 'vitest';

import { DEFAULT_POST_LOGIN_PATH, resolvePostLoginPath, sanitizeReturnTo } from '../return-to';

describe('sanitizeReturnTo', () => {
  it('accepts same-origin relative paths, keeping query strings', () => {
    expect(sanitizeReturnTo('/recipes')).toBe('/recipes');
    const consent =
      '/authorize?client_id=abc&redirect_uri=cursor%3A%2F%2Fanysphere.cursor-mcp%2Foauth%2Fcallback&scope=recipes%3Aread&code_challenge=xyz&state=s1';
    expect(sanitizeReturnTo(consent)).toBe(consent);
  });

  it.each([
    ['empty', ''],
    ['absolute https URL', 'https://evil.example/authorize'],
    ['protocol-relative URL', '//evil.example/path'],
    ['backslash host trick', '/\\evil.example'],
    ['embedded backslash', '/foo\\bar'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['relative without leading slash', 'recipes'],
    ['tab smuggling', '/\t/evil.example'],
    ['newline', '/recipes\n'],
    ['login page (would loop)', '/login?return_to=/recipes'],
    ['login subpath', '/login/'],
    ['overly long', `/${'a'.repeat(5000)}`],
  ])('rejects %s', (_label, value) => {
    expect(sanitizeReturnTo(value)).toBeNull();
  });

  it('rejects non-string values', () => {
    expect(sanitizeReturnTo(null)).toBeNull();
    expect(sanitizeReturnTo(undefined)).toBeNull();
  });
});

describe('resolvePostLoginPath', () => {
  it('falls back to the default for unsafe values', () => {
    expect(resolvePostLoginPath('https://evil.example')).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(resolvePostLoginPath(null)).toBe(DEFAULT_POST_LOGIN_PATH);
  });

  it('returns safe values unchanged', () => {
    expect(resolvePostLoginPath('/authorize?client_id=abc')).toBe('/authorize?client_id=abc');
  });
});
