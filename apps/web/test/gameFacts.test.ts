import { describe, expect, it } from 'vitest';
import { INKCRAB_PAID_BEACHES } from '@16bitink/inkcrab/content';
import { INKFISH_FULL_CHAPTERS } from '@16bitink/inkfish/content';
import { INKGECKO_PAID_CHAPTERS } from '@16bitink/inkgecko/content';
import { findGame, playableGames, type CatalogGame } from '../src/data/games';
import { chapterTiles, formatDay, gameDates, gameSize } from '../src/lib/gameFacts';

const game = (fields: Partial<CatalogGame>): CatalogGame => ({ slug: 'x', title: 'X', tagline: '', description: [], status: 'playable', ...fields });

const NOW = new Date('2026-10-19T12:00:00Z');

describe('formatDay', () => {
  it('writes a catalog day short, with the year only when it is not this year, whatever the server time zone', () => {
    expect(formatDay('2026-10-03', NOW)).toBe('Oct 3');
    expect(formatDay('2025-12-31', NOW)).toBe('Dec 31, 2025');
  });
});

describe('gameSize', () => {
  it('a finished game: every chapter out, and its levels', () => {
    expect(gameSize(game({ size: { chapters: 10, levels: 100 } }))).toEqual({ chapters: 10, ready: 10, levels: 100 });
  });

  it('a game still being made: how many chapters are out so far', () => {
    expect(gameSize(game({ size: { chapters: 10, ready: 3 } }))).toEqual({ chapters: 10, ready: 3, levels: null });
  });

  it('nothing when the catalog does not say', () => {
    expect(gameSize(game({}))).toBeNull();
  });
});

describe('chapterTiles', () => {
  it('one tile per chapter: the free ones, the rest that is out, then what is coming', () => {
    expect(chapterTiles({ chapters: 5, ready: 3, levels: null }, 1)).toEqual(['free', 'out', 'out', 'coming', 'coming']);
  });

  it('an owner gets no free tile: every chapter is theirs', () => {
    expect(chapterTiles({ chapters: 3, ready: 3, levels: 30 }, 0)).toEqual(['out', 'out', 'out']);
  });
});

describe('gameDates', () => {
  it('when it came out and when it last changed', () => {
    expect(gameDates(game({ released: '2026-10-03', updated: '2026-10-16' }), NOW)).toEqual({ released: 'Oct 3', updated: 'Oct 16' });
  });

  it('no update on release day, and nothing the catalog does not say', () => {
    expect(gameDates(game({ released: '2026-10-25', updated: '2026-10-25' }), NOW)).toEqual({ released: 'Oct 25', updated: null });
    expect(gameDates(game({}), NOW)).toEqual({ released: null, updated: null });
  });
});

describe('catalog sizes', () => {
  /** Chapter 1 is the free demo, 10 levels; the rest is the paid content. */
  const DEMO_LEVELS = 10;

  it('every playable game says how big it is and when it was last updated', () => {
    for (const g of playableGames()) {
      expect(g.size, g.slug).toBeDefined();
      expect(g.updated, g.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(g.updated! >= g.released!, g.slug).toBe(true);
    }
  });

  it('InkFish, InkCrab and InkGecko count the levels they really ship', () => {
    expect(findGame('inkfish')?.size).toEqual({ chapters: INKFISH_FULL_CHAPTERS.length + 1, levels: INKFISH_FULL_CHAPTERS.flatMap((c) => c.levels).length + DEMO_LEVELS });
    expect(findGame('inkcrab')?.size).toEqual({ chapters: INKCRAB_PAID_BEACHES.length + 1, levels: INKCRAB_PAID_BEACHES.flat().length + DEMO_LEVELS });
    expect(findGame('inkgecko')?.size).toEqual({ chapters: INKGECKO_PAID_CHAPTERS.length + 1, levels: INKGECKO_PAID_CHAPTERS.flat().length + DEMO_LEVELS });
  });
});
