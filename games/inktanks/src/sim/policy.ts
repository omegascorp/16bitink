import { COUNTERS, counterGun } from '../logic/damage';
import { FAMILY_VALUE } from '../logic/loot';
import { DRIVE_FAMILIES, FAMILIES, GUN_FAMILIES, HULL_FAMILIES, TIER_BONUS, slotOf, type DriveFamily, type Family, type GunFamily, type Loadout } from '../logic/parts';
import { RESEARCH_STEP, researchSteps } from '../logic/stats';
import { LINES_BY_SLOT, fit, ownedPart, raiseMk, research, unlock, type Progress } from '../logic/workshop';

/**
 * How the sim's stand-in player uses the workshop between missions: unlock
 * what it can, raise Mk when the rank allows, then research the cheapest
 * line. Intel is per family, so the order only matters within a family.
 */
export function spendIntel(p: Progress): Progress {
  let cur = p;
  for (let guard = 0; guard < 100; guard++) {
    const next = spendOnce(cur);
    if (!next) return cur;
    cur = next;
  }
  return cur;
}

function spendOnce(p: Progress): Progress | null {
  for (const f of FAMILIES) {
    const r = unlock(p, f);
    if (r.ok) return r.progress;
  }
  for (const f of FAMILIES) {
    const r = raiseMk(p, f);
    if (r.ok) return r.progress;
  }
  for (const f of FAMILIES) {
    const lines = [...LINES_BY_SLOT[slotOf(f)]].sort((a, b) => researchSteps(p.research, f, a) - researchSteps(p.research, f, b));
    for (const line of lines) {
      const r = research(p, f, line);
      if (r.ok) return r.progress;
    }
  }
  return null;
}

function worth(p: Progress, f: Family): number {
  const part = ownedPart(p, f);
  if (!part) return -1;
  const lines = LINES_BY_SLOT[slotOf(f)];
  const steps = lines.reduce((s, l) => s + researchSteps(p.research, f, l), 0);
  return FAMILY_VALUE[f] * TIER_BONUS[part.mk] * (1 + RESEARCH_STEP * steps);
}

const best = <F extends Family>(p: Progress, fams: readonly F[]): F => fams.reduce((a, b) => (worth(p, b) > worth(p, a) ? b : a));

/** Fits the best owned part per slot. */
export function fitBest(p: Progress): Progress {
  const pick = (f: Family) => ownedPart(p, f)!;
  const loadout: Loadout = { gun: pick(best(p, GUN_FAMILIES)), hull: pick(best(p, HULL_FAMILIES)), drive: pick(best(p, DRIVE_FAMILIES)) };
  const r = fit(p, loadout);
  return r.ok ? r.progress : p;
}

/** The drive a gun is weakest against, and the gun that counters it. */
export function counterFamily(g: GunFamily): GunFamily {
  const weak = (Object.keys(COUNTERS[g]) as DriveFamily[]).reduce((a, b) => (COUNTERS[g][b] < COUNTERS[g][a] ? b : a));
  return counterGun(weak);
}

export interface NoGrindVerdict {
  readonly ok: boolean;
  readonly gun: GunFamily | null;
  readonly detail: string;
}

/** The design's no-grind bar: a Mk II gun with 2 research steps, and its counter family unlocked. */
export function noGrindCheck(p: Progress): NoGrindVerdict {
  const lines = (g: GunFamily) => LINES_BY_SLOT.gun.reduce((s, l) => s + researchSteps(p.research, g, l), 0);
  const fits = GUN_FAMILIES.filter((g) => (p.mk[g] ?? 0) >= 2 && lines(g) >= 2 && p.unlocked.includes(counterFamily(g)));
  if (fits.length > 0) return { ok: true, gun: fits[0]!, detail: `${fits[0]} Mk ${p.mk[fits[0]!]}, ${lines(fits[0]!)} research steps, counter ${counterFamily(fits[0]!)} unlocked` };
  const why = GUN_FAMILIES.map((g) => `${g}: Mk ${p.mk[g] ?? '-'} research ${lines(g)} counter ${counterFamily(g)} ${p.unlocked.includes(counterFamily(g)) ? 'ok' : 'locked'}`).join('; ');
  return { ok: false, gun: null, detail: why };
}
