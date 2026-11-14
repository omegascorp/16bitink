import { COUNTERS } from './damage';
import { slotOf, type DriveFamily, type Family, type GunFamily, type Loadout, type Mk, type Part } from './parts';
import type { Rng } from './rng';

/** What a level's rolled crates hold. */
export interface LootTable {
  readonly families: readonly Family[];
  /** Weights of Mk I, II, III in crates. */
  readonly crateMk: readonly [number, number, number];
  /** Share of crates that hold a repair kit instead of a part. */
  readonly kitShare: number;
  /** Share that hold a gadget charge (default GADGET_SHARE). */
  readonly gadgetShare?: number;
}

/** Rolled crates hold a gadget charge this often, unless the table says otherwise (Tactics §3). */
export const GADGET_SHARE = 0.12;

export type CrateContent = { readonly kind: 'part'; readonly part: Part } | { readonly kind: 'kit' } | { readonly kind: 'gadget' };

const MKS: readonly Mk[] = [1, 2, 3];

export function rollMk(rng: Rng, weights: readonly [number, number, number]): Mk {
  return rng.weighted(MKS, (m) => weights[m - 1]!);
}

export function rollCrate(rng: Rng, t: LootTable): CrateContent {
  if (rng.chance(t.kitShare)) return { kind: 'kit' };
  if (rng.chance(t.gadgetShare ?? GADGET_SHARE)) return { kind: 'gadget' };
  return { kind: 'part', part: { family: rng.pick(t.families), mk: rollMk(rng, t.crateMk) } };
}

/** The part a wreck leaves: its best (highest Mk; gun first on a tie). */
export function wreckPart(l: Loadout): Part {
  return [l.gun, l.hull, l.drive].reduce((best, p) => (p.mk > best.mk ? p : best), l.gun);
}

/** A clan's taste in parts, as weights per family. */
export type Taste = Readonly<Partial<Record<Family, number>>>;

/**
 * A bot's sense of a part's worth: Mk first, then how well a gun counters the
 * drive that last hit it. Swap when the new part beats the fitted one.
 */
/** A plain sense of what each family is worth before taste and counters. */
export const FAMILY_VALUE: Readonly<Record<Family, number>> = {
  machinegun: 1, cannon: 1.5, rockets: 1.4, light: 1, medium: 1.5, heavy: 1.7, wheels: 1, halftracks: 1.3, tracks: 1.4,
};

export function partScore(p: Part, lastHitDrive: DriveFamily | null, taste: Taste = {}): number {
  let s = p.mk * 8 * FAMILY_VALUE[p.family] + (taste[p.family] ?? 1) * 2;
  if (slotOf(p.family) === 'gun' && lastHitDrive) s += COUNTERS[p.family as GunFamily][lastHitDrive] * 4;
  if (p.proto) s += 5;
  return s;
}

export function wantsSwap(l: Loadout, p: Part, lastHitDrive: DriveFamily | null, taste: Taste = {}): boolean {
  const cur = l[slotOf(p.family)];
  return partScore(p, lastHitDrive, taste) > partScore(cur, lastHitDrive, taste) + 1.5;
}

