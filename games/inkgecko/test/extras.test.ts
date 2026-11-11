import { describe, expect, it } from 'vitest';
import { INKGECKO_PAID_CHAPTERS } from '../content/paid';
import { CHAPTER_1 } from '../src/level/chapter1';
import { EXTRAS, extrasFor } from '../src/level/extras';
import type { LevelDef } from '../src/level/types';

const ALL: readonly LevelDef[] = [CHAPTER_1, ...INKGECKO_PAID_CHAPTERS].flat();

describe('extra sprites per level', () => {
  it('gives a boss level every extra', () => {
    for (const level of ALL.filter((l) => l.boss)) expect(extrasFor(level)).toEqual(EXTRAS);
  });

  it('paints what each level shows', () => {
    for (const level of ALL.filter((l) => !l.boss)) {
      const got = new Set(extrasFor(level));
      for (const c of ['dragonfly', 'geode', 'hedgehog', 'rain'] as const) if (level.charms.includes(c)) expect(got.has(c), `${level.id} ${c}`).toBe(true);
      if (level.fruit) expect(got.has('fruit'), level.id).toBe(true);
      if (level.buds) expect(got.has('bud'), level.id).toBe(true);
      if (level.stones || level.tracks.some((t) => t.opensAt)) expect(got.has('stone'), level.id).toBe(true);
      if (level.twine) expect(got.has('twine'), level.id).toBe(true);
      if (level.chameleons) expect(got.has('sheen'), level.id).toBe(true);
      if (level.dark || level.charms.includes('lantern')) expect(got.has('lantern'), level.id).toBe(true);
      if (level.leaves) expect(got.has('leaf'), level.id).toBe(true);
      if (level.mode?.kind === 'gold') expect(got.has('gilt'), level.id).toBe(true);
    }
  });

  it('keeps the first garden light, so a new player starts sooner', () => {
    const first = CHAPTER_1[0]!;
    expect(extrasFor(first).length).toBeLessThan(EXTRAS.length);
  });
});
