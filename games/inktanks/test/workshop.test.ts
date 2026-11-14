import { describe, expect, it } from 'vitest';
import { RANKS } from '../src/logic/rank';
import { MK_COLOUR, partLabel, roman, type Mk } from '../src/logic/parts';
import { addIntel, canFit, fit, newProgress, raiseMk, research, researchCost, unlock } from '../src/logic/workshop';
import { counterFamily, fitBest, noGrindCheck, spendIntel } from '../src/sim/policy';

describe('workshop', () => {
  it('unlocks a family for 3 intel, never twice', () => {
    const p0 = addIntel(newProgress(), { cannon: 4 });
    const r = unlock(p0, 'cannon');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.progress.intel.cannon).toBe(1);
    expect(r.progress.intelTotal.cannon).toBe(4);
    expect(p0.unlocked).not.toContain('cannon');
    expect(unlock(r.progress, 'cannon').ok).toBe(false);
    expect(unlock(newProgress(), 'rockets')).toEqual({ ok: false, reason: 'needs 3 Rockets blueprints' });
  });

  it('Mk II needs Sergeant and 8 intel; Mk III needs Lieutenant and 20', () => {
    const p = addIntel(newProgress(), { machinegun: 30 });
    expect(raiseMk(p, 'machinegun')).toEqual({ ok: false, reason: 'needs Sergeant' });
    const sgt = { ...p, xp: RANKS[2]!.xp };
    const r2 = raiseMk(sgt, 'machinegun');
    expect(r2.ok && r2.progress.mk.machinegun).toBe(2);
    if (!r2.ok) return;
    expect(raiseMk(r2.progress, 'machinegun')).toEqual({ ok: false, reason: 'needs Lieutenant' });
    const r3 = raiseMk({ ...r2.progress, xp: RANKS[4]!.xp }, 'machinegun');
    expect(r3.ok && r3.progress.mk.machinegun).toBe(3);
    expect(raiseMk(sgt, 'rockets').ok).toBe(false);
  });

  it('Mk IV needs Major and 35; Mk V needs Brigadier and 55, and stops there', () => {
    const rank = (id: string): number => RANKS.find((r) => r.id === id)!.xp;
    const p = { ...addIntel(newProgress(), { machinegun: 200 }), mk: { ...newProgress().mk, machinegun: 3 as const }, xp: rank('lieutenant') };
    expect(raiseMk(p, 'machinegun')).toEqual({ ok: false, reason: 'needs Major' });
    const r4 = raiseMk({ ...p, xp: rank('major') }, 'machinegun');
    expect(r4.ok && r4.progress.mk.machinegun).toBe(4);
    if (!r4.ok) return;
    expect(r4.progress.intel.machinegun).toBe(165);
    expect(raiseMk(r4.progress, 'machinegun')).toEqual({ ok: false, reason: 'needs Brigadier' });
    const r5 = raiseMk({ ...r4.progress, xp: rank('brigadier') }, 'machinegun');
    expect(r5.ok && r5.progress.mk.machinegun).toBe(5);
    if (!r5.ok) return;
    expect(raiseMk(r5.progress, 'machinegun')).toEqual({ ok: false, reason: 'already Mk V' });
  });

  it('every Mk has a tier colour and a Roman numeral, grey to orange', () => {
    expect([1, 2, 3, 4, 5].map((m) => roman(m as Mk))).toEqual(['I', 'II', 'III', 'IV', 'V']);
    expect([1, 2, 3, 4, 5].map((m) => MK_COLOUR[m as Mk].mid)).toEqual(['#92969e', '#549c4c', '#389cdc', '#8850b8', '#ee8018']);
    expect(partLabel({ family: 'cannon', mk: 4 })).toBe('Cannon Mk IV');
  });

  it('research lines cost 5, 10, 15 and stop at 3 steps', () => {
    let p = addIntel(newProgress(), { wheels: 100 });
    for (let i = 0; i < 3; i++) {
      const r = research(p, 'wheels', 'speed');
      expect(r.ok).toBe(true);
      if (r.ok) p = r.progress;
    }
    expect(p.intel.wheels).toBe(70);
    expect(researchCost(p, 'wheels', 'speed')).toBeNull();
    expect(research(p, 'wheels', 'speed').ok).toBe(false);
    expect(research(p, 'wheels', 'damage').ok).toBe(false);
  });

  it('fits only owned parts', () => {
    const p = newProgress();
    expect(canFit(p, { family: 'cannon', mk: 1 })).toBe(false);
    expect(canFit(p, { family: 'machinegun', mk: 2 })).toBe(false);
    expect(fit(p, { ...p.loadout, gun: { family: 'light', mk: 1 } }).ok).toBe(false);
    expect(fit(p, p.loadout).ok).toBe(true);
  });
});

describe('sim policy', () => {
  it('spends greedily and fits the best owned parts', () => {
    const p = fitBest(spendIntel(addIntel({ ...newProgress(), xp: RANKS[2]!.xp }, { cannon: 30, medium: 3, halftracks: 3 })));
    expect(p.unlocked).toEqual(expect.arrayContaining(['cannon', 'medium', 'halftracks']));
    expect(p.mk.cannon).toBe(2);
    expect(p.loadout.gun.family).toBe('cannon');
    expect(p.loadout.hull.family).toBe('medium');
  });

  it('the no-grind bar: Mk II gun, 2 research steps, counter unlocked', () => {
    expect(counterFamily('machinegun')).toBe('rockets');
    expect(counterFamily('rockets')).toBe('machinegun');
    expect(noGrindCheck(newProgress()).ok).toBe(false);
    const p = spendIntel(addIntel({ ...newProgress(), xp: RANKS[2]!.xp }, { machinegun: 23, rockets: 3 }));
    expect(noGrindCheck(p).ok).toBe(true);
  });
});
