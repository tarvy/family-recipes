import { describe, expect, it } from 'vitest';

import { getToolScopes, OAUTH_SCOPES, parseScopes, TOOL_SCOPES, VALID_SCOPES } from '../types';

describe('OAUTH_SCOPES (mail scope regression)', () => {
  it('does not include the temporary Newt mail scopes', () => {
    expect(Object.keys(OAUTH_SCOPES)).not.toContain('mail:read');
    expect(Object.keys(OAUTH_SCOPES)).not.toContain('mail:write');
    expect(VALID_SCOPES).not.toContain('mail:read');
    expect(VALID_SCOPES).not.toContain('mail:write');
  });

  it('retains the recipes and shopping scopes', () => {
    expect(VALID_SCOPES).toEqual(
      expect.arrayContaining(['recipes:read', 'recipes:write', 'shopping:read', 'shopping:write']),
    );
  });

  it('does not require any tool to hold a mail scope', () => {
    for (const scopes of Object.values(TOOL_SCOPES)) {
      expect(scopes).not.toContain('mail:read');
      expect(scopes).not.toContain('mail:write');
    }
  });
});

describe('parseScopes', () => {
  it('drops unknown/legacy mail scopes from a requested scope string', () => {
    expect(parseScopes('recipes:read mail:read shopping:write')).toEqual([
      'recipes:read',
      'shopping:write',
    ]);
  });

  it('returns an empty array for an undefined scope string', () => {
    expect(parseScopes(undefined)).toEqual([]);
  });
});

describe('getToolScopes', () => {
  it('returns the required scopes for a known tool', () => {
    expect(getToolScopes('recipe_create')).toEqual(['recipes:write']);
  });

  it('returns an empty array for an unknown tool', () => {
    expect(getToolScopes('mail_send')).toEqual([]);
  });
});
