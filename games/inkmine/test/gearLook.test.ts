import { describe, expect, it } from 'vitest';
import { MARKS, markOf } from '../src/art/prospector/marks';
import { evenLoadout, lookKey, lookOf, MAX_MK, PIECES, prospectorLook, STARTER_LOADOUT } from '../src/logic/gear';

describe('how gear shows on the prospector', () => {
  it('keeps every piece at its own mark', () => {
    const l = { drill: 2, cell: 1, pack: 0, suit: 3, helmet: 9, jetpack: 10 };
    expect(prospectorLook(l)).toEqual(l);
  });

  it('clamps a mark past the ends', () => {
    expect(prospectorLook({ ...STARTER_LOADOUT, drill: 14, cell: -1 })).toMatchObject({ drill: MAX_MK, cell: 0 });
  });

  it('gives every loadout its own texture key, so no two looks share a sprite', () => {
    const keys = new Set<string>();
    for (let mk = 0; mk <= MAX_MK; mk++) {
      for (const piece of PIECES) keys.add(lookKey(prospectorLook({ ...STARTER_LOADOUT, [piece]: mk })));
    }
    // The starter set once, then each of the six pieces at Mk 1–10.
    expect(keys.size).toBe(1 + PIECES.length * MAX_MK);
    expect(lookKey(prospectorLook(evenLoadout(10)))).toBe('aaaaaa');
    expect(lookKey(prospectorLook(STARTER_LOADOUT))).toBe('000000');
  });

  it('marks the pulse on the wrist in the key, leaving unarmed keys as they were', () => {
    expect(prospectorLook(evenLoadout(2)).armed).toBeUndefined();
    expect(prospectorLook(evenLoadout(2), true).armed).toBe(true);
    expect(lookKey(prospectorLook(evenLoadout(2)))).toBe('222222');
    expect(lookKey(prospectorLook(evenLoadout(2), true))).toBe('222222w');
  });

  it('still groups marks into three families for the silhouette', () => {
    expect([0, 1, 2, 3].map(lookOf)).toEqual([0, 0, 0, 0]);
    expect([4, 7].map(lookOf)).toEqual([1, 1]);
    expect([8, 10].map(lookOf)).toEqual([2, 2]);
  });
});

describe('each mark’s materials', () => {
  it('has a paint for every mark, from the starter set to Cardia', () => {
    expect(MARKS).toHaveLength(MAX_MK + 1);
    expect(MARKS.map((m) => m.planet)).toEqual(['starter', 'Graphite', 'Mycel', 'Brine', 'Talus', 'Prism', 'Ember', 'Pumice', 'Rime', 'Umbra', 'Cardia']);
  });

  it('paints no two marks alike', () => {
    const paints = new Set(MARKS.map((m) => `${m.cloth}${m.trim}${m.shell}${m.case}`));
    expect(paints.size).toBe(MARKS.length);
    // Mk 0, 1 and 2 (what players see now) differ in cloth, shell and case, not just one tint.
    for (const key of ['cloth', 'shell', 'case', 'charge'] as const) expect(new Set([0, 1, 2].map((mk) => MARKS[mk]![key])).size).toBe(3);
  });

  it('falls back to the nearest mark past the ends', () => {
    expect(markOf(12)).toBe(MARKS[MAX_MK]);
    expect(markOf(-3)).toBe(MARKS[0]);
  });
});
