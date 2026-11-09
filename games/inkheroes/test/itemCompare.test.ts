import { describe, expect, it } from 'vitest';
import { ASHFORD } from '../src/level/borderMarch';
import { startAdventure } from '../src/logic/adventure';
import type { Hero } from '../src/logic/hero';
import { changeWords, setInfo, wearPreview } from '../src/logic/itemCompare';

const base: Hero = { ...startAdventure(ASHFORD).hero, gear: {}, bag: [] };
const dressed = (gear: Hero['gear'], bag: Hero['bag'] = []): Hero => ({ ...base, gear, bag });

describe('setInfo', () => {
  it('names a set, counts what is worn and lights the bonuses that are on', () => {
    const h = dressed({ helm: 'corinthianHelm', cuirass: 'bellCuirass', bracers: 'isthmianBracers' });
    const info = setInfo(h, 'corinthianGreaves')!;
    expect(info).toMatchObject({ name: 'Corinthian set', worn: 3, size: 6 });
    expect(info.tiers.map((t) => [t.at, t.lit])).toEqual([[2, true], [4, false], [6, false]]);
    expect(info.tiers[0]!.says).toBe('+1 Morale');
  });

  it('says a common set gives no bonus, and nothing for a piece of no set', () => {
    expect(setInfo(base, 'bronzeHelm')).toMatchObject({ name: 'Bronze set', tiers: [] });
    expect(setInfo(base, 'catapult')).toBeNull();
  });
});

describe('wearPreview', () => {
  it('compares a bag piece with the one it would replace, stat by stat', () => {
    const h = dressed({ helm: 'bronzeHelm' }, ['corinthianHelm']);
    const p = wearPreview(h, 0)!;
    expect(p.replaces).toBe('bronzeHelm');
    // Bronze Helm +1 Defense; Corinthian Helm +1 Defense, +1 Sight.
    expect(p.changes).toEqual([{ stat: 'sight', by: 1 }]);
  });

  it('counts a set bonus that wearing it turns on, or off', () => {
    const h = dressed({ helm: 'corinthianHelm', cuirass: 'bronzeCuirass' }, ['bellCuirass']);
    const on = wearPreview(h, 0)!;
    expect(on.setsOn).toEqual(['Corinthian set, 2 pieces: +1 Morale']);
    expect(on.changes).toContainEqual({ stat: 'morale', by: 1 });
    const back = wearPreview({ ...h, gear: { ...h.gear, cuirass: 'bellCuirass' }, bag: ['bronzeCuirass'] }, 0)!;
    expect(back.setsOff).toEqual(['Corinthian set, 2 pieces: +1 Morale']);
    expect(back.changes).toContainEqual({ stat: 'morale', by: -1 });
  });

  it('puts a piece in an empty slot with nothing replaced, and gives null for an empty place', () => {
    const p = wearPreview(dressed({}, ['bronzeHelm']), 0)!;
    expect(p.replaces).toBeNull();
    expect(p.changes).toEqual([{ stat: 'defense', by: 1 }]);
    expect(wearPreview(dressed({}, []), 0)).toBeNull();
  });

  it('words a change with its sign', () => {
    expect(changeWords({ stat: 'attack', by: 2 })).toBe('+2 Attack');
    expect(changeWords({ stat: 'defense', by: -1 })).toBe('−1 Defense');
  });
});
