import type { Family, Loadout, Mk } from './parts';
import type { IntelBag } from './workshop';

/**
 * Intel a destroyed tank leaves for each part it carries. The design doc
 * started at 1 / 2 / 4; the whole-chapter sim passed the no-grind bar on
 * only half its seeds with that, so Mk I and II pay a little more.
 */
export const INTEL_PER_MK: Readonly<Record<Mk, number>> = { 1: 2, 2: 3, 3: 5, 4: 7, 5: 9 };
/** Aces drop much more. */
export const ACE_INTEL_MULT = 4;

export function intelOf(l: Loadout, ace = false): IntelBag {
  const bag: Partial<Record<Family, number>> = {};
  for (const p of [l.gun, l.hull, l.drive]) {
    const n = INTEL_PER_MK[p.mk] * (ace ? ACE_INTEL_MULT : 1);
    bag[p.family] = (bag[p.family] ?? 0) + n;
  }
  return bag;
}

export function sumIntel(bag: IntelBag): number {
  return Object.values(bag).reduce((s: number, n) => s + (n ?? 0), 0);
}

export function mergeIntel(a: IntelBag, b: IntelBag): IntelBag {
  const out: Partial<Record<Family, number>> = { ...a };
  for (const [f, n] of Object.entries(b) as [Family, number][]) out[f] = (out[f] ?? 0) + n;
  return out;
}
