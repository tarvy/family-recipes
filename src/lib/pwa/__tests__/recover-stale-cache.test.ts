import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isStaleChunkError,
  recoverFromStaleChunkError,
  STALE_CACHE_RECOVERY_FLAG,
} from '../recover-stale-cache';

describe('isStaleChunkError', () => {
  it('detects ChunkLoadError by name', () => {
    const error = new Error('Loading failed');
    error.name = 'ChunkLoadError';
    expect(isStaleChunkError(error)).toBe(true);
  });

  it('detects common dynamic import failure messages', () => {
    expect(isStaleChunkError(new Error('Failed to fetch dynamically imported module'))).toBe(true);
    expect(isStaleChunkError(new Error('Importing a module script failed'))).toBe(true);
    expect(isStaleChunkError(new Error('Loading chunk app/page failed'))).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isStaleChunkError(new Error('Network request failed'))).toBe(false);
    expect(isStaleChunkError(null)).toBe(false);
  });
});

describe('recoverFromStaleChunkError', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('clears caches and reloads once for chunk errors', async () => {
    const storage = new Map<string, string>();
    const reload = vi.fn();
    const deleteMock = vi.fn(async () => true);
    vi.stubGlobal('caches', {
      keys: async () => ['family-recipes-static-v1', 'other-cache'],
      delete: deleteMock,
    });

    const recovered = await recoverFromStaleChunkError(
      Object.assign(new Error('boom'), { name: 'ChunkLoadError' }),
      {
        reload,
        storage: {
          getItem: (key) => storage.get(key) ?? null,
          setItem: (key, value) => {
            storage.set(key, value);
          },
        },
      },
    );

    expect(recovered).toBe(true);
    expect(storage.get(STALE_CACHE_RECOVERY_FLAG)).toBe('1');
    expect(deleteMock).toHaveBeenCalledWith('family-recipes-static-v1');
    expect(deleteMock).not.toHaveBeenCalledWith('other-cache');
    expect(reload).toHaveBeenCalledOnce();
  });

  it('does not reload twice in the same session', async () => {
    const storage = new Map<string, string>([[STALE_CACHE_RECOVERY_FLAG, '1']]);
    const reload = vi.fn();

    const recovered = await recoverFromStaleChunkError(
      Object.assign(new Error('boom'), { name: 'ChunkLoadError' }),
      {
        reload,
        storage: {
          getItem: (key) => storage.get(key) ?? null,
          setItem: (key, value) => {
            storage.set(key, value);
          },
        },
      },
    );

    expect(recovered).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('ignores non-chunk errors', async () => {
    const reload = vi.fn();
    const recovered = await recoverFromStaleChunkError(new Error('something else'), { reload });
    expect(recovered).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
