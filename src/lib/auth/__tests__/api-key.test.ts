/**
 * Device keys: a minted token authenticates its owner; a wrong secret, a
 * revoked key, a non-device bearer token, or a demoted owner does not.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { setupMemoryMongo } from '@/db/__tests__/memory-mongo';
import { User } from '@/db/models/user.model';
import { authenticateApiKey, listApiKeys, mintApiKey, revokeApiKey } from '@/lib/auth/api-key';

setupMemoryMongo();

const EMAIL = 'sam@family.example';

function requestWith(authorization: string | null): Request {
  const headers = new Headers();
  if (authorization !== null) {
    headers.set('Authorization', authorization);
  }
  return new Request('https://recipes.example/api/captures', { method: 'POST', headers });
}

function withWrongSecret(token: string): string {
  const last = token.slice(-1);
  return `${token.slice(0, -1)}${last === 'A' ? 'B' : 'A'}`;
}

async function mint(): Promise<{ keyId: string; token: string }> {
  return mintApiKey({ email: EMAIL, label: "Sam's iPhone", scopes: ['captures:write'] });
}

beforeEach(async () => {
  await User.create({ email: EMAIL, role: 'family' });
});

describe('authenticateApiKey', () => {
  it('accepts the minted token and names its owner', async () => {
    const { keyId, token } = await mint();
    const user = await User.findOne({ email: EMAIL });

    const auth = await authenticateApiKey(requestWith(`Bearer ${token}`), 'captures:write');

    expect(auth).toEqual({ ok: true, principal: { keyId, userId: user?.id } });
    const [summary] = await listApiKeys();
    expect(summary?.lastUsedAt).toBeInstanceOf(Date);
  });

  it('rejects the right key id with a wrong secret', async () => {
    const { token } = await mint();

    const auth = await authenticateApiKey(
      requestWith(`Bearer ${withWrongSecret(token)}`),
      'captures:write',
    );

    expect(auth).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects a missing header and a non-device bearer token', async () => {
    expect(await authenticateApiKey(requestWith(null), 'captures:write')).toEqual({
      ok: false,
      reason: 'missing',
    });
    expect(
      await authenticateApiKey(requestWith('Bearer mcp-oauth-token'), 'captures:write'),
    ).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects a revoked key', async () => {
    const { keyId, token } = await mint();

    expect(await revokeApiKey(keyId)).toBe(true);
    expect(await revokeApiKey(keyId)).toBe(true);
    expect(await revokeApiKey('no-such-key-id00')).toBe(false);

    const auth = await authenticateApiKey(requestWith(`Bearer ${token}`), 'captures:write');
    expect(auth).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects a key whose owner was demoted to friend', async () => {
    const { token } = await mint();
    await User.updateOne({ email: EMAIL }, { $set: { role: 'friend' } });

    const auth = await authenticateApiKey(requestWith(`Bearer ${token}`), 'captures:write');

    expect(auth).toEqual({ ok: false, reason: 'forbidden_role' });
  });
});

describe('mintApiKey', () => {
  it('refuses an email with no family user', async () => {
    await expect(
      mintApiKey({ email: 'stranger@example.com', label: 'Phone', scopes: ['captures:write'] }),
    ).rejects.toThrow('must sign in once first');
  });
});
