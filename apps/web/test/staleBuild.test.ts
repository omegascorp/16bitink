import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '@16bitink/game-sdk';
import { isStaleBuildError, reloadForNewBuild, shouldReloadForNewBuild, RELOAD_COOLDOWN_MS } from '../src/lib/client/staleBuild';

function memoryStore(): KeyValueStore & { readonly items: Map<string, string> } {
  const items = new Map<string, string>();
  return { items, getItem: (k) => items.get(k) ?? null, setItem: (k, v) => void items.set(k, v) };
}

describe('stale build errors', () => {
  it.each([
    // Chrome, Firefox, Safari, and Vite's CSS preload.
    'Failed to fetch dynamically imported module: https://16bit.ink/_astro/index.Bx1.js',
    'error loading dynamically imported module: https://16bit.ink/_astro/index.Bx1.js',
    'Importing a module script failed.',
    'Unable to preload CSS for /_astro/index.Bx1.css',
  ])('spots a missing chunk: %s', (message) => {
    expect(isStaleBuildError(new TypeError(message))).toBe(true);
  });

  it('leaves other failures alone', () => {
    expect(isStaleBuildError(new Error('WebGL context lost'))).toBe(false);
    expect(isStaleBuildError('Failed to fetch dynamically imported module')).toBe(false);
    expect(isStaleBuildError(null)).toBe(false);
  });
});

describe('when to reload for a new build', () => {
  const stale = new TypeError('Failed to fetch dynamically imported module: https://16bit.ink/_astro/index.Bx1.js');

  it('reloads a page whose game code is gone, before the game runs', () => {
    expect(shouldReloadForNewBuild({ err: stale, online: true, playing: false })).toBe(true);
  });

  it('never reloads while the game is running: the player would lose their run', () => {
    expect(shouldReloadForNewBuild({ err: stale, online: true, playing: true })).toBe(false);
  });

  it('does not reload offline: the browser would show its offline page instead', () => {
    expect(shouldReloadForNewBuild({ err: stale, online: false, playing: false })).toBe(false);
  });

  it('does not reload for other failures', () => {
    expect(shouldReloadForNewBuild({ err: new Error('WebGL context lost'), online: true, playing: false })).toBe(false);
  });
});

describe('reload for a new build', () => {
  it('reloads once and remembers when', () => {
    const store = memoryStore();
    let reloads = 0;
    expect(reloadForNewBuild(store, 1_000, () => reloads++)).toBe(true);
    expect(reloads).toBe(1);
  });

  it('does not reload again straight after a reload (no loop if the new page fails too)', () => {
    const store = memoryStore();
    let reloads = 0;
    reloadForNewBuild(store, 1_000, () => reloads++);
    expect(reloadForNewBuild(store, 1_000 + RELOAD_COOLDOWN_MS - 1, () => reloads++)).toBe(false);
    expect(reloads).toBe(1);
  });

  it('may reload again once the cooldown has passed (the next deploy)', () => {
    const store = memoryStore();
    let reloads = 0;
    reloadForNewBuild(store, 1_000, () => reloads++);
    expect(reloadForNewBuild(store, 1_000 + RELOAD_COOLDOWN_MS, () => reloads++)).toBe(true);
    expect(reloads).toBe(2);
  });

  it('never reloads without storage: nothing would stop a reload loop', () => {
    let reloads = 0;
    expect(reloadForNewBuild(undefined, 1_000, () => reloads++)).toBe(false);
    expect(reloads).toBe(0);
  });

  it('does not reload when storage refuses to write: it could not remember the reload', () => {
    const store: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    let reloads = 0;
    expect(reloadForNewBuild(store, 1_000, () => reloads++)).toBe(false);
    expect(reloads).toBe(0);
  });
});
