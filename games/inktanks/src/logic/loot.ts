import { COUNTERS } from './damage';
import { DRIVE_FAMILIES, FAMILIES, GUN_FAMILIES, HULL_FAMILIES, slotOf, type DriveFamily, type Family, type GunFamily, type Loadout, type Mk, type Part } from './parts';
import type { Rng } from './rng';

/** What a chapter's loot and bots are made of. */
export interface LootTable {
  readonly families: readonly Family[];
  /** Weights of Mk I, II, III in crates. */
  readonly crateMk: readonly [number, number, number];
  /** Weights of Mk I, II, III on bots. */
  readonly botMk: readonly [number, number, number];
  /** Share of crates that hold a repair kit instead of a part. */
  readonly kitShare: number;
  /** Extra weights for bot parts on top of the clan's taste (early levels lean on starter parts). */
  readonly botTaste?: Readonly<Partial<Record<Family, number>>>;
}

export const CH1_LOOT: LootTable = {
  families: FAMILIES,
  crateMk: [0.65, 0.35, 0],
  botMk: [0.7, 0.3, 0],
  kitShare: 0.25,
};

export type CrateContent = { readonly kind: 'part'; readonly part: Part } | { readonly kind: 'kit' };

const MKS: readonly Mk[] = [1, 2, 3];

export function rollMk(rng: Rng, weights: readonly [number, number, number]): Mk {
  return rng.weighted(MKS, (m) => weights[m - 1]!);
}

export function rollCrate(rng: Rng, t: LootTable): CrateContent {
  if (rng.chance(t.kitShare)) return { kind: 'kit' };
  return { kind: 'part', part: { family: rng.pick(t.families), mk: rollMk(rng, t.crateMk) } };
}

/** A supply drop always holds a Mk III part. */
export function rollSupply(rng: Rng, t: LootTable): Part {
  return { family: rng.pick(t.families), mk: 3 };
}

/** The part a wreck leaves: its best (highest Mk; gun first on a tie). */
export function wreckPart(l: Loadout): Part {
  return [l.gun, l.hull, l.drive].reduce((best, p) => (p.mk > best.mk ? p : best), l.gun);
}

/** A clan's taste in parts, as weights per family. */
export type Taste = Readonly<Partial<Record<Family, number>>>;

export function rollLoadout(rng: Rng, t: LootTable, taste: Taste = {}): Loadout {
  const pick = <F extends Family>(fams: readonly F[]): Part => ({
    family: rng.weighted(fams.filter((f) => t.families.includes(f)), (f) => (taste[f] ?? 1) * (t.botTaste?.[f] ?? 1)),
    mk: rollMk(rng, t.botMk),
  });
  return { gun: pick(GUN_FAMILIES), hull: pick(HULL_FAMILIES), drive: pick(DRIVE_FAMILIES) };
}

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

/** When supply drops fall: spread through the middle of the match. */
export function supplyTimes(count: number, matchLength: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(Math.round(matchLength * (0.25 + (0.45 * (i + 1)) / (count + 1))));
  return out;
}

export const SUPPLY_WARNING = 10;
