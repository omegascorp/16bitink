import { describe, expect, it } from 'vitest';
import { ARMOUR_FLOOR, COUNTERS, counterGun, damageTaken, structureDamage } from '../src/logic/damage';
import { ACE_INTEL_MULT, INTEL_PER_MK, intelOf, mergeIntel, sumIntel } from '../src/logic/intel';
import { artKey, part, partLabel, slotOf, STARTER_LOADOUT, withPart } from '../src/logic/parts';
import { atLeast, perksOf, rankOf, RANKS, toNextRank } from '../src/logic/rank';
import { createRng } from '../src/logic/rng';
import { HP_SCALE, tankStats } from '../src/logic/stats';
import { turnTowards, wrapAngle } from '../src/logic/vec';

describe('rng', () => {
  it('replays a seed exactly and forks independently', () => {
    const a = createRng(42);
    const b = createRng(42);
    const xs = Array.from({ length: 5 }, () => a.next());
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(xs);
    expect(createRng(42).fork(1).next()).not.toBe(createRng(42).fork(2).next());
    const r = createRng(1);
    for (let i = 0; i < 100; i++) expect(r.int(3)).toBeLessThan(3);
    expect(r.weighted(['a', 'b'], (x) => (x === 'a' ? 0 : 1))).toBe('b');
    expect(() => r.pick([])).toThrow();
  });
});

describe('angles', () => {
  it('wraps and turns the short way', () => {
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
    expect(turnTowards(0, 1, 0.25)).toBeCloseTo(0.25);
    expect(turnTowards(3, -3, 1)).toBeCloseTo(-3);
  });
});

describe('parts and stats', () => {
  it('HP is hull × drive factor, speed is drive × engine factor (clamped)', () => {
    const scout = tankStats(STARTER_LOADOUT);
    expect(scout.maxHp).toBe(120 * HP_SCALE);
    expect(scout.engineFactor).toBe(1.1);
    expect(scout.speed).toBeCloseTo(190 * 1.1);
    const siege = tankStats({ gun: part('rockets'), hull: part('heavy'), drive: part('tracks') });
    expect(siege.engineFactor).toBe(0.7);
    expect(siege.maxHp).toBe(Math.round(320 * HP_SCALE * 1.9));
    const brawler = tankStats({ gun: part('cannon'), hull: part('medium'), drive: part('halftracks') });
    expect(brawler.engineFactor).toBeCloseTo(0.8);
  });

  it('Mk tiers raise the main stat; research adds 8% a step', () => {
    const mk3 = tankStats({ gun: part('cannon', 3), hull: part('medium', 2), drive: part('wheels', 3) });
    expect(mk3.gun.damage).toBeCloseTo(40 * 1.4);
    expect(mk3.maxHp).toBe(Math.round(200 * HP_SCALE * 1.2));
    const res = tankStats(STARTER_LOADOUT, { machinegun: { damage: 2, reload: 1 }, light: { armour: 3 }, wheels: { grip: 3 } });
    expect(res.gun.damage).toBeCloseTo(6 * 1.16);
    expect(res.gun.reload).toBeCloseTo(0.1 / 1.08);
    expect(res.armour).toBeCloseTo(3 * 1.24);
    expect(res.sand).toBeGreaterThan(0.7);
  });

  it('slots, labels and art keys', () => {
    expect(slotOf('rockets')).toBe('gun');
    expect(slotOf('heavy')).toBe('hull');
    expect(slotOf('tracks')).toBe('drive');
    expect(artKey(part('halftracks', 2))).toBe('driveHalftrack-mk2');
    expect(partLabel({ family: 'cannon', mk: 3, proto: true })).toBe('Prototype Cannon Mk III');
    expect(withPart(STARTER_LOADOUT, part('cannon', 2)).gun).toEqual(part('cannon', 2));
  });
});

describe('damage', () => {
  it('applies counters, armour and the floor', () => {
    expect(damageTaken(40, 'cannon', 'wheels', 3)).toBe(37);
    expect(damageTaken(6, 'machinegun', 'tracks', 12)).toBeCloseTo(6 * 0.5 * ARMOUR_FLOOR);
    expect(damageTaken(30, 'rockets', 'tracks', 12)).toBeCloseTo(30 * 1.3 - 12);
    expect(COUNTERS.machinegun.wheels).toBeGreaterThan(COUNTERS.machinegun.tracks);
    expect(counterGun('tracks')).toBe('rockets');
    expect(counterGun('wheels')).toBe('machinegun');
  });
  it('only brick-breakers hurt brick; rock never breaks', () => {
    expect(structureDamage(6, 'brick', false)).toBe(0);
    expect(structureDamage(40, 'brick', true)).toBe(40);
    expect(structureDamage(6, 'wood', false)).toBe(6);
    expect(structureDamage(6, 'fuel', false)).toBe(6);
    expect(structureDamage(99, 'rock', true)).toBe(0);
  });
});

describe('intel', () => {
  it('is paid per Mk per part, more from aces', () => {
    const bag = intelOf({ gun: part('cannon', 2), hull: part('medium', 1), drive: part('tracks', 3) });
    expect(bag).toEqual({ cannon: INTEL_PER_MK[2], medium: INTEL_PER_MK[1], tracks: INTEL_PER_MK[3] });
    expect(sumIntel(intelOf(STARTER_LOADOUT, true))).toBe(3 * INTEL_PER_MK[1] * ACE_INTEL_MULT);
    expect(mergeIntel({ cannon: 1 }, { cannon: 2, light: 1 })).toEqual({ cannon: 3, light: 1 });
  });
});

describe('ranks', () => {
  it('only goes up and gates perks', () => {
    expect(rankOf(0).id).toBe('private');
    expect(rankOf(RANKS[2]!.xp).id).toBe('sergeant');
    expect(atLeast(RANKS[3]!.xp, 'sergeant')).toBe(true);
    expect(perksOf(0)).toEqual({ repairKits: 1, maxMk: 1, callIn: false, kitSlot: false, wingmen: 0, strike: false, protoParts: false });
    expect(perksOf(1e9)).toMatchObject({ wingmen: 2, strike: true, protoParts: true });
    expect(perksOf(RANKS[4]!.xp).maxMk).toBe(3);
    expect(toNextRank(0)?.next.id).toBe('corporal');
    expect(toNextRank(1e9)).toBeNull();
  });
});
