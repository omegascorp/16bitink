import { describe, expect, it } from 'vitest';
import { INKCRAB_PAID_BEACHES } from '@16bitink/inkcrab/content';
import { INKFISH_FULL_CHAPTERS } from '@16bitink/inkfish/content';
import { INKGECKO_PAID_CHAPTERS } from '@16bitink/inkgecko/content';
import { parseBeaches } from '../../../games/inkcrab/src/level/validate';
import { parseChapters as parseGeckoChapters } from '../../../games/inkgecko/src/level/validate';
import { parseChapters } from '../../../games/inkfish/src/levels/validate';
import { findGame, GAMES, isNew, isOut, isPurchasable, listedGames, playableGames, type CatalogGame } from '../src/data/games';
import { PAID_CONTENT } from '../src/games/content.server';
import { GAME_LOADERS } from '../src/games/loaders';
import { GAME_VERSIONS } from '../src/games/versions';

describe('catalog', () => {
  it('has unique, URL-safe slugs', () => {
    expect(new Set(GAMES.map((g) => g.slug)).size).toBe(GAMES.length);
    for (const g of GAMES) expect(g.slug).toMatch(/^[a-z0-9-]{1,40}$/);
  });

  it('lists every game for sale, so the admin panel can unlock it and make keys for it', () => {
    expect(playableGames().map((g) => g.slug)).toEqual(['inkfish', 'inkcrab', 'inkmine', 'inkgecko']);
  });

  it('is out from the start of its release day (UTC), or always when undated', () => {
    const game = { released: '2026-10-24' } as CatalogGame;
    expect(isOut(game, new Date('2026-10-23T23:59:59Z'))).toBe(false);
    expect(isOut(game, new Date('2026-10-24T00:00:00Z'))).toBe(true);
    expect(isOut({} as CatalogGame, new Date('2026-01-01T00:00:00Z'))).toBe(true);
    expect(isOut({ released: 'soon' } as CatalogGame, new Date('2026-10-24T00:00:00Z'))).toBe(false);
  });

  it('lists InkGecko on the home page from Saturday, Oct 24 (UTC), and every other playable game now', () => {
    expect(listedGames(new Date('2026-10-23T23:59:59Z')).map((g) => g.slug)).toEqual(['inkfish', 'inkcrab', 'inkmine']);
    expect(listedGames(new Date('2026-10-24T00:00:00Z')).map((g) => g.slug)).toEqual(['inkfish', 'inkcrab', 'inkmine', 'inkgecko']);
  });

  it('says in a few words what every playable game gives for free', () => {
    for (const g of playableGames()) {
      expect(g.demo, g.slug).toBeTruthy();
      expect(g.demo!.length, g.slug).toBeLessThanOrEqual(24);
    }
  });

  it('dates every playable game, so the newest can be marked', () => {
    for (const g of playableGames()) expect(g.released, g.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('marks a game new for its first eight days, counted from the start of its release day (UTC)', () => {
    const game = { released: '2026-10-17' } as CatalogGame;
    expect(isNew(game, new Date('2026-10-17T00:00:00Z'))).toBe(true);
    expect(isNew(game, new Date('2026-10-24T23:59:59Z'))).toBe(true);
    expect(isNew(game, new Date('2026-10-25T00:00:00Z'))).toBe(false);
    // Dated ahead (announced, not out yet) or undated: not new.
    expect(isNew(game, new Date('2026-10-16T12:00:00Z'))).toBe(false);
    expect(isNew({} as CatalogGame, new Date('2026-10-17T12:00:00Z'))).toBe(false);
  });

  it('only sells playable games with a Stripe lookup key', () => {
    expect(isPurchasable(findGame('inkfish'))).toBe(true);
    expect(isPurchasable(findGame('inkcrab'))).toBe(true);
    expect(isPurchasable(findGame('inkmine'))).toBe(true);
    expect(isPurchasable(findGame('inkgecko'))).toBe(true);
    expect(isPurchasable(findGame('blot'))).toBe(false);
    expect(isPurchasable(undefined)).toBe(false);
  });
});

describe('game registries stay in sync with the catalog', () => {
  it('every playable game has a release version (semver, from its package.json)', () => {
    for (const g of playableGames()) expect(GAME_VERSIONS[g.slug], g.slug).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?$/);
  });

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
    expect(parseChapters(JSON.parse(JSON.stringify(INKFISH_FULL_CHAPTERS)))).toHaveLength(9);
    expect(INKFISH_FULL_CHAPTERS.flatMap((c) => c.levels)).toHaveLength(90);
  });

  it('have unique level ids that do not clash with the demo', () => {
    const ids = INKFISH_FULL_CHAPTERS.flatMap((c) => c.levels.map((l) => l.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some((id) => id.startsWith('c1-'))).toBe(false);
  });
});

describe('paid inkcrab beaches', () => {
  it('pass the game client validator', () => {
    const beaches = parseBeaches(JSON.parse(JSON.stringify(INKCRAB_PAID_BEACHES)));
    expect(beaches).toHaveLength(9);
    expect(beaches.flat()).toHaveLength(90);
  });
});

describe('paid inkgecko chapters', () => {
  it('pass the game client validator: 9 gardens of 10 levels', () => {
    const chapters = parseGeckoChapters(JSON.parse(JSON.stringify(INKGECKO_PAID_CHAPTERS)));
    expect(chapters).toHaveLength(9);
    expect(chapters.flat()).toHaveLength(90);
  });
});
