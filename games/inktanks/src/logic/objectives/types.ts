import type { Tank, TankInput } from '../match/types';
import type { Pt } from '../vec';

/** What the objective asks of a bot: the player's stand-in, or a wave or hunter going for the truck. */
export interface Hint {
  readonly goal?: Pt;
  readonly goalRadius?: number;
  /** Shoot this tank first when it's in sight. */
  readonly target?: number | null;
  /** Fight without leaving the goal circle (a hold zone, the truck, a guard's post). */
  readonly stay?: boolean;
  readonly shootAt?: { readonly x: number; readonly y: number; readonly id: string } | null;
  /** No loot detours (the clock or the truck can't wait). */
  readonly urgent?: boolean;
  /** Don't start fights (recon). */
  readonly sneak?: boolean;
  /** Keep driving to the goal while shooting what's in sight (breakout, chase). */
  readonly run?: boolean;
}

/** A ring on the map and minimap: a hold zone, a flag, a recon spot, the exit, an artillery mark. */
export interface Mark {
  readonly kind: 'zone' | 'flag' | 'spot' | 'exit' | 'pickup' | 'artillery';
  readonly x: number;
  readonly y: number;
  readonly r: number;
  /** ours / theirs / done / neutral; for flags and spots. */
  readonly state?: 'ours' | 'theirs' | 'done' | 'neutral';
  /** 0–1: capture or dwell progress. */
  readonly progress?: number;
  /** An artillery mark's whole warning, s: progress 0 is the drop, 1 the landing. */
  readonly warn?: number;
}

export interface ObjectiveStatus {
  /** The HUD line: "Fuel stacks 1/3". */
  readonly text: string;
  /** Where the edge arrow points: the next target, or null. */
  readonly target: Pt | null;
  readonly done: boolean;
  /** A mission fail's reason ("truck destroyed"), or null. */
  readonly failed: string | null;
}

/**
 * One level's main objective, live in a match. Pure logic: `step` runs
 * after the tanks move each step; the rest only reads.
 */
export interface Objective {
  readonly kind: string;
  /** The briefing line: "Destroy the 3 fuel stacks". */
  readonly title: string;
  step(dt: number): void;
  status(): ObjectiveStatus;
  /** True once the mission's turn has come (salvage picked up, first cage broken): waves with when 'stage' arrive. */
  staged(): boolean;
  playerHint(t: Tank): Hint | null;
  /** Where waves and hunters head, and whom they want. */
  foeHint(t: Tank): Hint | null;
  /** Inputs for the tanks it drives itself (the escort truck, the boss body, freed crews), else null. */
  drive(t: Tank): TankInput | null;
  marks(): readonly Mark[];
  /** The escort truck's HP share at the end, for the truck bonus. */
  truckHpShare(): number | null;
}

/** The parts every objective leaves alone. */
export const BASE: Pick<Objective, 'staged' | 'foeHint' | 'drive' | 'marks' | 'truckHpShare'> = {
  staged: () => false,
  foeHint: () => null,
  drive: () => null,
  marks: () => [],
  truckHpShare: () => null,
};

export const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);

export function nearest<T extends Pt>(from: Pt, xs: readonly T[]): T | null {
  let best: T | null = null;
  let bd = Infinity;
  for (const x of xs) {
    const d = dist(from, x);
    if (d < bd) {
      bd = d;
      best = x;
    }
  }
  return best;
}
