import { describe, expect, it } from 'vitest';
import { parseChapters } from '../../../games/inkfish/src/levels/validate';
import { findGame, GAMES, isPurchasable } from '../src/data/games';
import { INKFISH_FULL_CHAPTERS } from '../src/lib/levels/inkfish-full';

describe('catalog', () => {
  it('has unique slugs', () => {
    expect(new Set(GAMES.map((g) => g.slug)).size).toBe(GAMES.length);
  });

  it('only sells playable games with a price env', () => {
    expect(isPurchasable(findGame('inkfish'))).toBe(true);
    expect(isPurchasable(findGame('blot'))).toBe(false);
    expect(isPurchasable(undefined)).toBe(false);
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
