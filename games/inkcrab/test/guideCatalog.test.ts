import { describe, expect, it } from 'vitest';
import { INKCRAB_PAID_BEACHES } from '../content/paid';
import { creatureName, guidePages, guideProgress, isBird, SHELL_SEEN, shellName, shellSeenId } from '../src/guide/catalog';
import { BEACH_1 } from '../src/level/beach1';
import type { LevelDef } from '../src/level/types';

const ALL: readonly (readonly LevelDef[])[] = [BEACH_1, ...INKCRAB_PAID_BEACHES];

describe('field guide pages', () => {
  const pages = guidePages(ALL);

  it('has a page per beach, numbered from 1', () => {
    expect(pages.map((p) => p.beach)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('opens with the hermit crab you play, and the periwinkle you start in', () => {
    expect(pages[0]!.creatures[0]).toBe('hermit');
    expect(pages[0]!.shells[0]).toBe('periwinkle');
  });

  it('lists each creature and shell once, under the first beach it turns up on', () => {
    const creatures = pages.flatMap((p) => p.creatures);
    const shells = pages.flatMap((p) => p.shells);
    expect(new Set(creatures).size).toBe(creatures.length);
    expect(new Set(shells).size).toBe(shells.length);
    expect(pages[0]!.creatures).toEqual(expect.arrayContaining(['slater', 'ghostcrab', 'beetle']));
    expect(pages[1]!.creatures).toEqual(expect.arrayContaining(['darkling', 'antlion', 'skink', 'kestrel']));
    expect(pages[1]!.shells).toEqual(expect.arrayContaining(['desertsnail', 'turban', 'helmet']));
    expect(pages[9]!.creatures).toEqual(expect.arrayContaining(['brittlestar']));
  });

  it('covers shells that only rivals wear or the tide brings', () => {
    const tideShells = ALL.flat().flatMap((d) => (d.tideBrings?.shells ?? []).map(([kind]) => kind));
    const rivalShells = ALL.flat().flatMap((d) => (d.rivals ?? []).map(([kind]) => kind));
    const listed = new Set(pages.flatMap((p) => p.shells));
    for (const kind of [...tideShells, ...rivalShells]) expect(listed.has(kind), kind).toBe(true);
  });

  it('only shows the beaches the player has', () => {
    expect(guidePages([BEACH_1]).map((p) => p.beach)).toEqual([1]);
  });
});

describe('field guide names', () => {
  it('names creatures, birds and shells with a capital, keeping proper names', () => {
    expect(creatureName('ghostcrab')).toBe('Ghost crab');
    expect(creatureName('sallycrab')).toBe('Sally Lightfoot crab');
    expect(creatureName('brahminy')).toBe('Brahminy kite');
    expect(shellName('periwinkle')).toBe('Periwinkle');
  });

  it('tells birds from creatures on the ground', () => {
    expect(isBird('osprey')).toBe(true);
    expect(isBird('gull')).toBe(false);
  });

  it('keeps shells apart from creatures in the save', () => {
    expect(shellSeenId('conch')).toBe(`${SHELL_SEEN}conch`);
  });
});

describe('field guide progress', () => {
  it('counts what has been met on a page and rounds the share down', () => {
    expect(guideProgress(['a', 'b', 'c'], new Set(['a', 'z']))).toEqual({ met: 1, total: 3, percent: 33 });
    expect(guideProgress([], new Set())).toEqual({ met: 0, total: 0, percent: 0 });
  });
});
