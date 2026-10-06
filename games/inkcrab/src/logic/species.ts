/**
 * The creatures roaming a beach besides the player. All share one rule
 * (bigger catches you, smaller is food) and differ in how they move and
 * whether they hunt.
 */
export type SpeciesId = 'ghostcrab' | 'slater' | 'beetle';

export interface SpeciesSpec {
  readonly id: SpeciesId;
  readonly name: string;
  /** Speed as a share of the ghost crab's at the same size. */
  readonly speed: number;
  /** How far (tiles) it notices the player. */
  readonly sight: number;
  /** Whether it goes after a smaller player; timid ones only ever run. */
  readonly hunts: boolean;
  /** Runs in bursts: seconds running, then seconds standing still. */
  readonly burst?: { readonly run: number; readonly rest: number };
  /** Body box as a share of the shell size scale (see critterBox). */
  readonly box: { readonly w: number; readonly h: number };
}

export const SPECIES: Readonly<Record<SpeciesId, SpeciesSpec>> = {
  ghostcrab: { id: 'ghostcrab', name: 'ghost crab', speed: 1, sight: 6, hunts: true, box: { w: 0.8, h: 0.55 } },
  // A sea slater: a woodlouse of the strandline. Slow and harmless-minded; it never chases.
  slater: { id: 'slater', name: 'sea slater', speed: 0.6, sight: 4, hunts: false, box: { w: 0.85, h: 0.4 } },
  // A tiger beetle: a real beach predator, sprinting in short dashes with keen eyes.
  beetle: { id: 'beetle', name: 'tiger beetle', speed: 1.5, sight: 8, hunts: true, burst: { run: 0.7, rest: 0.5 }, box: { w: 0.75, h: 0.45 } },
};
