import { describe, expect, it } from 'vitest';
import { affordableUpgrades, newlyAffordable } from '../src/logic/blueprints';
import { RANKS } from '../src/logic/rank';
import { addIntel, newProgress } from '../src/logic/workshop';

describe('affordableUpgrades', () => {
  it('is empty with no blueprints', () => {
    expect(affordableUpgrades(newProgress())).toEqual([]);
  });

  it('offers an unlock at 3 blueprints of that family, not of another', () => {
    const u = affordableUpgrades(addIntel(newProgress(), { cannon: 3, rockets: 2 }));
    expect(u.map((x) => x.label)).toEqual(['Unlock Cannon']);
  });

  it('counts research on an owned family at its step cost', () => {
    const u = affordableUpgrades(addIntel(newProgress(), { machinegun: 5 }));
    expect(u.map((x) => x.label)).toEqual(['Machinegun Damage', 'Machinegun Reload']);
  });

  it('holds back Mk II until the rank allows it, then lists it', () => {
    const p = addIntel(newProgress(), { machinegun: 8 });
    expect(affordableUpgrades(p).some((x) => x.kind === 'mk')).toBe(false);
    const sgt = affordableUpgrades({ ...p, xp: RANKS[2]!.xp });
    expect(sgt.find((x) => x.kind === 'mk')?.label).toBe('Machinegun Mk II');
    expect(affordableUpgrades(p, 'sergeant').some((x) => x.kind === 'mk')).toBe(true);
  });

  it('skips finished lines', () => {
    const p = addIntel({ ...newProgress(), research: { machinegun: { damage: 3, reload: 3 } } }, { machinegun: 99 });
    expect(affordableUpgrades(p).filter((x) => x.kind === 'research')).toEqual([]);
  });
});

describe('newlyAffordable', () => {
  it('lists only what the mission made payable', () => {
    const before = addIntel(newProgress(), { machinegun: 5 });
    const after = addIntel(before, { cannon: 4, machinegun: 0 });
    expect(newlyAffordable(before, after).map((x) => x.label)).toEqual(['Unlock Cannon']);
  });
});
