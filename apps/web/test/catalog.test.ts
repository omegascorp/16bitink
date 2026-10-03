import { describe, expect, it } from 'vitest';
import { INKFISH_FULL_CHAPTERS } from '@16bitink/inkfish/content';
import { parseChapters } from '../../../games/inkfish/src/levels/validate';
import { findGame, GAMES, isPurchasable, playableGames } from '../src/data/games';
import { PAID_CONTENT } from '../src/games/content.server';
import { GAME_LOADERS } from '../src/games/loaders';

describe('catalog', () => {
  it('has unique, URL-safe slugs', () => {
    expect(new Set(GAMES.map((g) => g.slug)).size).toBe(GAMES.length);
    for (const g of GAMES) expect(g.slug).toMatch(/^[a-z0-9-]{1,40}$/);
  });

  it('only sells playable games with a Stripe lookup key', () => {
    expect(isPurchasable(findGame('inkfish'))).toBe(true);
    expect(isPurchasable(findGame('blot'))).toBe(false);
    expect(isPurchasable(undefined)).toBe(false);
  });
});

describe('game registries stay in sync with the catalog', () => {
  it('every playable game has a client loader', () => {
    for (const g of playableGames()) expect(GAME_LOADERS[g.slug], g.slug).toBeTypeOf('function');
  });

  it('every loader and paid-content entry belongs to a playable game', () => {
    const playable = new Set(playableGames().map((g) => g.slug));
    for (const slug of Object.keys(GAME_LOADERS)) expect(playable.has(slug), slug).toBe(true);
    for (const slug of Object.keys(PAID_CONTENT)) expect(playable.has(slug), slug).toBe(true);
  });

  it('every purchasable game has paid content to deliver', () => {
    for (const g of playableGames().filter(isPurchasable)) expect(PAID_CONTENT[g.slug], g.slug).toBeDefined();
  });
});

describe('paid inkfish chapters', () => {
  it('pass the game client validator', () => {
    expect(parseChapters(JSON.parse(JSON.stringify(INKFISH_FULL_CHAPTERS)))).toHaveLength(3);
  });

  it('have unique level ids that do not clash with the demo', () => {
    const ids = INKFISH_FULL_CHAPTERS.flatMap((c) => c.levels.map((l) => l.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some((id) => id.startsWith('c1-'))).toBe(false);
  });
});
