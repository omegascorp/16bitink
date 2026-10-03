import { createRng, rangeOf } from '../logic/rng';
import { hashUnit } from '../logic/water';
import type { ZoneId } from './types';

/**
 * Places to hide: dense seagrass beds, kelp thickets and coral heads, where
 * young fish really shelter. Inside one, predators lose track of you, but you
 * swim slower, can't eat, and only stay hidden a few seconds at a time.
 * Hooks and jellyfish don't care. Open water (twilight and deeper) has none.
 */
export type CoverKind = 'grass' | 'kelp' | 'weed' | 'coral';

export const ZONE_COVER: Readonly<Record<ZoneId, { readonly kinds: readonly CoverKind[]; readonly count: readonly [number, number] }>> = {
  tidepool: { kinds: ['weed', 'grass'], count: [2, 3] },
  seagrass: { kinds: ['grass'], count: [3, 4] },
  kelp: { kinds: ['kelp'], count: [3, 4] },
  reef: { kinds: ['coral'], count: [2, 4] },
  wreck: { kinds: ['kelp', 'weed'], count: [2, 3] },
  dropoff: { kinds: ['coral'], count: [1, 2] },
  twilight: { kinds: [], count: [0, 0] },
  midnight: { kinds: [], count: [0, 0] },
  abyss: { kinds: [], count: [0, 0] },
  trench: { kinds: [], count: [0, 0] },
};

/** Level number (1-based across the game) where hiding places first appear. */
export const COVER_DEBUT = 3;

export interface CoverPatch {
  readonly kind: CoverKind;
  /** Centre x and half width of the patch, world px. */
  readonly x: number;
  readonly half: number;
  /** How tall the patch stands above the sand, world px. */
  readonly height: number;
}

/** Deterministic per level; none before COVER_DEBUT or where nothing grows. */
export function planCover(levelId: string, levelNumber: number, zone: ZoneId, width: number): CoverPatch[] {
  const { kinds, count } = ZONE_COVER[zone];
  if (kinds.length === 0 || levelNumber < COVER_DEBUT) return [];
  const rng = createRng(Math.floor(hashUnit(levelId, 21) * 1e6) + 1);
  const n = count[0] + Math.floor(rng() * (count[1] - count[0] + 1));
  // Spread out: one patch per slice of the level, jittered inside it.
  const slice = width / n;
  return Array.from({ length: n }, (_, i): CoverPatch => {
    const half = rangeOf(rng, 80, 150);
    const x = Math.min(width - half - 40, Math.max(half + 40, slice * (i + 0.5) + rangeOf(rng, -slice * 0.25, slice * 0.25)));
    return { kind: kinds[Math.floor(rng() * kinds.length)]!, x, half, height: rangeOf(rng, 170, 250) };
  });
}

/** Is a swimmer of radius r at (x, y) inside the patch (the sand at its x is floorY)? */
export function insidePatch(p: CoverPatch, x: number, y: number, r: number, floorY: number): boolean {
  return Math.abs(x - p.x) < p.half - r * 0.3 && y > floorY - p.height + r * 0.5;
}

/** Hiding state: how long you've been hidden this visit, and when cover works again. */
export interface HideState {
  readonly hidden: boolean;
  /** Ms spent hidden in the current visit. */
  readonly usedMs: number;
  /** Cover doesn't hide you again until this time (and until you've left it). */
  readonly blockedUntil: number;
  /** Spotted while still inside: must leave cover before it works again. */
  readonly mustLeave: boolean;
}

export const HIDE_START: HideState = { hidden: false, usedMs: 0, blockedUntil: 0, mustLeave: false };

export interface HideRules {
  /** Longest you stay hidden per visit. */
  readonly maxMs: number;
  /** Wait after being spotted before cover hides you again. */
  readonly cooldownMs: number;
}

/** One frame of hiding. Returns the new state and whether you were just spotted. */
export function stepHide(s: HideState, inside: boolean, now: number, dtMs: number, rules: HideRules): { state: HideState; spotted: boolean } {
  if (!inside) return { state: { ...s, hidden: false, usedMs: 0, mustLeave: false }, spotted: false };
  if (s.mustLeave || now < s.blockedUntil) return { state: { ...s, hidden: false }, spotted: false };
  const usedMs = s.usedMs + dtMs;
  if (usedMs >= rules.maxMs) {
    return { state: { hidden: false, usedMs: 0, blockedUntil: now + rules.cooldownMs, mustLeave: true }, spotted: true };
  }
  return { state: { ...s, hidden: true, usedMs }, spotted: false };
}
